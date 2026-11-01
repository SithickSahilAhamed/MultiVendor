using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Domain;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;

[ApiController, Route("api/cms")]
public sealed class CmsController(FirestoreCatalogStore store) : ControllerBase
{
    [AllowAnonymous, HttpGet("{collection}")]
    public async Task<IActionResult> ListPublished(string collection, [FromQuery] int limit = 50)
    {
        if (!CmsRules.IsKnownCollection(collection)) return NotFound();
        var now = DateTimeOffset.UtcNow;
        var docs = await store.ListAsync(collection, Math.Clamp(limit, 1, 200));
        var published = docs.Where(d =>
        {
            var status = d.GetValueOrDefault("status")?.ToString();
            DateTimeOffset? publishAt = null;
            if (d.TryGetValue("publishAt", out var raw) && raw is not null
                && DateTimeOffset.TryParse(raw.ToString(), out var parsed))
                publishAt = parsed;
            return CmsRules.IsPubliclyVisible(status, publishAt, now);
        }).ToList();
        return Ok(published);
    }

    [AllowAnonymous, HttpGet("{collection}/{id}")]
    public async Task<IActionResult> GetPublished(string collection, string id)
    {
        if (!CmsRules.IsKnownCollection(collection)) return NotFound();
        var doc = await store.GetAsync(collection, id);
        if (doc is null) return NotFound();
        var status = doc.GetValueOrDefault("status")?.ToString();
        DateTimeOffset? publishAt = null;
        if (doc.TryGetValue("publishAt", out var raw) && raw is not null
            && DateTimeOffset.TryParse(raw.ToString(), out var parsed))
            publishAt = parsed;
        if (!CmsRules.IsPubliclyVisible(status, publishAt, DateTimeOffset.UtcNow)) return NotFound();
        return Ok(doc);
    }

    [Authorize(Policy = "Admin"), HttpPost("{collection}")]
    public async Task<IActionResult> Upsert(string collection, [FromBody] CmsWriteRequest request)
    {
        if (!CmsRules.IsKnownCollection(collection)) return NotFound();
        try
        {
            var normalized = CmsRules.Normalize(collection, request.Title, request.Slug, request.Body ?? "", request.Status);
            var payload = new Dictionary<string, object>
            {
                ["title"] = normalized.Title,
                ["slug"] = normalized.Slug,
                ["body"] = normalized.Body,
                ["status"] = normalized.Status,
                ["publishAt"] = request.PublishAt?.ToString("o") ?? ""
            };
            if (!string.IsNullOrWhiteSpace(request.Id))
            {
                await store.UpsertAsync(collection, request.Id!, payload);
                return Ok(new { id = request.Id });
            }
            var id = await store.AddAsync(collection, payload);
            return Ok(new { id });
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }
}

public sealed record CmsWriteRequest(string Title, string? Slug, string? Body, string? Status, string? Id = null, DateTimeOffset? PublishAt = null);
