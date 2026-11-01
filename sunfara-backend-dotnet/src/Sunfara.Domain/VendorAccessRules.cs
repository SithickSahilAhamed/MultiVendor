namespace Sunfara.Domain;

/// <summary>
/// Pure AuthZ helpers for vendor mutating endpoints (AUTH-006).
/// Admins bypass Firestore status; vendors must be status == "active".
/// </summary>
public static class VendorAccessRules
{
    public static bool CanMutate(string? roleClaim, string? vendorStatus, bool isMutatingHttpMethod)
    {
        if (!isMutatingHttpMethod) return true;
        if (string.Equals(roleClaim, "admin", StringComparison.Ordinal)) return true;
        return string.Equals(vendorStatus, "active", StringComparison.Ordinal);
    }

    public static bool IsMutatingMethod(string httpMethod) =>
        httpMethod is "POST" or "PUT" or "PATCH" or "DELETE";
}
