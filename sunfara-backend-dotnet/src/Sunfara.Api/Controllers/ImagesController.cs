using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;

/* Product photos ride through the API into Firestore instead of Firebase
   Storage because no Storage bucket is provisioned for this project (and
   enabling one needs the console + a billing plan). The dashboards resize
   images client-side before uploading, so documents stay far under
   Firestore's 1MB limit, and the storefront just receives an ordinary
   image URL it can drop into an <img> tag. */
[ApiController, Route("api/images")]
public sealed class ImagesController(FirestoreCatalogStore store) : ControllerBase
{
    private static readonly HashSet<string> AllowedTypes = ["image/jpeg", "image/png", "image/webp"];
    private const int MaxBytes = 600 * 1024;

    private string UserId => User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value ?? "";

    [Authorize(Policy = "Vendor"), HttpPost]
    public async Task<IActionResult> Upload([FromBody] ImageUploadRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Data)) return BadRequest(new { error = "No image data received." });
        if (!AllowedTypes.Contains(request.ContentType)) return BadRequest(new { error = "Only JPEG, PNG or WebP images are allowed." });
        byte[] bytes;
        try { bytes = Convert.FromBase64String(request.Data); }
        catch (FormatException) { return BadRequest(new { error = "Image data is not valid base64." }); }
        if (bytes.Length == 0 || bytes.Length > MaxBytes) return BadRequest(new { error = $"Image must be under {MaxBytes / 1024}KB after compression." });

        var id = await store.AddAsync("product_images", new Dictionary<string, object>
        {
            ["data"] = request.Data, ["contentType"] = request.ContentType, ["uploadedBy"] = UserId
        });
        return Ok(new { id });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        var doc = await store.GetAsync("product_images", id);
        if (doc?.GetValueOrDefault("data") is not string data) return NotFound();
        // An upload is immutable (replacing a photo mints a new id), so
        // browsers and CDNs may cache forever.
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(Convert.FromBase64String(data), doc.GetValueOrDefault("contentType")?.ToString() ?? "image/jpeg");
    }
}

public sealed record ImageUploadRequest(string Data, string ContentType);
