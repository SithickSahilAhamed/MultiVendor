using Sunfara.Domain;

namespace Sunfara.Domain.Tests;

public sealed class PaymentIntegrityTests
{
    [Theory]
    [InlineData(1000, 0, "Razorpay", 1000)]
    [InlineData(1000, 100, "Razorpay", 900)]
    [InlineData(1000, 0, "Cash on Delivery", 1000)]
    [InlineData(1000, 50, "Cash on Delivery", 950)]
    public void PAY003_COD_and_online_totals_match_without_hidden_fee(decimal subtotal, decimal discount, string method, decimal expected)
    {
        Assert.Equal(0m, CheckoutPricing.CodFeeRupees);
        Assert.Equal(expected, CheckoutPricing.OrderTotal(subtotal, discount, method));
    }

    [Fact]
    public void PAY002_production_missing_webhook_secret_fails_closed()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => RazorpayWebhookStartup.EnsureConfigured(null, isProduction: true));
        Assert.Contains("RAZORPAY_WEBHOOK_SECRET", ex.Message);
        Assert.False(RazorpayWebhookStartup.IsWebhookUsable(""));
        Assert.True(RazorpayWebhookStartup.IsWebhookUsable("whsec_test"));
        RazorpayWebhookStartup.EnsureConfigured(null, isProduction: false); // Development may start without secret
        RazorpayWebhookStartup.EnsureConfigured("whsec_ok", isProduction: true);
    }

    [Fact]
    public void PAY002_webhook_hmac_accepts_signed_rejects_tampered()
    {
        const string secret = "whsec_fixture_phase3";
        const string body = """{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1","order_id":"order_1"}}}}""";
        var good = RazorpayHmac.WebhookSignature(secret, body);
        Assert.True(RazorpayHmac.FixedTimeEqualsHex(good, good));
        Assert.False(RazorpayHmac.FixedTimeEqualsHex(good, "deadbeef"));
        Assert.False(RazorpayHmac.FixedTimeEqualsHex(good, RazorpayHmac.WebhookSignature("other", body)));
    }

    [Fact]
    public void PAY002_payment_verify_hmac_vector()
    {
        const string keySecret = "test_key_secret";
        var sig = RazorpayHmac.PaymentVerifySignature(keySecret, "order_ABC", "pay_XYZ");
        Assert.True(RazorpayHmac.FixedTimeEqualsHex(sig, sig));
        Assert.False(RazorpayHmac.FixedTimeEqualsHex(sig, RazorpayHmac.PaymentVerifySignature(keySecret, "order_ABC", "pay_OTHER")));
    }

    [Fact]
    public void PAY004_reconciliation_lists_unpaid_and_captured_but_unpaid()
    {
        var now = DateTimeOffset.Parse("2026-10-31T12:00:00Z");
        var orders = new[]
        {
            new OrderPaymentSnapshot("o1", "pending", "Razorpay", "rp_ord_1", null, now.AddHours(-2), 500m),
            new OrderPaymentSnapshot("o2", "pending", "Razorpay", "rp_ord_2", null, now.AddHours(-1), 200m),
            new OrderPaymentSnapshot("o3", "paid", "Razorpay", "rp_ord_3", "pay_3", now.AddHours(-3), 100m),
            new OrderPaymentSnapshot("o4", "pending", "Cash on Delivery", null, null, now.AddHours(-4), 80m),
        };
        var captures = new[]
        {
            new RazorpayCapturedPayment("pay_2", "rp_ord_2", 20000, now.AddMinutes(-30)),
            new RazorpayCapturedPayment("pay_3", "rp_ord_3", 10000, now.AddHours(-3)),
        };

        var mismatches = PaymentReconciliation.FindMismatches(orders, captures, now.AddDays(-1), now);

        Assert.Contains(mismatches, m => m.Kind == PaymentReconciliation.KindUnpaidOnline && m.OrderId == "o1");
        Assert.Contains(mismatches, m => m.Kind == PaymentReconciliation.KindUnpaidOnline && m.OrderId == "o2");
        Assert.Contains(mismatches, m => m.Kind == PaymentReconciliation.KindCapturedButUnpaid && m.OrderId == "o2" && m.RazorpayPaymentId == "pay_2");
        Assert.DoesNotContain(mismatches, m => m.OrderId == "o4"); // COD pending is expected
        Assert.DoesNotContain(mismatches, m => m.OrderId == "o3" && m.Kind == PaymentReconciliation.KindCapturedButUnpaid);
    }

    [Fact]
    public void PAY004_amount_mismatch_when_paid_amounts_differ()
    {
        var now = DateTimeOffset.UtcNow;
        var orders = new[]
        {
            new OrderPaymentSnapshot("o9", "paid", "Razorpay", "rp_9", "pay_9", now, 100m),
        };
        var captures = new[]
        {
            new RazorpayCapturedPayment("pay_9", "rp_9", 9999, now),
        };
        var mismatches = PaymentReconciliation.FindMismatches(orders, captures);
        Assert.Contains(mismatches, m => m.Kind == PaymentReconciliation.KindAmountMismatch && m.OrderId == "o9");
    }
}
