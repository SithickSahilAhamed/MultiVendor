using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;
[ApiController, Route("api/products")]
public sealed class ProductsController(FirestoreCatalogStore store) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List([FromQuery] int limit = 100) => Ok(await store.ListAsync("products", limit));
    [HttpGet("{id}")] public async Task<IActionResult> Get(string id) => await store.GetAsync("products", id) is { } product ? Ok(product) : NotFound();
    [Authorize(Policy = "Vendor"), HttpPost]
    public async Task<IActionResult> Create([FromBody] Dictionary<string, object> product)
    {
        product["status"] = "pending";
        product["vendorId"] = User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value ?? "";
        var id = await store.AddAsync("products", product);
        return CreatedAtAction(nameof(Get), new { id }, new { id });
    }
}
