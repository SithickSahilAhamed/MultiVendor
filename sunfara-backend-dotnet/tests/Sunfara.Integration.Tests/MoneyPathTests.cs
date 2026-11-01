using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Sunfara.Domain;
using Sunfara.Integration.Tests.Infrastructure;
using Sunfara.Infrastructure;

namespace Sunfara.Integration.Tests;

public sealed class MoneyPathTests : IClassFixture<SunfaraApiFactory>
{
    private readonly SunfaraApiFactory _factory;

    public MoneyPathTests(SunfaraApiFactory factory) => _factory = factory;

    [EmulatorFact]
    public async Task IT_CHK_01_multi_vendor_checkout_splits_orders_and_coupon()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var (vendorA, vendorB, productA, productB) = await SeedHelper.SeedTwoVendorCatalogAsync(store, priceA: 100, priceB: 300);

        await store.AddAsync("coupons", new Dictionary<string, object>
        {
            ["code"] = "SAVE10", ["type"] = "percent", ["discount"] = 10.0, ["minOrder"] = 0.0, ["active"] = true
        });

        var customerId = $"cust-{Guid.NewGuid():N}"[..16];
        var orderId = await marketplace.CheckoutAsync(customerId, CheckoutRequest(
            "Razorpay",
            [(productA, 1), (productB, 1)],
            couponCode: "SAVE10"));

        var order = await store.GetAsync("orders", orderId);
        Assert.NotNull(order);
        Assert.Equal(400.0, Convert.ToDouble(order!["subtotal"]));
        Assert.Equal(40.0, Convert.ToDouble(order["discountAmount"]));
        Assert.Equal(360.0, Convert.ToDouble(order["totalAmount"]));

        var vendorOrders = await store.WhereAsync("vendor_orders", "masterOrderId", orderId, 10);
        Assert.Equal(2, vendorOrders.Count);
        // Vendor A share: 100/400 * 40 = 10 → net 90; Vendor B: 300/400 * 40 = 30 → net 270
        Assert.Contains(vendorOrders, vo => vo["vendorId"].ToString() == vendorA && Convert.ToDouble(vo["subtotal"]) == 90.0);
        Assert.Contains(vendorOrders, vo => vo["vendorId"].ToString() == vendorB && Convert.ToDouble(vo["subtotal"]) == 270.0);

