using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;
namespace Sunfara.Api.Controllers;
[ApiController, Route("api")]
public sealed class CatalogController(FirestoreCatalogStore store) : ControllerBase
{
 /* Health lives solely on Program.cs MapGet("/api/health") (PAY-002 webhook readiness).
    A second [HttpGet("health")] here caused AmbiguousMatchException in CI. */
 [HttpGet("categories")] public async Task<IActionResult> Categories()=>Ok(await store.ListAsync("categories"));
 // GET /api/vendors moved to VendorsController - this one returned every
 // vendor regardless of status (pending/rejected included), and having
 // two controllers claim the same route caused every request to 500 with
 // AmbiguousMatchException.
}
