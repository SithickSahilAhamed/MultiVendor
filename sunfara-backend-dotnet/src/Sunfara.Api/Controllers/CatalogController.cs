using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;
namespace Sunfara.Api.Controllers;
[ApiController, Route("api")]
public sealed class CatalogController(FirestoreCatalogStore store) : ControllerBase
{
 [HttpGet("health")] public IActionResult Health()=>Ok(new{status="OK",service="Sunfara C# Firebase Commerce API",utc=DateTime.UtcNow});
 [HttpGet("categories")] public async Task<IActionResult> Categories()=>Ok(await store.ListAsync("categories"));
 [HttpGet("vendors")] public async Task<IActionResult> Vendors()=>Ok(await store.ListAsync("vendors"));
}
