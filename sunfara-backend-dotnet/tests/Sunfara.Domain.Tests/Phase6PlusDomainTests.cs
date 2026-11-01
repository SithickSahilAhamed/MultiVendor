using Sunfara.Domain;

namespace Sunfara.Domain.Tests;

public class SettlementRulesTests
{
    [Fact]
    public void Protected_money_collections_block_generic_crud()
    {
        Assert.True(SettlementRules.IsGenericMoneyMutationForbidden("withdrawals"));
        Assert.True(SettlementRules.IsGenericMoneyMutationForbidden("vendor_wallets"));
        Assert.False(SettlementRules.IsGenericMoneyMutationForbidden("products"));
    }

    [Fact]
    public void Payout_success_initiates_and_debits()
    {
        var decision = SettlementRules.Decide(new PayoutAttemptResult(true, "pout_123", null), 500m);
        Assert.True(decision.DebitWallet);
        Assert.Equal(SettlementRules.StatusPayoutInitiated, decision.WithdrawalStatus);
        Assert.Equal("pout_123", decision.ProviderReference);
    }

    [Fact]
    public void Payout_failure_does_not_debit()
    {
        var decision = SettlementRules.Decide(new PayoutAttemptResult(false, null, "insufficient_funds"), 500m);
        Assert.False(decision.DebitWallet);
        Assert.Equal(SettlementRules.StatusPayoutFailed, decision.WithdrawalStatus);
    }

    [Fact]
    public void Can_retry_failed_payout()
    {
        Assert.True(SettlementRules.CanApprove(SettlementRules.StatusPayoutFailed));
        Assert.False(SettlementRules.CanApprove(SettlementRules.StatusApproved));
    }
}

public class StockReservationTests
{
    [Fact]
    public void Concurrent_holds_cannot_oversell()
    {
        Assert.True(StockReservationRules.CanReserve(10, 0, 5));
        Assert.True(StockReservationRules.CanReserve(10, 5, 5));
        Assert.False(StockReservationRules.CanReserve(10, 6, 5));
        Assert.False(StockReservationRules.CanReserve(10, 0, 0));
    }

    [Fact]
    public void Ttl_expiry_detection()
    {
        var now = DateTimeOffset.Parse("2026-11-01T10:00:00Z");
        var expires = StockReservationRules.ExpiresAt(now, TimeSpan.FromMinutes(30));
        Assert.False(StockReservationRules.IsExpired(expires, now.AddMinutes(29)));
        Assert.True(StockReservationRules.IsExpired(expires, now.AddMinutes(30)));
        Assert.Equal(StockReservationRules.StatusExpired, StockReservationRules.ReleaseReason(expired: true));
    }

    [Theory]
    [InlineData("1", true)]
    [InlineData("true", true)]
    [InlineData("0", false)]
    [InlineData(null, false)]
    public void Feature_flag_parsing(string? flag, bool expected) =>
        Assert.Equal(expected, StockReservationRules.IsEnabled(flag));
}

public class ProductVariantTests
{
    [Fact]
    public void Normalize_adds_synthetic_default_when_empty()
    {
        var variants = ProductVariantRules.Normalize(null, 199m, 12);
        Assert.Single(variants);
        Assert.Equal(ProductVariantRules.DefaultVariantId, variants[0].Id);
        Assert.True(variants[0].IsSynthetic);
    }

    [Fact]
    public void Selection_validates_stock_per_variant()
    {
        var variants = new[]
        {
            new ProductVariant("sm", "Small", "SKU-S", 100m, 2),
            new ProductVariant("lg", "Large", "SKU-L", 120m, 0)
        };
        Assert.True(ProductVariantRules.TryValidateSelection(variants, "sm", 2, out _));
        Assert.False(ProductVariantRules.TryValidateSelection(variants, "lg", 1, out var err));
        Assert.Contains("Insufficient", err);
    }
}

public class CmsRulesTests
{
    [Fact]
    public void Normalize_slugifies_and_defaults_draft()
    {
        var doc = CmsRules.Normalize("posts", "Hello World!", null, "body", null);
        Assert.Equal("hello-world", doc.Slug);
        Assert.Equal(CmsRules.StatusDraft, doc.Status);
    }

    [Fact]
    public void Public_visibility_requires_published_and_due()
    {
        var now = DateTimeOffset.Parse("2026-11-01T12:00:00Z");
        Assert.False(CmsRules.IsPubliclyVisible("draft", null, now));
        Assert.True(CmsRules.IsPubliclyVisible("published", null, now));
        Assert.False(CmsRules.IsPubliclyVisible("published", now.AddHours(1), now));
    }
}

public class NotificationDispatchTests
{
    [Fact]
    public void Fan_out_only_for_externalizable_types_and_enabled_channels()
    {
        var prefs = new NotificationPrefs(true, false, true, "a@b.c", null, "token");
        var plan = NotificationDispatchRules.BuildPlan("u1", "order_shipped", "Shipped", "On the way", prefs);
        Assert.Equal(new[] { NotificationChannel.Email, NotificationChannel.Push }, plan.Channels);

        var skip = NotificationDispatchRules.BuildPlan("u1", "noise", "x", "y", prefs);
        Assert.Empty(skip.Channels);
    }
}

public class StaffRbacTests
{
    [Fact]
    public void Legacy_admin_gets_all_permissions()
    {
        var perms = StaffRbac.ParsePermissions("admin", null);
        Assert.Contains(StaffRbac.PermFinance, perms);
        Assert.Contains(StaffRbac.PermCatalog, perms);
        Assert.True(StaffRbac.CanAccessRoute(perms, "withdrawals"));
    }

    [Fact]
    public void Finance_only_cannot_moderate_catalog()
    {
        var perms = StaffRbac.ParsePermissions("staff", "finance");
        Assert.True(StaffRbac.CanAccessRoute(perms, "withdrawals"));
        Assert.False(StaffRbac.CanAccessRoute(perms, "products"));
        Assert.Equal(StaffRbac.PermCatalog, StaffRbac.RequiredPermissionForAdminCollection("products"));
        Assert.Equal(StaffRbac.PermFinance, StaffRbac.RequiredPermissionForAdminCollection("withdrawals"));
    }
}

public class LateParityScaffoldTests
{
    [Fact]
    public void Pos_session_scaffold_is_labeled_partial()
    {
        var session = PosRules.CreateSession("term-1", "staff-1");
        Assert.Equal(PosRules.StatusPartial, session.Status);
        Assert.False(PosRules.CanSellWithoutReservation(inventoryFoundationsReady: false));
        Assert.True(PosRules.CanSellWithoutReservation(inventoryFoundationsReady: true));
    }

    [Fact]
    public void Wholesale_tier_pricing()
    {
        var tiers = new[] { new WholesaleTier(10, 90m), new WholesaleTier(50, 80m) };
        Assert.Equal(100m, WholesaleRules.TierPrice(100m, 5, tiers));
        Assert.Equal(90m, WholesaleRules.TierPrice(100m, 10, tiers));
        Assert.Equal(80m, WholesaleRules.TierPrice(100m, 50, tiers));
    }

    [Fact]
    public void Auction_bid_rules()
    {
        var ends = DateTimeOffset.Parse("2026-11-01T18:00:00Z");
        var now = ends.AddMinutes(-10);
        Assert.True(AuctionRules.IsBidValid(110m, 100m, 10m, ends, now));
        Assert.False(AuctionRules.IsBidValid(105m, 100m, 10m, ends, now));
        Assert.False(AuctionRules.IsBidValid(200m, 100m, 10m, ends, ends));
    }
}
