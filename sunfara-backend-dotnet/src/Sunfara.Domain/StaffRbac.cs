namespace Sunfara.Domain;

/// <summary>
/// RBAC-001 — granular admin staff permissions beyond a single admin claim.
/// Tokens may carry claim "staffPerms" as comma-separated permissions, or
/// legacy role=admin which grants all permissions.
/// </summary>
public static class StaffRbac
{
    public const string ClaimRole = "role";
    public const string ClaimStaffPerms = "staffPerms";
    public const string RoleAdmin = "admin";

    public const string PermCatalog = "catalog";
    public const string PermFinance = "finance";
    public const string PermSupport = "support";
    public const string PermShipping = "shipping";
    public const string PermCms = "cms";
    public const string PermStaff = "staff";

    public static readonly string[] AllPermissions =
    [
        PermCatalog, PermFinance, PermSupport, PermShipping, PermCms, PermStaff
    ];

    public static IReadOnlySet<string> ParsePermissions(string? role, string? staffPermsCsv)
    {
        if (string.Equals(role, RoleAdmin, StringComparison.OrdinalIgnoreCase))
            return new HashSet<string>(AllPermissions, StringComparer.OrdinalIgnoreCase);

        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(staffPermsCsv)) return set;
        foreach (var part in staffPermsCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (AllPermissions.Contains(part, StringComparer.OrdinalIgnoreCase))
                set.Add(part.ToLowerInvariant());
        }
        return set;
    }

    public static bool HasPermission(IReadOnlySet<string> granted, string required) =>
        granted.Contains(required);

    public static string? RequiredPermissionForAdminCollection(string collection) => collection.ToLowerInvariant() switch
    {
        "products" or "categories" or "vendors" => PermCatalog,
        "commissions" or "withdrawals" or "transactions" or "refunds" or "settings" => PermFinance,
        "orders" or "vendor_orders" or "customers" or "returns" or "reviews" or "notifications" => PermSupport,
        "shipping_zones" or "shipments" => PermShipping,
        "banners" or "policies" or "posts" => PermCms,
        "staff" or "auditLogs" => PermStaff,
        _ => PermSupport
    };

    public static bool CanAccessRoute(IReadOnlySet<string> granted, string routeKey) => routeKey switch
    {
        "dashboard" => granted.Count > 0,
        "vendors" or "products" => HasPermission(granted, PermCatalog),
        "commissions" or "withdrawals" or "reports" => HasPermission(granted, PermFinance),
        "orders" or "customers" or "returns" => HasPermission(granted, PermSupport),
        "shipping" => HasPermission(granted, PermShipping),
        "cms" => HasPermission(granted, PermCms),
        "settings" => HasPermission(granted, PermStaff) || HasPermission(granted, PermFinance),
        _ => granted.Count > 0
    };
}
