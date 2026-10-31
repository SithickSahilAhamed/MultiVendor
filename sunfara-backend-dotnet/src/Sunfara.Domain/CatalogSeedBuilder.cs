using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Sunfara.Domain;

/// <summary>
/// Pure transform from sunfara/data JSON into Firestore-ready docs.
/// No I/O — unit-tested for idempotent shapes and stable document ids.
/// </summary>
public static class CatalogSeedBuilder
{
    public static IReadOnlyList<SeedDocument> BuildCategories(JsonElement categoriesArray)
    {
        var list = new List<SeedDocument>();
        foreach (var item in categoriesArray.EnumerateArray())
        {
            var id = RequiredString(item, "id");
            var data = ToDictionary(item);
            data.Remove("id");
            list.Add(new SeedDocument("categories", id, data));
        }
        return list;
    }

    public static IReadOnlyList<SeedDocument> BuildVendors(
        JsonElement vendorsArray,
        IReadOnlyDictionary<string, string> slugToUid)
    {
        var list = new List<SeedDocument>();
        foreach (var item in vendorsArray.EnumerateArray())
        {
            var slug = RequiredString(item, "id");
            if (!slugToUid.TryGetValue(slug, out var uid) || string.IsNullOrWhiteSpace(uid))
                throw new InvalidOperationException(
                    $"Vendor slug '{slug}' is missing from the UID map. Every seed vendor must map to a Firebase Auth UID (AUTH-003).");

            var data = ToDictionary(item);
            data.Remove("id");
            data["slug"] = slug;
            data["status"] = "active";
            data["verified"] = true;
            data["kycStatus"] = "completed";
            if (!data.ContainsKey("commission") && data.TryGetValue("commissionRate", out var rate))
                data["commission"] = rate;
            if (data.TryGetValue("isActive", out var isActive) && isActive is bool active && !active)
                data["status"] = "suspended";
            if (data.TryGetValue("productsCount", out var pc))
                data["products"] = pc;
            if (data.TryGetValue("reviewCount", out var rc))
                data["reviews"] = rc;

            list.Add(new SeedDocument("vendors", uid, data));
        }
        return list;
    }

    public static IReadOnlyList<SeedDocument> BuildProducts(
        JsonElement productsArray,
        IReadOnlyList<string> vendorUids)
    {
        if (vendorUids.Count == 0)
            throw new InvalidOperationException("At least one vendor UID is required to seed products.");

        var sortedUids = vendorUids.OrderBy(x => x, StringComparer.Ordinal).ToList();
        var list = new List<SeedDocument>();
        foreach (var item in productsArray.EnumerateArray())
        {
            var id = RequiredString(item, "id");
            var data = ToDictionary(item);
            data.Remove("id");
            data["status"] = "active";
            data["vendorId"] = PickVendorUid(id, sortedUids);
            list.Add(new SeedDocument("products", id, data));
        }
        return list;
    }

    public static string PickVendorUid(string productId, IReadOnlyList<string> sortedVendorUids)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(productId));
        var index = hash[0] % sortedVendorUids.Count;
        return sortedVendorUids[index];
    }

    public static Dictionary<string, string> ParseVendorMap(JsonElement root)
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var prop in root.EnumerateObject())
        {
            var uid = prop.Value.GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(uid))
                throw new InvalidOperationException($"Vendor map entry '{prop.Name}' has an empty UID.");
            if (uid.StartsWith("REPLACE_", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(
                    $"Vendor map entry '{prop.Name}' still has placeholder UID '{uid}'. Copy vendor-uids.example.json and set real Firebase Auth UIDs.");
            map[prop.Name] = uid;
        }

        var dupes = map.GroupBy(kv => kv.Value, StringComparer.Ordinal)
            .Where(g => g.Count() > 1)
            .Select(g => $"{g.Key} ← {string.Join(", ", g.Select(x => x.Key))}")
            .ToList();
        if (dupes.Count > 0)
            throw new InvalidOperationException(
                "Vendor map UIDs must be unique (one Auth UID per vendor slug). Duplicates: " + string.Join("; ", dupes));

        return map;
    }

    private static string RequiredString(JsonElement el, string name)
    {
        if (!el.TryGetProperty(name, out var prop) || prop.ValueKind != JsonValueKind.String ||
            string.IsNullOrWhiteSpace(prop.GetString()))
            throw new InvalidOperationException($"Missing required string field '{name}'.");
        return prop.GetString()!;
    }

    private static Dictionary<string, object> ToDictionary(JsonElement el)
    {
        var dict = new Dictionary<string, object>();
        foreach (var prop in el.EnumerateObject())
            dict[prop.Name] = Convert(prop.Value)!;
        return dict;
    }

    private static object? Convert(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.Object => el.EnumerateObject().ToDictionary(p => p.Name, p => Convert(p.Value)!),
        JsonValueKind.Array => el.EnumerateArray().Select(Convert).ToList(),
        JsonValueKind.String => el.GetString() ?? "",
        JsonValueKind.Number when el.TryGetInt64(out var n) => n,
        JsonValueKind.Number => el.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Null => null,
        _ => null
    };
}

public sealed record SeedDocument(string Collection, string Id, Dictionary<string, object> Data);
