namespace Sunfara.Domain;

/// <summary>
/// Builds the Firestore vendors/{uid} document shape used by self-register
/// and admin create-account (AUTH-003). Doc id must equal Auth UID — never auto-id.
/// </summary>
public static class VendorProvisioning
{
    public const string AutoIdRejectedMessage =
        "Vendor documents must be UID-linked. Use POST /api/admin/vendors/create-account.";

    public static Dictionary<string, object> BuildVendorDocument(
        string name,
        string email,
        string phone,
        double commission = 10.0,
        string status = "pending")
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name is required.", nameof(name));
        if (string.IsNullOrWhiteSpace(email)) throw new ArgumentException("Email is required.", nameof(email));
        if (string.IsNullOrWhiteSpace(phone)) throw new ArgumentException("Phone is required.", nameof(phone));
        if (commission is < 0 or > 100) throw new ArgumentOutOfRangeException(nameof(commission), "Commission must be 0–100.");
        if (status is not ("pending" or "active" or "rejected" or "suspended"))
            throw new ArgumentException("Invalid vendor status.", nameof(status));

        return new Dictionary<string, object>
        {
            ["name"] = name.Trim(),
            ["email"] = email.Trim().ToLowerInvariant(),
            ["phone"] = phone.Trim(),
            ["status"] = status,
            ["commission"] = commission,
            ["products"] = 0,
            ["revenue"] = 0.0,
            ["rating"] = 0.0,
            ["reviews"] = 0,
            ["verified"] = false,
            ["kycStatus"] = status == "active" ? "completed" : "pending"
        };
    }

    public static bool IsAutoIdCreateForbidden(string collection) =>
        string.Equals(collection, "vendors", StringComparison.Ordinal);
}
