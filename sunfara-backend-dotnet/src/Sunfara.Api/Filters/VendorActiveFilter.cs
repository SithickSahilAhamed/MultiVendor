using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Sunfara.Domain;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Filters;

/// <summary>
/// AUTH-006: on Vendor-policy mutating endpoints, require Firestore vendors.status == active
/// (admin role claim bypasses). Read endpoints stay available so pending vendors can view profile.
/// </summary>
public sealed class VendorActiveFilter(MarketplaceService marketplace) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpMethod = context.HttpContext.Request.Method;
        if (!VendorAccessRules.IsMutatingMethod(httpMethod))
        {
            await next();
            return;
        }

        var requiresVendor = context.ActionDescriptor.EndpointMetadata
            .OfType<AuthorizeAttribute>()
            .Any(a => string.Equals(a.Policy, "Vendor", StringComparison.Ordinal));
        if (!requiresVendor)
        {
            await next();
            return;
        }

        var user = context.HttpContext.User;
        var role = user.FindFirst("role")?.Value;
        if (string.Equals(role, "admin", StringComparison.Ordinal))
        {
            await next();
            return;
        }

        var uid = user.FindFirst("user_id")?.Value ?? user.FindFirst("sub")?.Value ?? "";
        var active = !string.IsNullOrEmpty(uid) && await marketplace.IsVendorActiveAsync(uid);
        if (!VendorAccessRules.CanMutate(role, active ? "active" : "suspended", isMutatingHttpMethod: true))
        {
            context.Result = new ObjectResult(new { error = "Your vendor account is not active. Contact support or wait for approval." })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        await next();
    }
}