        // Online: stock not decremented at checkout
        Assert.Equal(10L, Convert.ToInt64((await store.GetAsync("products", productA))!["stock"]));
        Assert.Equal(10L, Convert.ToInt64((await store.GetAsync("products", productB))!["stock"]));
    }

    [EmulatorFact]
    public async Task IT_CHK_02_COD_decrements_stock_without_commission_until_delivered()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var (vendorA, _, productA, _) = await SeedHelper.SeedTwoVendorCatalogAsync(store, stockA: 5, priceA: 100);

        var customerId = $"cust-{Guid.NewGuid():N}"[..16];
        var orderId = await marketplace.CheckoutAsync(customerId, CheckoutRequest("Cash on Delivery", [(productA, 2)]));

        Assert.Equal(3L, Convert.ToInt64((await store.GetAsync("products", productA))!["stock"]));
        var vos = await store.WhereAsync("vendor_orders", "masterOrderId", orderId, 5);
        Assert.Single(vos);
        Assert.False(Convert.ToBoolean(vos[0].GetValueOrDefault("commissionsCalculated") ?? false));
        Assert.Empty(await store.WhereAsync("commissions", "vendorId", vendorA, 5));
    }

    [EmulatorFact]
    public async Task IT_CHK_03_online_stock_held_until_confirm()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var (_, _, productA, _) = await SeedHelper.SeedTwoVendorCatalogAsync(store, stockA: 8, priceA: 50);

        var customerId = $"cust-{Guid.NewGuid():N}"[..16];
        var orderId = await marketplace.CheckoutAsync(customerId, CheckoutRequest("Razorpay", [(productA, 3)]));

        Assert.Equal(8L, Convert.ToInt64((await store.GetAsync("products", productA))!["stock"]));
        await marketplace.ConfirmAllVendorOrdersForPaymentAsync(orderId);
        Assert.Equal(5L, Convert.ToInt64((await store.GetAsync("products", productA))!["stock"]));
    }

    [EmulatorFact]
    public async Task IT_PAY_01_verify_hmac_valid_marks_paid_and_decrements_stock()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var (_, _, productA, _) = await SeedHelper.SeedTwoVendorCatalogAsync(store, stockA: 6, priceA: 100);
        var customerId = $"cust-{Guid.NewGuid():N}"[..16];
        var orderId = await marketplace.CheckoutAsync(customerId, CheckoutBody(productA, "Razorpay"));
        await store.UpdateAsync("orders", orderId, new Dictionary<string, object> { ["razorpayOrderId"] = "order_pay01" });

        var sig = RazorpayHmac.PaymentVerifySignature(SunfaraApiFactory.KeySecret, "order_pay01", "pay_pay01");
        using var client = _factory.CreateAuthedClient(customerId, "customer");
        var response = await client.PostAsJsonAsync("/api/payments/verify", new
        {
            orderId,
            razorpayOrderId = "order_pay01",
            razorpayPaymentId = "pay_pay01",
            razorpaySignature = sig
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("paid", (await store.GetAsync("orders", orderId))!["paymentStatus"]?.ToString());
        Assert.Equal(5L, Convert.ToInt64((await store.GetAsync("products", productA))!["stock"]));
    }

    [EmulatorFact]
    public async Task IT_PAY_02_verify_hmac_invalid_leaves_stock()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var (_, _, productA, _) = await SeedHelper.SeedTwoVendorCatalogAsync(store, stockA: 4, priceA: 100);
        var customerId = $"cust-{Guid.NewGuid():N}"[..16];
        var orderId = await marketplace.CheckoutAsync(customerId, CheckoutBody(productA, "Razorpay"));
        await store.UpdateAsync("orders", orderId, new Dictionary<string, object> { ["razorpayOrderId"] = "order_pay02" });

        using var client = _factory.CreateAuthedClient(customerId, "customer");
        var response = await client.PostAsJsonAsync("/api/payments/verify", new
        {
            orderId,
            razorpayOrderId = "order_pay02",
            razorpayPaymentId = "pay_pay02",
            razorpaySignature = "00badsignature00"
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("pending", (await store.GetAsync("orders", orderId))!["paymentStatus"]?.ToString());
        Assert.Equal(4L, Convert.ToInt64((await store.GetAsync("products", productA))!["stock"]));
    }

    [EmulatorFact]
    public async Task IT_PAY_03_webhook_settles_and_is_idempotent()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var (_, _, productA, _) = await SeedHelper.SeedTwoVendorCatalogAsync(store, stockA: 7, priceA: 100);
        var customerId = $"cust-{Guid.NewGuid():N}"[..16];
        var orderId = await marketplace.CheckoutAsync(customerId, CheckoutBody(productA, "Razorpay"));
        await store.UpdateAsync("orders", orderId, new Dictionary<string, object> { ["razorpayOrderId"] = "order_wh03" });

        var body = """{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_wh03","order_id":"order_wh03"}}}}""";
        var signature = RazorpayHmac.WebhookSignature(SunfaraApiFactory.WebhookSecret, body);

        using var client = _factory.CreateClient();
        async Task<HttpResponseMessage> PostWebhook()
        {
            var req = new HttpRequestMessage(HttpMethod.Post, "/api/payments/webhook")
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };
            req.Headers.Add("X-Razorpay-Signature", signature);
            return await client.SendAsync(req);
        }

        Assert.Equal(HttpStatusCode.OK, (await PostWebhook()).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await PostWebhook()).StatusCode); // replay
        Assert.Equal("paid", (await store.GetAsync("orders", orderId))!["paymentStatus"]?.ToString());
        Assert.Equal(6L, Convert.ToInt64((await store.GetAsync("products", productA))!["stock"])); // decremented once
    }

    [EmulatorFact]
    public async Task IT_PAY_03b_unsigned_webhook_is_401()
    {
        using var client = _factory.CreateClient();
        var body = """{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_x","order_id":"order_x"}}}}""";
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/payments/webhook")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        req.Headers.Add("X-Razorpay-Signature", "not-a-real-signature");
        var response = await client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [EmulatorFact]
    public async Task IT_WDR_01_concurrent_withdrawals_cannot_exceed_balance()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var vendorId = $"wdr-{Guid.NewGuid():N}"[..16];
        await store.Database.Collection("vendors").Document(vendorId).SetAsync(new Dictionary<string, object>
        {
            ["name"] = "Wallet Vendor", ["status"] = "active", ["commission"] = 10.0
        });
        await SeedHelper.SeedVendorWalletAsync(store.Database, vendorId, 100);

        var t1 = marketplace.RequestWithdrawalAsync(vendorId, 80);
        var t2 = marketplace.RequestWithdrawalAsync(vendorId, 80);
        var results = await Task.WhenAll(Safe(t1), Safe(t2));
        var successes = results.Count(r => r.Ok);
        var failures = results.Count(r => !r.Ok);
        Assert.Equal(1, successes);
        Assert.Equal(1, failures);

        var pending = await store.WhereAsync("withdrawals", "vendorId", vendorId, 10);
        Assert.Single(pending, w => w["status"]?.ToString() == "pending");
    }

    [EmulatorFact]
    public async Task IT_RFD_02_COD_refund_restores_stock_bookkeeping_only()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var (vendorA, _, productA, _) = await SeedHelper.SeedTwoVendorCatalogAsync(store, stockA: 5, priceA: 100);
        var customerId = $"cust-{Guid.NewGuid():N}"[..16];
        var orderId = await marketplace.CheckoutAsync(customerId, CheckoutBody(productA, "Cash on Delivery", qty: 2));
        var vos = await store.WhereAsync("vendor_orders", "masterOrderId", orderId, 5);
        var vendorOrderId = vos[0]["id"].ToString()!;

        // Advance to delivered so return is legal; commission lands on COD delivery
        await marketplace.UpdateOrderStatusAsync(vendorOrderId, vendorA, "confirmed", isAdmin: true);
        await marketplace.UpdateOrderStatusAsync(vendorOrderId, vendorA, "processing", isAdmin: true);
        await marketplace.UpdateOrderStatusAsync(vendorOrderId, vendorA, "packed", isAdmin: true);
        await marketplace.UpdateOrderStatusAsync(vendorOrderId, vendorA, "shipped", isAdmin: true);
        await marketplace.UpdateOrderStatusAsync(vendorOrderId, vendorA, "delivered", isAdmin: true);

        Assert.Equal(3L, Convert.ToInt64((await store.GetAsync("products", productA))!["stock"]));
        var returnId = await marketplace.RequestReturnAsync(vendorOrderId, customerId, "defective");
        await marketplace.ReviewReturnAsync(returnId, vendorA, approve: true, isAdmin: false);

        Assert.Equal(5L, Convert.ToInt64((await store.GetAsync("products", productA))!["stock"]));
        var refunds = await store.WhereAsync("refunds", "vendorOrderId", vendorOrderId, 5);
        Assert.Single(refunds);
        Assert.Equal("manual", refunds[0]["method"]?.ToString());
    }

    [EmulatorFact]
    public async Task IT_RFD_01_online_refund_uses_mocked_razorpay_and_restores_stock()
    {
        var store = _factory.CreateStore();
        var marketplace = ResolveMarketplace();
        var (vendorA, _, productA, _) = await SeedHelper.SeedTwoVendorCatalogAsync(store, stockA: 5, priceA: 100);
        var customerId = $"cust-{Guid.NewGuid():N}"[..16];
        var orderId = await marketplace.CheckoutAsync(customerId, CheckoutBody(productA, "Razorpay", qty: 1));
        await store.UpdateAsync("orders", orderId, new Dictionary<string, object>
        {
            ["paymentStatus"] = "paid",
            ["razorpayPaymentId"] = "pay_rfd01",
            ["razorpayOrderId"] = "order_rfd01"
        });
        await marketplace.ConfirmAllVendorOrdersForPaymentAsync(orderId);

        var vos = await store.WhereAsync("vendor_orders", "masterOrderId", orderId, 5);
        var vendorOrderId = vos[0]["id"].ToString()!;
        await marketplace.UpdateOrderStatusAsync(vendorOrderId, vendorA, "processing", isAdmin: true);
        await marketplace.UpdateOrderStatusAsync(vendorOrderId, vendorA, "packed", isAdmin: true);
        await marketplace.UpdateOrderStatusAsync(vendorOrderId, vendorA, "shipped", isAdmin: true);
        await marketplace.UpdateOrderStatusAsync(vendorOrderId, vendorA, "delivered", isAdmin: true);

        _factory.HttpHandler.Responder = _ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""{"id":"rfnd_mock_1","status":"processed"}""", Encoding.UTF8, "application/json")
        };

        var returnId = await marketplace.RequestReturnAsync(vendorOrderId, customerId, "changed mind");
        await marketplace.ReviewReturnAsync(returnId, vendorA, approve: true, isAdmin: false);

        Assert.Equal(5L, Convert.ToInt64((await store.GetAsync("products", productA))!["stock"]));
        var refunds = await store.WhereAsync("refunds", "vendorOrderId", vendorOrderId, 5);
        Assert.Single(refunds);
        Assert.Equal("razorpay", refunds[0]["method"]?.ToString());
        Assert.Equal("rfnd_mock_1", refunds[0]["razorpayRefundId"]?.ToString());
    }

    private MarketplaceService ResolveMarketplace()
    {
        var store = _factory.CreateStore();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["RAZORPAY_KEY_ID"] = SunfaraApiFactory.KeyId,
            ["RAZORPAY_KEY_SECRET"] = SunfaraApiFactory.KeySecret,
            ["RAZORPAY_WEBHOOK_SECRET"] = SunfaraApiFactory.WebhookSecret,
        }).Build();
        return new MarketplaceService(
            store,
            new FixedHttpClientFactory(_factory.HttpHandler),
            config,
            new SandboxPayoutRail(),
            new RecordingNotificationChannelSender());
    }

    private static Dictionary<string, object> CheckoutBody(string productId, string method, int qty = 1)
        => CheckoutRequest(method, [(productId, qty)]);

    /* MarketplaceService.ReadItems only accepts System.Text.Json.JsonElement arrays
       (ASP.NET model-bound shape). Round-trip through JSON so service-level tests
       match the HTTP path. */
    private static Dictionary<string, object> CheckoutRequest(
        string method,
        IEnumerable<(string ProductId, int Qty)> lines,
        string? couponCode = null)
    {
        var payload = new Dictionary<string, object?>
        {
            ["paymentMethod"] = method,
            ["shippingAddress"] = new { line1 = "1 Test St" },
            ["items"] = lines.Select(l => new { productId = l.ProductId, quantity = l.Qty }).ToArray(),
        };
        if (!string.IsNullOrWhiteSpace(couponCode))
            payload["couponCode"] = couponCode;
        return JsonSerializer.Deserialize<Dictionary<string, object>>(JsonSerializer.Serialize(payload))!;
    }

    private static async Task<(bool Ok, string? Id, string? Error)> Safe(Task<string> task)
    {
        try { return (true, await task, null); }
        catch (Exception ex) { return (false, null, ex.Message); }
    }
}
