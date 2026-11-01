using Google.Cloud.Firestore;
using Sunfara.Infrastructure;

namespace Sunfara.Integration.Tests.Infrastructure;

public static class SeedHelper
{
    public static async Task<(string VendorA, string VendorB, string ProductA, string ProductB)> SeedTwoVendorCatalogAsync(
        FirestoreCatalogStore store,
        int stockA = 10,
        int stockB = 10,
        double priceA = 100,
        double priceB = 200)
    {
        var vendorA = $"vA-{Guid.NewGuid():N}"[..20];
        var vendorB = $"vB-{Guid.NewGuid():N}"[..20];

        await store.Database.Collection("vendors").Document(vendorA).SetAsync(new Dictionary<string, object>
        {
            ["name"] = "Vendor A", ["email"] = $"{vendorA}@test.local", ["status"] = "active", ["commission"] = 10.0
        });
        await store.Database.Collection("vendors").Document(vendorB).SetAsync(new Dictionary<string, object>
        {
            ["name"] = "Vendor B", ["email"] = $"{vendorB}@test.local", ["status"] = "active", ["commission"] = 15.0
        });

        var productA = await store.AddAsync("products", new Dictionary<string, object>
        {
            ["name"] = "Product A", ["vendorId"] = vendorA, ["vendorName"] = "Vendor A",
            ["price"] = priceA, ["stock"] = (long)stockA, ["status"] = "active"
        });
        var productB = await store.AddAsync("products", new Dictionary<string, object>
        {
            ["name"] = "Product B", ["vendorId"] = vendorB, ["vendorName"] = "Vendor B",
            ["price"] = priceB, ["stock"] = (long)stockB, ["status"] = "active"
        });

        return (vendorA, vendorB, productA, productB);
    }

    public static async Task SeedVendorWalletAsync(FirestoreDb db, string vendorId, double balance)
    {
        await db.Collection("vendor_wallets").Document(vendorId).SetAsync(new Dictionary<string, object>
        {
            ["vendorId"] = vendorId,
            ["balance"] = balance,
            ["totalEarned"] = balance,
            ["totalWithdrawn"] = 0.0,
        });
    }

    public static async Task SeedSuspendedVendorAsync(FirestoreCatalogStore store, string vendorId)
    {
        await store.Database.Collection("vendors").Document(vendorId).SetAsync(new Dictionary<string, object>
        {
            ["name"] = "Suspended Co", ["email"] = $"{vendorId}@test.local", ["status"] = "suspended", ["commission"] = 10.0
        });
    }

    public static async Task<string> SeedOwnedProductAsync(FirestoreCatalogStore store, string vendorId, string name = "Owned SKU")
    {
        return await store.AddAsync("products", new Dictionary<string, object>
        {
            ["name"] = name, ["vendorId"] = vendorId, ["vendorName"] = "Owned",
            ["price"] = 50.0, ["stock"] = 5L, ["status"] = "active"
        });
    }
}
