using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;
[ApiController, Route("api/products")]
public sealed class ProductsController(FirestoreCatalogStore store) : ControllerBase
{
    private string UserId => User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value ?? "";
    private bool IsAdmin => User.HasClaim("role", "admin");

    /* Public/unauthenticated - matches firestore.rules' own intent
       (products only readable there once status=="active"), which the API
       had silently drifted from: it was returning every product regardless
       of moderation status, so a vendor's listing went live on the storefront
       the instant it was created, before any admin ever looked at it. */
    [HttpGet] public async Task<IActionResult> List([FromQuery] int limit = 500) => Ok(await store.WhereAsync("products", "status", "active", limit));
    [HttpGet("{id}")] public async Task<IActionResult> Get(string id) => await store.GetAsync("products", id) is { } product && product.GetValueOrDefault("status")?.ToString() == "active" ? Ok(product) : NotFound();

    [Authorize(Policy = "Vendor"), HttpGet("mine")]
    public async Task<IActionResult> Mine() => Ok(await store.WhereAsync("products", "vendorId", UserId, 500));

    [Authorize(Policy = "Vendor"), HttpPost]
    public async Task<IActionResult> Create([FromBody] Dictionary<string, object> product)
    {
        var vendor = await store.GetAsync("vendors", UserId);
        var vendorStatus = vendor?.GetValueOrDefault("status")?.ToString();
        if (vendorStatus is "rejected" or "suspended") return Forbid();
        if (product.TryGetValue("price", out var priceVal) && Convert.ToDouble(FirestoreCatalogStore.NormalizeValue(priceVal)) <= 0) return BadRequest(new { error = "Price must be greater than zero." });
        product["status"] = "pending";
        product["vendorId"] = UserId;
        var id = await store.AddAsync("products", product);
        return CreatedAtAction(nameof(Get), new { id }, new { id });
    }

    [Authorize(Policy = "Vendor"), HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Dictionary<string, object> updates)
    {
        var existing = await store.GetAsync("products", id);
        if (existing is null) return NotFound();
        if (!IsAdmin && existing.GetValueOrDefault("vendorId")?.ToString() != UserId) return Forbid();
        if (updates.TryGetValue("price", out var priceVal) && Convert.ToDouble(priceVal) <= 0) return BadRequest(new { error = "Price must be greater than zero." });
        updates.Remove("vendorId"); updates.Remove("status");
        return await store.UpdateAsync("products", id, updates) ? NoContent() : NotFound();
    }

    [Authorize(Policy = "Vendor"), HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var existing = await store.GetAsync("products", id);
        if (existing is null) return NotFound();
        if (!IsAdmin && existing.GetValueOrDefault("vendorId")?.ToString() != UserId) return Forbid();
        return await store.DeleteAsync("products", id) ? NoContent() : NotFound();
    }
}
