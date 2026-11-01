using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Domain;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;
[Authorize(Policy = "Admin"), ApiController, Route("api/admin")]
public sealed class AdminController(FirestoreCatalogStore store, MarketplaceService marketplace) : ControllerBase
{
    private static readonly HashSet<string> Collections = ["vendors","products","orders","vendor_orders","customers","commissions","withdrawals","reviews","categories","coupons","inventorySources","shipments","shipping_zones","invoices","refunds","returns","settings","auditLogs","transactions","notifications"];
    [HttpGet("{collection}")] public async Task<IActionResult> List(string collection, [FromQuery] int limit=100) => Allowed(collection) ? Ok(await store.ListAsync(collection,limit)) : NotFound();
    [HttpGet("{collection}/{id}")] public async Task<IActionResult> Get(string collection,string id) => !Allowed(collection) ? NotFound() : await store.GetAsync(collection,id) is { } item ? Ok(item) : NotFound();

    /* AUTH-003: refuse auto-id vendor orphans. All other collections keep generic Add. */
    [HttpPost("{collection}")]
    public async Task<IActionResult> Add(string collection, [FromBody] Dictionary<string, object> item)
    {
        if (!Allowed(collection)) return NotFound();
        if (VendorProvisioning.IsAutoIdCreateForbidden(collection))
            return BadRequest(new { error = VendorProvisioning.AutoIdRejectedMessage });
        var id = await store.AddAsync(collection, item);
        return Ok(new { id });
    }

