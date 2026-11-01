using Sunfara.Domain;

namespace Sunfara.Domain.Tests;

public sealed class IdentityAuthzTests
{
    [Theory]
    [InlineData("admin", "pending", true, true)]
    [InlineData("admin", "suspended", true, true)]
    [InlineData("vendor", "active", true, true)]
    [InlineData("vendor", "pending", true, false)]
    [InlineData("vendor", "suspended", true, false)]
    [InlineData("vendor", "rejected", true, false)]
    [InlineData("vendor", "pending", false, true)]
    public void Vendor_mutate_requires_active_unless_admin(string role, string status, bool mutating, bool expected)
        => Assert.Equal(expected, VendorAccessRules.CanMutate(role, status, mutating));

    [Fact]
    public void Vendor_provisioning_builds_uid_ready_doc()
    {
        var doc = VendorProvisioning.BuildVendorDocument("Haaniya", "Info@Haaniya.com", "+9198", 8, "pending");
        Assert.Equal("info@haaniya.com", doc["email"]);
        Assert.Equal("Haaniya", doc["name"]);
        Assert.Equal("pending", doc["status"]);
        Assert.Equal(8.0, doc["commission"]);
        Assert.Equal("pending", doc["kycStatus"]);
    }

    [Fact]
    public void Vendor_auto_id_create_forbidden_only_for_vendors_collection()
    {
        Assert.True(VendorProvisioning.IsAutoIdCreateForbidden("vendors"));
        Assert.False(VendorProvisioning.IsAutoIdCreateForbidden("products"));
        Assert.Contains("create-account", VendorProvisioning.AutoIdRejectedMessage);
    }

    [Fact]
    public void Customer_upsert_uses_token_uid_only()
    {
        Assert.True(CustomerProfile.MayUpsert("uid-a", null));
        Assert.True(CustomerProfile.MayUpsert("uid-a", "uid-a"));
        Assert.False(CustomerProfile.MayUpsert("uid-a", "uid-b"));
        Assert.False(CustomerProfile.MayUpsert("", "uid-a"));

        var payload = CustomerProfile.BuildUpsert("uid-a", "Priya", "Priya@Email.com", "9000000001");
        Assert.Equal("uid-a", payload["uid"]);
        Assert.Equal("priya@email.com", payload["email"]);
        Assert.Equal("Priya", payload["name"]);
    }

    [Fact]
    public void Customer_upsert_rejects_empty_uid()
        => Assert.Throws<ArgumentException>(() => CustomerProfile.BuildUpsert("", "x", "y@z.com", null));
}
