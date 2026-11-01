namespace Sunfara.Domain;

/// <summary>
/// INV-001 — soft stock holds for unpaid online orders.
/// Domain-only rules: TTL, oversell guard, release/confirm transitions.
/// Persistence lives in MarketplaceService under feature flag STOCK_RESERVATIONS_ENABLED.
/// </summary>
public static class StockReservationRules
{
    public const string StatusHeld = "held";
    public const string StatusConfirmed = "confirmed";
    public const string StatusReleased = "released";
    public const string StatusExpired = "expired";

    public static readonly TimeSpan DefaultTtl = TimeSpan.FromMinutes(30);

    public static bool IsEnabled(string? flagValue) =>
        string.Equals(flagValue, "1", StringComparison.OrdinalIgnoreCase)
        || string.Equals(flagValue, "true", StringComparison.OrdinalIgnoreCase)
        || string.Equals(flagValue, "yes", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Concurrent checkouts cannot reserve more than available stock.
    /// available = onHand - alreadyHeld (non-expired holds).
    /// </summary>
    public static bool CanReserve(long onHand, long alreadyHeld, int quantity)
    {
        if (quantity <= 0) return false;
        if (onHand < 0 || alreadyHeld < 0) return false;
        return onHand - alreadyHeld >= quantity;
    }

    public static DateTimeOffset ExpiresAt(DateTimeOffset now, TimeSpan? ttl = null) =>
        now.Add(ttl ?? DefaultTtl);

    public static bool IsExpired(DateTimeOffset expiresAt, DateTimeOffset now) => now >= expiresAt;

    public static string ReleaseReason(bool expired) => expired ? StatusExpired : StatusReleased;

    public static bool CanConfirm(string? status) =>
        string.Equals(status, StatusHeld, StringComparison.OrdinalIgnoreCase);

    public static bool CanRelease(string? status) =>
        string.Equals(status, StatusHeld, StringComparison.OrdinalIgnoreCase);
}

public sealed record StockHoldRequest(string ProductId, string? VariantId, int Quantity);

public sealed record StockHoldPlan(
    string ProductId,
    string? VariantId,
    int Quantity,
    long OnHand,
    long AlreadyHeld,
    bool Allowed);
