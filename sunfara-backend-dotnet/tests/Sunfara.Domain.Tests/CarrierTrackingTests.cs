using Sunfara.Domain;

namespace Sunfara.Domain.Tests;

public sealed class CarrierTrackingTests
{
    [Fact]
    public void Hmac_roundtrip_verifies()
    {
        const string secret = "test-shipping-secret";
        const string body = """{"trackingNumber":"TRK1","status":"in_transit"}""";
        var sig = CarrierWebhookSecurity.SignHmacSha256Hex(secret, body);
        Assert.True(CarrierWebhookSecurity.VerifyHmacSha256Hex(secret, body, sig));
        Assert.False(CarrierWebhookSecurity.VerifyHmacSha256Hex(secret, body, "deadbeef"));
        Assert.False(CarrierWebhookSecurity.VerifyHmacSha256Hex(secret, body + "x", sig));
        Assert.False(CarrierWebhookSecurity.VerifyHmacSha256Hex("", body, sig));
    }

    [Theory]
    [InlineData("in_transit", "shipped")]
    [InlineData("Out For Delivery", "shipped")]
    [InlineData("picked-up", "shipped")]
    [InlineData("delivered", "delivered")]
    [InlineData("delivery_complete", "delivered")]
    [InlineData("rto", "returned")]
    [InlineData("unknown_scan", null)]
    [InlineData("cancelled", null)]
    [InlineData("", null)]
    public void Carrier_status_maps_to_order_status(string carrier, string? expected) =>
        Assert.Equal(expected, CarrierEventMapper.MapToOrderStatus(carrier));

    [Theory]
    [InlineData("packed", "shipped", true)]
    [InlineData("shipped", "delivered", true)]
    [InlineData("pending", "shipped", false)]
    [InlineData("shipped", "shipped", false)]
    [InlineData("delivered", "shipped", false)]
    public void Transition_guard_respects_state_machine(string from, string to, bool expected) =>
        Assert.Equal(expected, CarrierEventMapper.ShouldApplyStatusTransition(from, to));
}
