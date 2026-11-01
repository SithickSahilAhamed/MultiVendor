using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;

/// <summary>
/// WEB-003 — delivery-partner portal API (scaffolded on SHIP-001/002).
/// Partners see assigned vendor_orders and can advance shipped→delivered.
/// </summary>
[Authorize(Policy = "Delivery"), ApiController, Route("api/delivery")]
public sealed class DeliveryController(FirestoreCatalogStore store, MarketplaceService marketplace) : ControllerBase
{
    private string UserId => User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value ?? throw new UnauthorizedAccessException();

    [HttpGet("assignments")]
    public async Task<IActionResult> Assignments()
    {
        var assigned = await store.WhereAsync("vendor_orders", "deliveryPartnerId", UserId, 200);
        return Ok(assigned);
    }

    [HttpPost("assignments/{vendorOrderId}/claim")]
    public async Task<IActionResult> Claim(string vendorOrderId)
    {
        var vo = await store.GetAsync("vendor_orders", vendorOrderId);
        if (vo is null) return NotFound();
        var status = vo.GetValueOrDefault("status")?.ToString() ?? "";
        if (status is not ("packed" or "confirmed" or "shipped"))
            return BadRequest(new { error = "Order is not ready for delivery assignment." });
        if (vo.TryGetValue("deliveryPartnerId", out var existing) && !string.IsNullOrWhiteSpace(existing?.ToString())
            && !string.Equals(existing.ToString(), UserId, StringComparison.Ordinal))
            return Conflict(new { error = "Already assigned to another partner." });

        await store.UpdateAsync("vendor_orders", vendorOrderId, new Dictionary<string, object>
        {
            ["deliveryPartnerId"] = UserId,
            ["deliveryAssignedAt"] = DateTime.UtcNow.ToString("o")
        });
        return Ok(new { success = true });
    }

    [HttpPut("assignments/{vendorOrderId}/status")]
    public async Task<IActionResult> UpdateStatus(string vendorOrderId, [FromBody] DeliveryStatusRequest request)
    {
        var vo = await store.GetAsync("vendor_orders", vendorOrderId);
        if (vo is null) return NotFound();
        if (!string.Equals(vo.GetValueOrDefault("deliveryPartnerId")?.ToString(), UserId, StringComparison.Ordinal))
            return Forbid();
        try
        {
            // Delivery partners act as system agents for shipped/delivered only.
            await marketplace.UpdateOrderStatusAsync(vendorOrderId, vendorId: "", request.Status, isAdmin: true, request.TrackingNumber, request.Carrier);
            return Ok();
        }
        catch (InvalidOperationException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }
}

public sealed record DeliveryStatusRequest(string Status, string? TrackingNumber = null, string? Carrier = null);
