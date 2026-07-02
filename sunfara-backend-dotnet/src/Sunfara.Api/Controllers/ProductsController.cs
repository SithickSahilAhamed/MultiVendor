using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;
[ApiController, Route("api/products")]
public sealed class ProductsController(FirestoreCatalogStore store) : ControllerBase
{
    private string UserId => User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value ?? "";
    private bool IsAdmin => User.HasClaim("role", "admin");

    [HttpGet] public async Task<IActionResult> List([FromQuery] int limit = 500) => Ok(await store.ListAsync("products", limit));
    [HttpGet("{id}")] public async Task<IActionResult> Get(string id) => await store.GetAsync("products", id) is { } product ? Ok(product) : NotFound();

    [Authorize(Policy = "Vendor"), HttpGet("mine")]
    public async Task<IActionResult> Mine() => Ok(await store.WhereAsync("products", "vendorId", UserId, 500));

    [Authorize(Policy = "Vendor"), HttpPost]
    public async Task<IActionResult> Create([FromBody] Dictionary<string, object> product)
    {
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
