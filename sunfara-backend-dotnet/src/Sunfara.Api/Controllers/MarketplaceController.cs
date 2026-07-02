using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;
[ApiController, Route("api")]
public sealed class MarketplaceController(FirestoreCatalogStore store, MarketplaceService marketplace) : ControllerBase
{
    private string UserId => User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value ?? throw new UnauthorizedAccessException();

    [Authorize, HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] Dictionary<string, object> request)
    { try { var id = await marketplace.CheckoutAsync(UserId, request); return Ok(new { id, message = "Order placed" }); } catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); } }

    [Authorize, HttpGet("orders")]
    public async Task<IActionResult> Orders() => Ok(await store.WhereAsync("orders", "customerId", UserId));

    [Authorize(Policy = "Vendor"), HttpGet("vendor/orders")]
    public async Task<IActionResult> VendorOrders() => Ok(await store.WhereArrayContainsAsync("orders", "vendorIds", UserId));

    [Authorize(Policy = "Vendor"), HttpPut("vendor/orders/{id}/status")]
    public async Task<IActionResult> UpdateVendorOrderStatus(string id, [FromBody] OrderStatusRequest request)
    {
        try { await marketplace.UpdateOrderStatusAsync(id, UserId, request.Status, isAdmin: false); return Ok(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); }
    }

    [Authorize(Policy = "Vendor"), HttpGet("vendor/wallet")]
    public async Task<IActionResult> VendorWallet() => Ok(await store.GetAsync("vendor_wallets", UserId) ?? new Dictionary<string, object> { ["balance"] = 0.0, ["totalEarned"] = 0.0, ["totalWithdrawn"] = 0.0 });

    [Authorize(Policy = "Vendor"), HttpGet("vendor/me")]
    public async Task<IActionResult> VendorMe() => await store.GetAsync("vendors", UserId) is { } vendor ? Ok(vendor) : NotFound(new { error = "No vendor profile found for this account." });

    [Authorize(Policy = "Vendor"), HttpGet("vendor/withdrawals")]
    public async Task<IActionResult> VendorWithdrawals() => Ok(await store.WhereAsync("withdrawals", "vendorId", UserId));

    [Authorize, HttpPost("reviews")]
    public async Task<IActionResult> Review([FromBody] Dictionary<string, object> review)
    { review["customerId"] = UserId; review["status"] = "pending"; var id = await store.AddAsync("reviews", review); return Ok(new { id, message = "Review submitted for moderation" }); }

    [HttpGet("products/{productId}/reviews")]
    public async Task<IActionResult> Reviews(string productId) => Ok((await store.WhereAsync("reviews", "productId", productId)).Where(x => x.GetValueOrDefault("status")?.ToString() == "approved"));

    [Authorize(Policy = "Vendor"), HttpGet("vendor/commissions")]
    public async Task<IActionResult> Commissions() => Ok(await store.WhereAsync("commissions", "vendorId", UserId));

    [Authorize(Policy = "Vendor"), HttpPost("vendor/withdrawal")]
    public async Task<IActionResult> Withdraw([FromBody] AmountRequest request)
    { try { var id = await marketplace.RequestWithdrawalAsync(UserId, request.Amount); return Ok(new { id }); } catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); } }
}
public sealed record AmountRequest(decimal Amount);
