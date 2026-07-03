using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;
[Authorize(Policy = "Admin"), ApiController, Route("api/admin")]
public sealed class AdminController(FirestoreCatalogStore store, MarketplaceService marketplace) : ControllerBase
{
    private static readonly HashSet<string> Collections = ["vendors","products","orders","vendor_orders","customers","commissions","withdrawals","reviews","categories","coupons","inventorySources","shipments","invoices","refunds","returns","settings","auditLogs","transactions","notifications"];
    [HttpGet("{collection}")] public async Task<IActionResult> List(string collection, [FromQuery] int limit=100) => Allowed(collection) ? Ok(await store.ListAsync(collection,limit)) : NotFound();
    [HttpGet("{collection}/{id}")] public async Task<IActionResult> Get(string collection,string id) => !Allowed(collection) ? NotFound() : await store.GetAsync(collection,id) is { } item ? Ok(item) : NotFound();
    [HttpPost("{collection}")] public async Task<IActionResult> Add(string collection,[FromBody] Dictionary<string,object> item) { if(!Allowed(collection)) return NotFound(); var id=await store.AddAsync(collection,item); return Ok(new{id}); }

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
