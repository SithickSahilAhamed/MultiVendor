using Sunfara.Domain;

namespace Sunfara.Domain.Tests;

public sealed class RazorpayHmacTests
{
    [Fact]
    public void Payment_verify_hmac_accepts_exact_vector_rejects_tamper()
    {
        const string keySecret = "test_key_secret_fixture";
        var sig = RazorpayHmac.PaymentVerifySignature(keySecret, "order_ABC", "pay_XYZ");
        Assert.True(RazorpayHmac.FixedTimeEqualsHex(sig, sig));
        Assert.False(RazorpayHmac.FixedTimeEqualsHex(sig, RazorpayHmac.PaymentVerifySignature(keySecret, "order_ABC", "pay_OTHER")));
        Assert.False(RazorpayHmac.FixedTimeEqualsHex(sig, "deadbeef"));
    }

    [Fact]
    public void Webhook_hmac_accepts_signed_rejects_wrong_secret()
    {
        const string secret = "whsec_fixture_phase4";
        const string body = """{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1","order_id":"order_1"}}}}""";
        var good = RazorpayHmac.WebhookSignature(secret, body);
        Assert.True(RazorpayHmac.FixedTimeEqualsHex(good, good));
        Assert.False(RazorpayHmac.FixedTimeEqualsHex(good, RazorpayHmac.WebhookSignature("other", body)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(50)]
    [InlineData(100)]
    public void Commission_edge_rates_are_accepted(decimal rate)
    {
        var result = CommissionCalculator.Calculate(1000m, rate);
        Assert.Equal(rate == 0 ? 0m : decimal.Round(1000m * rate / 100m, 2), result.Commission);
        Assert.Equal(1000m - result.Commission, result.NetToVendor);
    }
}
