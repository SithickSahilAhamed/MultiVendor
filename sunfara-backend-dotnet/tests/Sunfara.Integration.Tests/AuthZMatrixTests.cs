using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Sunfara.Integration.Tests.Infrastructure;
using Sunfara.Infrastructure;

namespace Sunfara.Integration.Tests;

public sealed class AuthZMatrixTests : IClassFixture<SunfaraApiFactory>
{
    private readonly SunfaraApiFactory _factory;

    public AuthZMatrixTests(SunfaraApiFactory factory) => _factory = factory;

    [EmulatorFact]
    public async Task Anon_checkout_returns_401()
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/checkout", new { items = Array.Empty<object>() });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [EmulatorFact]
    public async Task Customer_cannot_list_admin_vendors()
    {
        using var client = _factory.CreateAuthedClient($"cust-{Guid.NewGuid():N}"[..16], "customer");
        var response = await client.GetAsync("/api/admin/vendors");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [EmulatorFact]
    public async Task Customer_cannot_request_vendor_withdrawal()
    {
        using var client = _factory.CreateAuthedClient($"cust-{Guid.NewGuid():N}"[..16], "customer");
        var response = await client.PostAsJsonAsync("/api/vendor/withdrawal", new { amount = 10 });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [EmulatorFact]
    public async Task Active_vendor_can_update_own_product()
    {
        var store = _factory.CreateStore();
        var vendorId = $"vend-{Guid.NewGuid():N}"[..16];
        await store.Database.Collection("vendors").Document(vendorId).SetAsync(new Dictionary<string, object>
        {
            ["name"] = "Active", ["status"] = "active", ["commission"] = 10.0
        });
        var productId = await SeedHelper.SeedOwnedProductAsync(store, vendorId);

        using var client = _factory.CreateAuthedClient(vendorId, "vendor");
        var response = await client.PutAsJsonAsync($"/api/products/{productId}", new { name = "Renamed SKU", price = 55 });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("Renamed SKU", (await store.GetAsync("products", productId))!["name"]?.ToString());
    }

    [EmulatorFact]
    public async Task Active_vendor_cannot_update_other_vendor_order()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var (ownerVendor, otherVendor, productA, _) = await SeedHelper.SeedTwoVendorCatalogAsync(store);
        var customerId = $"cust-{Guid.NewGuid():N}"[..16];
        var checkoutPayload = JsonSerializer.Deserialize<Dictionary<string, object>>(JsonSerializer.Serialize(new
        {
            paymentMethod = "Cash on Delivery",
            items = new[] { new { productId = productA, quantity = 1 } }
        }))!;
        var orderId = await marketplace.CheckoutAsync(customerId, checkoutPayload);
        var vos = await store.WhereAsync("vendor_orders", "masterOrderId", orderId, 5);
        var vendorOrderId = vos[0]["id"].ToString()!;
        Assert.Equal(ownerVendor, vos[0]["vendorId"]?.ToString());

        using var client = _factory.CreateAuthedClient(otherVendor, "vendor");
        var response = await client.PutAsJsonAsync($"/api/vendor/orders/{vendorOrderId}/status", new { status = "confirmed" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [EmulatorFact]
    public async Task Suspended_vendor_cannot_withdraw()
    {
        var store = _factory.CreateStore();
        var vendorId = $"sus-{Guid.NewGuid():N}"[..16];
        await SeedHelper.SeedSuspendedVendorAsync(store, vendorId);
        await SeedHelper.SeedVendorWalletAsync(store.Database, vendorId, 500);

        using var client = _factory.CreateAuthedClient(vendorId, "vendor");
        var response = await client.PostAsJsonAsync("/api/vendor/withdrawal", new { amount = 10 });
        // AUTH-006 VendorActiveFilter rejects mutating Vendor-policy calls with 403
        // before MarketplaceService.RequestWithdrawalAsync (which would 400).
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var payload = await response.Content.ReadAsStringAsync();
        Assert.True(
            payload.Contains("not active", StringComparison.OrdinalIgnoreCase)
            || payload.Contains("not in good standing", StringComparison.OrdinalIgnoreCase),
            $"Unexpected body: {payload}");
    }

    [EmulatorFact]
    public async Task Suspended_vendor_cannot_create_product()
    {
        var store = _factory.CreateStore();
        var vendorId = $"sus2-{Guid.NewGuid():N}"[..16];
        await SeedHelper.SeedSuspendedVendorAsync(store, vendorId);

        using var client = _factory.CreateAuthedClient(vendorId, "vendor");
        var response = await client.PostAsJsonAsync("/api/products", new
        {
            name = "Should Fail",
            price = 10,
            stock = 1
        });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [EmulatorFact]
    public async Task Admin_can_approve_withdrawal()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var vendorId = $"adm-{Guid.NewGuid():N}"[..16];
        await store.Database.Collection("vendors").Document(vendorId).SetAsync(new Dictionary<string, object>
        {
            ["name"] = "Approve Me", ["status"] = "active", ["commission"] = 10.0
        });
        await SeedHelper.SeedVendorWalletAsync(store.Database, vendorId, 200);
        var withdrawalId = await marketplace.RequestWithdrawalAsync(vendorId, 50);

        using var client = _factory.CreateAuthedClient($"admin-{Guid.NewGuid():N}"[..16], "admin");
        var response = await client.PostAsync($"/api/admin/withdrawals/{withdrawalId}/approve", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var wallet = await store.GetAsync("vendor_wallets", vendorId);
        Assert.Equal(150.0, Convert.ToDouble(wallet!["balance"]));
        Assert.Equal("approved", (await store.GetAsync("withdrawals", withdrawalId))!["status"]?.ToString());
    }

    [EmulatorFact]
    public async Task Health_is_anonymous_ok()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private Sunfara.Infrastructure.MarketplaceService ResolveMarketplace()
    {
        var store = _factory.CreateStore();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["RAZORPAY_KEY_ID"] = SunfaraApiFactory.KeyId,
            ["RAZORPAY_KEY_SECRET"] = SunfaraApiFactory.KeySecret,
            ["RAZORPAY_WEBHOOK_SECRET"] = SunfaraApiFactory.WebhookSecret,
        }).Build();
        return new Sunfara.Infrastructure.MarketplaceService(
            store,
            new FixedHttpClientFactory(_factory.HttpHandler),
            config,
            new SandboxPayoutRail(),
            new RecordingNotificationChannelSender());
    }
}
