using Sunfara.Domain;

namespace Sunfara.Domain.Tests;

public sealed class ShippingRulesTests
{
    private static ShippingZone Zone(
        string id,
        string name,
        decimal flat,
        decimal? freeAbove = null,
        int priority = 0,
        bool active = true,
        string[]? prefixes = null,
        PincodeRange[]? ranges = null,
        string[]? states = null) =>
        new(id, name, active, priority, flat, freeAbove, 3, 5,
            prefixes ?? [], ranges ?? [], states ?? [], "Delhivery");

    [Fact]
    public void Fallback_charges_flat_below_threshold()
    {
        var quote = ShippingRateEngine.Quote([], new ShippingDestination("560001", "Karnataka"), 200m);
        Assert.Equal(49m, quote.Amount);
        Assert.Equal("fallback", quote.MatchedBy);
        Assert.False(quote.FreeShippingApplied);
    }

    [Fact]
    public void Fallback_is_free_at_or_above_599()
    {
        var quote = ShippingRateEngine.Quote([], new ShippingDestination("560001", "Karnataka"), 599m);
        Assert.Equal(0m, quote.Amount);
        Assert.True(quote.FreeShippingApplied);
    }

    [Fact]
    public void Prefix_zone_matches_and_applies_flat_rate()
    {
        var zones = new[] { Zone("z1", "South", 79m, freeAbove: 999m, prefixes: ["560", "600"]) };
        var quote = ShippingRateEngine.Quote(zones, new ShippingDestination("560034", "Karnataka"), 400m);
        Assert.Equal(79m, quote.Amount);
        Assert.Equal("z1", quote.ZoneId);
        Assert.Equal("zone", quote.MatchedBy);
    }

    [Fact]
    public void Zone_free_above_threshold_waives_rate()
    {
        var zones = new[] { Zone("z1", "South", 79m, freeAbove: 500m, prefixes: ["560"]) };
        var quote = ShippingRateEngine.Quote(zones, new ShippingDestination("560001", "Karnataka"), 500m);
        Assert.Equal(0m, quote.Amount);
        Assert.True(quote.FreeShippingApplied);
    }

    [Fact]
    public void Higher_priority_zone_wins()
    {
        var zones = new[]
        {
            Zone("metro", "Metro", 39m, priority: 10, prefixes: ["560"]),
            Zone("south", "South", 79m, priority: 1, prefixes: ["560"])
        };
        var quote = ShippingRateEngine.Quote(zones, new ShippingDestination("560001", "Karnataka"), 100m);
        Assert.Equal("metro", quote.ZoneId);
        Assert.Equal(39m, quote.Amount);
    }

    [Fact]
    public void Inactive_zone_is_ignored()
    {
        var zones = new[] { Zone("z1", "South", 79m, active: false, prefixes: ["560"]) };
        var quote = ShippingRateEngine.Quote(zones, new ShippingDestination("560001", "Karnataka"), 100m);
        Assert.Equal("fallback", quote.MatchedBy);
        Assert.Equal(49m, quote.Amount);
    }

    [Fact]
    public void State_zone_matches_when_no_pincode_filters()
    {
        var zones = new[] { Zone("tn", "Tamil Nadu", 59m, states: ["Tamil Nadu"]) };
        var quote = ShippingRateEngine.Quote(zones, new ShippingDestination("600001", "Tamil Nadu"), 100m);
        Assert.Equal("tn", quote.ZoneId);
        Assert.Equal(59m, quote.Amount);
    }

    [Fact]
    public void Pincode_range_matches()
    {
        var zones = new[] { Zone("blr", "Bangalore", 45m, ranges: [new PincodeRange(560001, 560100)]) };
        var quote = ShippingRateEngine.Quote(zones, new ShippingDestination("560050", "Karnataka"), 100m);
        Assert.Equal("blr", quote.ZoneId);
        Assert.Equal(45m, quote.Amount);
    }

    [Fact]
    public void Free_shipping_coupon_forces_zero()
    {
        var zones = new[] { Zone("z1", "South", 79m, prefixes: ["560"]) };
        var quote = ShippingRateEngine.Quote(zones, new ShippingDestination("560001", "Karnataka"), 100m, freeShippingCoupon: true);
        Assert.Equal(0m, quote.Amount);
        Assert.True(quote.FreeShippingApplied);
        Assert.Contains("coupon", quote.MatchedBy);
    }

    [Fact]
    public void Catch_all_zone_matches_any_destination()
    {
        var zones = new[] { Zone("all", "All India", 40m) };
        var quote = ShippingRateEngine.Quote(zones, new ShippingDestination("110001", "Delhi"), 100m);
        Assert.Equal("all", quote.ZoneId);
        Assert.Equal(40m, quote.Amount);
    }

    [Theory]
    [InlineData("560 034", "560034")]
    [InlineData("pin-110001", "110001")]
    [InlineData("", "")]
    public void Pincode_normalization_keeps_digits(string input, string expected) =>
        Assert.Equal(expected, ShippingRateEngine.NormalizePincode(input));

    [Fact]
    public void Negative_subtotal_is_rejected() =>
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            ShippingRateEngine.Quote([], new ShippingDestination("560001", "Karnataka"), -1m));
}
