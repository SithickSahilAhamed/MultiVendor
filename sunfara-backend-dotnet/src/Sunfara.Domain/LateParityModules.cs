namespace Sunfara.Domain;

/// <summary>
/// Phase 8 — POS / wholesale / auction scaffolding (PARTIAL).
/// Full modules require INV-001 + SETTLE-001 + RBAC + SHIP foundations.
/// These types define stable contracts and feature flags so UI/API stubs
/// can ship without enabling live commerce paths.
/// </summary>
public static class LateParityFlags
{
    public const string PosEnabled = "POS_ENABLED";
    public const string WholesaleEnabled = "WHOLESALE_ENABLED";
    public const string AuctionEnabled = "AUCTION_ENABLED";

    public static bool IsOn(string? value) =>
        string.Equals(value, "1", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
}

public static class PosRules
{
    public const string ModuleId = "POS-001";
    public const string StatusPartial = "partial_scaffold";

    public static PosSessionDraft CreateSession(string terminalId, string cashierStaffId)
    {
        if (string.IsNullOrWhiteSpace(terminalId)) throw new ArgumentException("terminalId required");
        if (string.IsNullOrWhiteSpace(cashierStaffId)) throw new ArgumentException("cashierStaffId required");
        return new PosSessionDraft(Guid.NewGuid().ToString("N"), terminalId.Trim(), cashierStaffId.Trim(), StatusPartial, DateTimeOffset.UtcNow);
    }

    public static bool CanSellWithoutReservation(bool inventoryFoundationsReady) => inventoryFoundationsReady;
}

public sealed record PosSessionDraft(
    string SessionId,
    string TerminalId,
    string CashierStaffId,
    string Status,
    DateTimeOffset OpenedAt);

public static class WholesaleRules
{
    public const string ModuleId = "WS-001";
    public const string StatusPartial = "partial_scaffold";

    public static decimal TierPrice(decimal basePrice, int quantity, IReadOnlyList<WholesaleTier> tiers)
    {
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));
        if (basePrice < 0) throw new ArgumentOutOfRangeException(nameof(basePrice));
        var applicable = tiers.Where(t => quantity >= t.MinQty).OrderByDescending(t => t.MinQty).FirstOrDefault();
        return applicable?.UnitPrice ?? basePrice;
    }
}

public sealed record WholesaleTier(int MinQty, decimal UnitPrice);

public static class AuctionRules
{
    public const string ModuleId = "AUC-001";
    public const string StatusPartial = "partial_scaffold";

    public static bool IsBidValid(decimal bidAmount, decimal currentHigh, decimal minIncrement, DateTimeOffset endsAt, DateTimeOffset now)
    {
        if (now >= endsAt) return false;
        if (minIncrement <= 0) return false;
        return bidAmount >= currentHigh + minIncrement;
    }
}
