namespace Sunfara.Domain;

/// <summary>
/// SETTLE-001 — payout rail decisioning for withdrawal approval.
/// Keeps wallet ledger in MarketplaceService; this module decides whether a
/// payout attempt succeeds/fails and what audit payload to store. Real
/// RazorpayX/bank calls stay behind IPayoutRail (Infrastructure).
/// </summary>
public static class SettlementRules
{
    public const string StatusPending = "pending";
    public const string StatusApproved = "approved";
    public const string StatusPayoutFailed = "payout_failed";
    public const string StatusPayoutInitiated = "payout_initiated";

    public const string AuditActionApproveWithdrawal = "approve_withdrawal";
    public const string AuditActionPayoutFailed = "withdrawal_payout_failed";
    public const string AuditActionWalletBlocked = "wallet_mutation_blocked";

    /// <summary>Generic admin CRUD must never silently edit these money collections.</summary>
    public static readonly HashSet<string> ProtectedMoneyCollections = new(StringComparer.OrdinalIgnoreCase)
    {
        "vendor_wallets", "commissions", "withdrawals", "transactions", "refunds", "platformRevenue"
    };

    public static bool IsGenericMoneyMutationForbidden(string collection) =>
        ProtectedMoneyCollections.Contains(collection);

    public static bool CanApprove(string? currentStatus) =>
        string.Equals(currentStatus, StatusPending, StringComparison.OrdinalIgnoreCase)
        || string.Equals(currentStatus, StatusPayoutFailed, StringComparison.OrdinalIgnoreCase);

    public static PayoutDecision Decide(PayoutAttemptResult attempt, decimal amount)
    {
        if (amount <= 0)
            return new PayoutDecision(false, StatusPayoutFailed, "Amount must be positive.", null);
        if (!attempt.Succeeded)
            return new PayoutDecision(false, StatusPayoutFailed, attempt.Error ?? "Payout provider rejected the transfer.", attempt.ProviderReference);
        return new PayoutDecision(true, StatusPayoutInitiated, null, attempt.ProviderReference);
    }
}

public sealed record PayoutAttemptResult(bool Succeeded, string? ProviderReference, string? Error);

public sealed record PayoutDecision(bool DebitWallet, string WithdrawalStatus, string? Error, string? ProviderReference);

/// <summary>PAY-005 typed admin money command kinds.</summary>
public static class AdminMoneyCommands
{
    public const string ApproveWithdrawal = "approve_withdrawal";
    public const string AdjustWallet = "adjust_wallet";

    public static bool IsKnown(string? command) =>
        string.Equals(command, ApproveWithdrawal, StringComparison.OrdinalIgnoreCase)
        || string.Equals(command, AdjustWallet, StringComparison.OrdinalIgnoreCase);
}
