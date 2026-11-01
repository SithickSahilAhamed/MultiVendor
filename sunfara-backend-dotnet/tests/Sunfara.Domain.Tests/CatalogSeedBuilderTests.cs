using System.Text.Json;
using Sunfara.Domain;

namespace Sunfara.Domain.Tests;

public sealed class CatalogSeedBuilderTests
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    [Fact]
    public void Categories_use_stable_ids_and_are_idempotent()
    {
        var json = JsonDocument.Parse("""
            [
              {"id":"organic-skincare","name":"Organic Skincare","slug":"organic-skincare","productCount":10},
              {"id":"herbal-haircare","name":"Herbal Haircare","slug":"herbal-haircare","productCount":8}
            ]
            """);
        var a = CatalogSeedBuilder.BuildCategories(json.RootElement);
        var b = CatalogSeedBuilder.BuildCategories(json.RootElement);
        Assert.Equal(2, a.Count);
        Assert.Equal("categories", a[0].Collection);
        Assert.Equal("organic-skincare", a[0].Id);
        Assert.False(a[0].Data.ContainsKey("id"));
        Assert.Equal(a[0].Id, b[0].Id);
        Assert.Equal(JsonSerializer.Serialize(a[0].Data), JsonSerializer.Serialize(b[0].Data));
    }

    [Fact]
    public void Vendors_require_uid_map_and_write_to_auth_uid()
    {
        var vendors = JsonDocument.Parse("""
            [{"id":"haaniya","name":"Haaniya","commissionRate":15,"productsCount":25,"reviewCount":10,"isActive":true}]
            """);
        var map = new Dictionary<string, string> { ["haaniya"] = "uid-haaniya-1" };
        var docs = CatalogSeedBuilder.BuildVendors(vendors.RootElement, map);
        Assert.Single(docs);
        Assert.Equal("vendors", docs[0].Collection);
        Assert.Equal("uid-haaniya-1", docs[0].Id);
        Assert.Equal("active", docs[0].Data["status"]);
        Assert.Equal("haaniya", docs[0].Data["slug"]);
        Assert.Equal(25L, Convert.ToInt64(docs[0].Data["products"]));
    }

    [Fact]
    public void Vendors_reject_missing_uid_mapping()
    {
        var vendors = JsonDocument.Parse("""[{"id":"haaniya","name":"Haaniya"}]""");
        Assert.Throws<InvalidOperationException>(() =>
            CatalogSeedBuilder.BuildVendors(vendors.RootElement, new Dictionary<string, string>()));
    }

    [Fact]
    public void Products_are_active_and_vendor_assignment_is_stable()
    {
        var products = JsonDocument.Parse("""
            [
              {"id":"SKN001","name":"Serum","price":799,"stock":10},
              {"id":"SKN002","name":"Cream","price":549,"stock":5}
            ]
            """);
        var uids = new List<string> { "uid-b", "uid-a" };
        var first = CatalogSeedBuilder.BuildProducts(products.RootElement, uids);
        var second = CatalogSeedBuilder.BuildProducts(products.RootElement, uids);
        Assert.Equal(2, first.Count);
        Assert.All(first, d => Assert.Equal("active", d.Data["status"]));
        Assert.Equal(first[0].Data["vendorId"], second[0].Data["vendorId"]);
        Assert.Equal(first[1].Data["vendorId"], second[1].Data["vendorId"]);
        Assert.Contains(first[0].Data["vendorId"], new[] { "uid-a", "uid-b" });
    }

    [Fact]
    public void PickVendorUid_is_deterministic()
    {
        var uids = new List<string> { "a", "b", "c" };
        var x = CatalogSeedBuilder.PickVendorUid("SKN001", uids);
        var y = CatalogSeedBuilder.PickVendorUid("SKN001", uids);
        Assert.Equal(x, y);
    }

    [Fact]
    public void ParseVendorMap_rejects_empty_uid()
    {
        var json = JsonDocument.Parse("""{"haaniya":""}""");
        Assert.Throws<InvalidOperationException>(() => CatalogSeedBuilder.ParseVendorMap(json.RootElement));
    }

    [Fact]
    public void ParseVendorMap_rejects_placeholder_and_duplicate_uids()
    {
        var placeholder = JsonDocument.Parse("""{"haaniya":"REPLACE_WITH_FIREBASE_AUTH_UID"}""");
        Assert.Throws<InvalidOperationException>(() => CatalogSeedBuilder.ParseVendorMap(placeholder.RootElement));

        var dupes = JsonDocument.Parse("""{"haaniya":"uid-1","green-botanics":"uid-1"}""");
        Assert.Throws<InvalidOperationException>(() => CatalogSeedBuilder.ParseVendorMap(dupes.RootElement));
    }
}