    /* AUTH-003: create Firebase Auth user + role=vendor claim + vendors/{uid} only. */
    [HttpPost("vendors/create-account")]
    public async Task<IActionResult> CreateVendorAccount([FromBody] AdminCreateVendorRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "Name, email, phone, and temporary password are required." });
        if (request.Password.Length < 8)
            return BadRequest(new { error = "Password must be at least 8 characters." });

        Dictionary<string, object> vendorDoc;
        try
        {
            vendorDoc = VendorProvisioning.BuildVendorDocument(
                request.Name, request.Email, request.Phone,
                request.Commission ?? 10.0,
                string.IsNullOrWhiteSpace(request.Status) ? "pending" : request.Status!);
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message });
        }

        UserRecord user;
        try
        {
            user = await FirebaseAuth.DefaultInstance.CreateUserAsync(new UserRecordArgs
            {
                Email = request.Email.Trim(),
                Password = request.Password,
                DisplayName = request.Name.Trim(),
                EmailVerified = false
            });
        }
        catch (FirebaseAuthException e)
        {
            var message = e.AuthErrorCode == AuthErrorCode.EmailAlreadyExists
                ? "An account with this email already exists."
                : e.Message;
            return BadRequest(new { error = message });
        }

        await FirebaseAuth.DefaultInstance.SetCustomUserClaimsAsync(user.Uid, new Dictionary<string, object> { ["role"] = "vendor" });

        vendorDoc["createdAt"] = FieldValue.ServerTimestamp;
        vendorDoc["updatedAt"] = FieldValue.ServerTimestamp;
        await store.Database.Collection("vendors").Document(user.Uid).CreateAsync(vendorDoc);

        return Ok(new { uid = user.Uid, id = user.Uid, message = "Vendor Auth user and vendors/{uid} created." });
    }

    /* Suspending/rejecting a vendor previously only flipped a Firestore field -
       the vendor's existing ID token (and any refresh token minted before this
       moment) still passed every [Authorize(Policy="Vendor")] check, since that
       policy only reads the JWT's role claim, never this doc. Revoking refresh
       tokens forces re-authentication on next refresh (~1hr token lifetime is
       the remaining exposure window, bounded by design of JWT auth); the
       IsVendorActiveAsync gates on RequestWithdrawalAsync/ProductsController.Create
       close the rest of that window server-side. */
    [HttpPut("{collection}/{id}")]
    public async Task<IActionResult> Update(string collection, string id, [FromBody] Dictionary<string, object> item)
    {
        if (!Allowed(collection)) return NotFound();
        if (collection == "vendors" && item.TryGetValue("status", out var statusValue) && statusValue?.ToString() != "active")
        {
            try { await FirebaseAuth.DefaultInstance.RevokeRefreshTokensAsync(id); } catch (FirebaseAuthException) { /* vendor auth account may not exist */ }
        }
        return await store.UpdateAsync(collection, id, item) ? NoContent() : NotFound();
    }

    [HttpDelete("{collection}/{id}")] public async Task<IActionResult> Delete(string collection,string id) => Allowed(collection) && await store.DeleteAsync(collection,id) ? NoContent() : NotFound();
    [HttpPost("reviews/{id}/{action}")] public async Task<IActionResult> Moderate(string id,string action) { if(action is not ("approve" or "reject")) return BadRequest(); return await store.UpdateAsync("reviews",id,new(){["status"]=action=="approve"?"approved":"rejected"}) ? Ok() : NotFound(); }
    [HttpPost("withdrawals/{id}/approve")] public async Task<IActionResult> ApproveWithdrawal(string id) => await marketplace.ApproveWithdrawalAsync(id) ? Ok() : NotFound();

    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue() => Ok(await store.GetAsync("settings", "platformRevenue") ?? new Dictionary<string, object> { ["totalGrossSales"] = 0.0, ["totalCommissionEarned"] = 0.0, ["totalVendorPayouts"] = 0.0 });

    /* PAY-004: list payment mismatches (unpaid online + Razorpay capture vs Firestore).
       Optional body of captures lets ops/tests reconcile without live Razorpay keys. */
    [HttpGet("payments/reconciliation")]
    public async Task<IActionResult> PaymentReconciliationReport([FromQuery] DateTimeOffset? from = null, [FromQuery] DateTimeOffset? to = null)
    {
        var windowEnd = to ?? DateTimeOffset.UtcNow;
        var windowStart = from ?? windowEnd.AddDays(-30);
        if (windowStart > windowEnd) return BadRequest(new { error = "from must be before to." });
        var (orders, mismatches) = await marketplace.ReconcilePaymentsAsync(windowStart, windowEnd);
        return Ok(new
        {
            from = windowStart,
            to = windowEnd,
            orderCount = orders.Count,
            mismatchCount = mismatches.Count,
            mismatches,
            unpaidOnline = mismatches.Where(m => m.Kind == PaymentReconciliation.KindUnpaidOnline).ToList()
        });
    }

    [HttpPost("payments/reconciliation")]
    public async Task<IActionResult> PaymentReconciliationWithCaptures(
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromBody] List<RazorpayCapturedPaymentDto>? captures = null)
    {
        var windowEnd = to ?? DateTimeOffset.UtcNow;
        var windowStart = from ?? windowEnd.AddDays(-30);
        if (windowStart > windowEnd) return BadRequest(new { error = "from must be before to." });
        var mapped = (captures ?? []).Select(c => new RazorpayCapturedPayment(
            c.RazorpayPaymentId, c.RazorpayOrderId, c.AmountPaise, c.CapturedAt)).ToList();
        var (orders, mismatches) = await marketplace.ReconcilePaymentsAsync(windowStart, windowEnd, mapped);
        return Ok(new
        {
            from = windowStart,
            to = windowEnd,
            orderCount = orders.Count,
            mismatchCount = mismatches.Count,
            mismatches,
            unpaidOnline = mismatches.Where(m => m.Kind == PaymentReconciliation.KindUnpaidOnline).ToList()
        });
    }

    [HttpPost("orders/{id}/cancel-unpaid")]
    public async Task<IActionResult> CancelUnpaidOnline(string id)
    {
        try { await marketplace.CancelUnpaidOnlineOrderAsync(id); return Ok(new { success = true }); }
        catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); }
    }

    /* Targets a vendor's sub-order specifically (id here is a vendor_orders
       document id, not a master order id) - status/tracking live per vendor
       sub-order now, not on the shared master order. Admin override bypasses
       the OrderStateMachine transition check vendors are held to. */
    [HttpPut("vendor-orders/{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string id, [FromBody] OrderStatusRequest request)
    {
        try { await marketplace.UpdateOrderStatusAsync(id, vendorId: "", request.Status, isAdmin: true, request.TrackingNumber, request.Carrier); return Ok(); }
        catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpPut("returns/{id}/review")]
    public async Task<IActionResult> ReviewReturn(string id, [FromBody] ReturnReviewRequest request)
    {
        try { await marketplace.ReviewReturnAsync(id, vendorId: "", request.Approve, isAdmin: true); return Ok(); }
        catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); }
    }

    private static bool Allowed(string collection)=>Collections.Contains(collection);
}
public sealed record OrderStatusRequest(string Status, string? TrackingNumber = null, string? Carrier = null);
public sealed record AdminCreateVendorRequest(string Name, string Email, string Phone, string Password, double? Commission = null, string? Status = null);
public sealed record RazorpayCapturedPaymentDto(string RazorpayPaymentId, string RazorpayOrderId, long AmountPaise, DateTimeOffset CapturedAt);
