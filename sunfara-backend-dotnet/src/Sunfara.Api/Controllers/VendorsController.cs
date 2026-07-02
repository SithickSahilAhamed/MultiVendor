using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;

/* Public read-only endpoints for customer-facing vendor storefronts -
   these never existed before, so /vendor/:id (and the vendor listing
   page) had nothing real to fetch from and silently fell back to the
   static demo catalog's fake vendor shape. Only ever exposes active
   vendors/products - pending/rejected ones aren't public yet, matching
   the same policy already enforced in firestore.rules for direct reads. */
[ApiController, Route("api/vendors")]
public sealed class VendorsController(FirestoreCatalogStore store) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() =>
        Ok((await store.ListAsync("vendors", 200)).Where(v => v.GetValueOrDefault("status")?.ToString() == "active"));

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var vendor = await store.GetAsync("vendors", id);
        if (vendor is null || vendor.GetValueOrDefault("status")?.ToString() != "active") return NotFound();
        return Ok(vendor);
    }

    [HttpGet("{id}/products")]
    public async Task<IActionResult> Products(string id) =>
        Ok((await store.WhereAsync("products", "vendorId", id, 200)).Where(p => p.GetValueOrDefault("status")?.ToString() == "active"));
}
