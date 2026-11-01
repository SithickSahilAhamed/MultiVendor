using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Domain;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;

/// <summary>
/// AUTH-004: upsert customers/{uid} from storefront signup/login. Document id is always the
/// authenticated Firebase UID — callers cannot write another user's profile.
/// </summary>
[Authorize, ApiController, Route("api/customers")]
public sealed class CustomersController(FirestoreCatalogStore store) : ControllerBase
{
    private string UserId => User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value ?? "";

    [HttpPost("me")]
    public async Task<IActionResult> UpsertMe([FromBody] CustomerUpsertRequest? request)
    {
        var uid = UserId;
        if (string.IsNullOrWhiteSpace(uid)) return Unauthorized();
        if (!CustomerProfile.MayUpsert(uid, request?.Uid))
            return Forbid();

        var payload = CustomerProfile.BuildUpsert(uid, request?.Name, request?.Email, request?.Phone);
        await store.UpsertAsync("customers", uid, payload);
        var doc = await store.GetAsync("customers", uid);
        return Ok(doc);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var uid = UserId;
        if (string.IsNullOrWhiteSpace(uid)) return Unauthorized();
        return await store.GetAsync("customers", uid) is { } doc ? Ok(doc) : NotFound();
    }
}

public sealed record CustomerUpsertRequest(string? Name, string? Email, string? Phone, string? Uid = null);
