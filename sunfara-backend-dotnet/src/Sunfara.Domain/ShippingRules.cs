namespace Sunfara.Domain;

/// <summary>
/// Pure shipping zone matching and rate calculation. Firestore documents are
/// mapped into <see cref="ShippingZone"/> before calling these helpers so
/// checkout pricing stays unit-testable without Firebase.
/// </summary>
public static class ShippingRateEngine
{
    /// <summary>Legacy storefront copy: free at/above ₹599, else ₹49 flat.</summary>
    public static readonly ShippingQuote DefaultFallbackQuote = new(
        Amount: 49m,
        ZoneId: "",
        ZoneName: "Default India",
        FreeShippingApplied: false,
        EstimatedDaysMin: 4,
        EstimatedDaysMax: 6,
        MatchedBy: "fallback");

    public const decimal DefaultFreeAboveSubtotal = 599m;
    public const decimal DefaultFlatAmount = 49m;

    public static ShippingQuote Quote(
        IReadOnlyList<ShippingZone> zones,
        ShippingDestination destination,
        decimal merchandiseSubtotalAfterDiscount,
        bool freeShippingCoupon = false)
    {
        if (merchandiseSubtotalAfterDiscount < 0) throw new ArgumentOutOfRangeException(nameof(merchandiseSubtotalAfterDiscount));

        if (freeShippingCoupon)
        {
            var matched = MatchZone(zones, destination) ?? FallbackZone();
            return new ShippingQuote(
                Amount: 0m,
                ZoneId: matched.Id,
                ZoneName: matched.Name,
                FreeShippingApplied: true,
                EstimatedDaysMin: matched.EstimatedDaysMin,
                EstimatedDaysMax: matched.EstimatedDaysMax,
                MatchedBy: string.IsNullOrEmpty(matched.Id) ? "fallback+coupon" : "zone+coupon");
        }

        var zone = MatchZone(zones, destination);
        if (zone is null)
        {
            var amount = merchandiseSubtotalAfterDiscount >= DefaultFreeAboveSubtotal ? 0m : DefaultFlatAmount;
            return DefaultFallbackQuote with
            {
                Amount = amount,
                FreeShippingApplied = amount == 0m,
                MatchedBy = "fallback"
            };
        }

        var rate = ComputeZoneAmount(zone, merchandiseSubtotalAfterDiscount);
        return new ShippingQuote(
            Amount: rate.Amount,
            ZoneId: zone.Id,
            ZoneName: zone.Name,
            FreeShippingApplied: rate.FreeShippingApplied,
            EstimatedDaysMin: zone.EstimatedDaysMin,
            EstimatedDaysMax: zone.EstimatedDaysMax,
            MatchedBy: "zone");
    }

    public static ShippingZone? MatchZone(IReadOnlyList<ShippingZone> zones, ShippingDestination destination)
    {
        var active = zones
            .Where(z => z.Active)
            .OrderByDescending(z => z.Priority)
            .ThenBy(z => z.Name, StringComparer.OrdinalIgnoreCase);

        foreach (var zone in active)
        {
            if (ZoneMatches(zone, destination)) return zone;
        }

        return null;
    }

    public static bool ZoneMatches(ShippingZone zone, ShippingDestination destination)
    {
        var pin = NormalizePincode(destination.Pincode);
        var state = (destination.State ?? "").Trim();

        if (zone.PincodePrefixes.Count > 0 || zone.PincodeRanges.Count > 0)
        {
            var prefixHit = zone.PincodePrefixes.Any(prefix =>
                !string.IsNullOrWhiteSpace(prefix) &&
                pin.StartsWith(prefix.Trim(), StringComparison.Ordinal));

            var rangeHit = false;
            if (long.TryParse(pin, out var pinNum))
            {
                rangeHit = zone.PincodeRanges.Any(r =>
                    pinNum >= r.FromInclusive && pinNum <= r.ToInclusive);
            }

            if (prefixHit || rangeHit) return true;
            // Explicit pincode targeting means state alone cannot match this zone.
            if (zone.States.Count == 0) return false;
        }

        if (zone.States.Count > 0)
        {
            return zone.States.Any(s =>
                string.Equals(s.Trim(), state, StringComparison.OrdinalIgnoreCase));
        }

        // Catch-all zone (no pincode/state filters) matches any destination.
        return zone.PincodePrefixes.Count == 0 && zone.PincodeRanges.Count == 0 && zone.States.Count == 0;
    }

    public static (decimal Amount, bool FreeShippingApplied) ComputeZoneAmount(ShippingZone zone, decimal merchandiseSubtotalAfterDiscount)
    {
        if (zone.FreeAboveSubtotal is > 0 && merchandiseSubtotalAfterDiscount >= zone.FreeAboveSubtotal.Value)
            return (0m, true);

        var amount = Math.Max(0m, decimal.Round(zone.FlatAmount, 2, MidpointRounding.AwayFromZero));
        return (amount, amount == 0m);
    }

    public static string NormalizePincode(string? pincode)
    {
        if (string.IsNullOrWhiteSpace(pincode)) return "";
        var digits = new string(pincode.Where(char.IsDigit).ToArray());
        return digits;
    }

    private static ShippingZone FallbackZone() => new(
        Id: "",
        Name: "Default India",
        Active: true,
        Priority: 0,
        FlatAmount: DefaultFlatAmount,
        FreeAboveSubtotal: DefaultFreeAboveSubtotal,
        EstimatedDaysMin: 4,
        EstimatedDaysMax: 6,
        PincodePrefixes: [],
        PincodeRanges: [],
        States: [],
        DefaultCarrier: "");
}

public sealed record ShippingDestination(string? Pincode, string? State);

public sealed record PincodeRange(long FromInclusive, long ToInclusive);

public sealed record ShippingZone(
    string Id,
    string Name,
    bool Active,
    int Priority,
    decimal FlatAmount,
    decimal? FreeAboveSubtotal,
    int EstimatedDaysMin,
    int EstimatedDaysMax,
    IReadOnlyList<string> PincodePrefixes,
    IReadOnlyList<PincodeRange> PincodeRanges,
    IReadOnlyList<string> States,
    string DefaultCarrier);

public sealed record ShippingQuote(
    decimal Amount,
    string ZoneId,
    string ZoneName,
    bool FreeShippingApplied,
    int EstimatedDaysMin,
    int EstimatedDaysMax,
    string MatchedBy);
