namespace Sunfara.Domain;

/// <summary>
/// CMS-001 — admin-editable banners / policies / posts.
/// Documents live in Firestore collections banners|policies|posts; public API
/// returns only published docs. Body HTML must be escaped or sanitized at render.
/// </summary>
public static class CmsRules
{
    public static readonly HashSet<string> Collections = new(StringComparer.OrdinalIgnoreCase)
    {
        "banners", "policies", "posts"
    };

    public const string StatusDraft = "draft";
    public const string StatusPublished = "published";

    public static bool IsKnownCollection(string collection) => Collections.Contains(collection);

    public static bool IsPubliclyVisible(string? status, DateTimeOffset? publishAt, DateTimeOffset now)
    {
        if (!string.Equals(status, StatusPublished, StringComparison.OrdinalIgnoreCase)) return false;
        if (publishAt.HasValue && publishAt.Value > now) return false;
        return true;
    }

    public static CmsDocument Normalize(string collection, string title, string? slug, string body, string? status)
    {
        if (!IsKnownCollection(collection)) throw new ArgumentException($"Unknown CMS collection: {collection}");
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("Title is required.");
        var normalizedSlug = string.IsNullOrWhiteSpace(slug)
            ? Slugify(title)
            : Slugify(slug);
        var st = string.IsNullOrWhiteSpace(status) ? StatusDraft : status.Trim().ToLowerInvariant();
        if (st is not (StatusDraft or StatusPublished))
            throw new ArgumentException("Status must be draft or published.");
        return new CmsDocument(collection, title.Trim(), normalizedSlug, body ?? "", st);
    }

    public static string Slugify(string input)
    {
        var chars = input.Trim().ToLowerInvariant().Select(c =>
            char.IsLetterOrDigit(c) ? c : '-').ToArray();
        var slug = new string(chars);
        while (slug.Contains("--", StringComparison.Ordinal)) slug = slug.Replace("--", "-", StringComparison.Ordinal);
        return slug.Trim('-');
    }
}

public sealed record CmsDocument(string Collection, string Title, string Slug, string Body, string Status);
