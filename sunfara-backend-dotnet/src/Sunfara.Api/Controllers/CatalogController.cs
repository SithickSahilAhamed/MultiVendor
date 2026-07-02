using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;
namespace Sunfara.Api.Controllers;
[ApiController, Route("api")]
public sealed class CatalogController(FirestoreCatalogStore store) : ControllerBase
{
 [HttpGet("health")] public IActionResult Health()=>Ok(new{status="OK",service="Sunfara C# Firebase Commerce API",utc=DateTime.UtcNow});
 [HttpGet("categories")] public async Task<IActionResult> Categories()=>Ok(await store.ListAsync("categories"));
 // GET /api/vendors moved to VendorsController - this one returned every
 // vendor regardless of status (pending/rejected included), and having
 // two controllers claim the same route caused every request to 500 with
 // AmbiguousMatchException.
}
