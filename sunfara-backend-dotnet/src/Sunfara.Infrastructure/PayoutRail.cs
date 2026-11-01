using Sunfara.Domain;

namespace Sunfara.Infrastructure;

/// <summary>
/// SETTLE-001 payout rail. Default implementation is a sandbox/stub that
/// succeeds unless PAYOUT_FORCE_FAIL=1. Swap for RazorpayX/bank without
/// changing MarketplaceService call sites.
/// </summary>
public interface IPayoutRail
{
    Task<PayoutAttemptResult> InitiateVendorPayoutAsync(string vendorId, string withdrawalId, decimal amount, CancellationToken ct = default);
}

public sealed class SandboxPayoutRail : IPayoutRail
{
    public Task<PayoutAttemptResult> InitiateVendorPayoutAsync(string vendorId, string withdrawalId, decimal amount, CancellationToken ct = default)
    {
        var forceFail = Environment.GetEnvironmentVariable("PAYOUT_FORCE_FAIL");
        if (string.Equals(forceFail, "1", StringComparison.OrdinalIgnoreCase)
            || string.Equals(forceFail, "true", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new PayoutAttemptResult(false, null, "Sandbox payout forced failure (PAYOUT_FORCE_FAIL)."));
        }

        var reference = $"sandbox_payout_{withdrawalId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
        return Task.FromResult(new PayoutAttemptResult(true, reference, null));
    }
}
