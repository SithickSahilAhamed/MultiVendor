using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Sunfara.Integration.Tests.Infrastructure;

public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public new const string Scheme = "TestAuth";
    public const string UserHeader = "X-Test-User-Id";
    public const string RoleHeader = "X-Test-Role";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(UserHeader, out var userValues) || string.IsNullOrWhiteSpace(userValues))
            return Task.FromResult(AuthenticateResult.Fail("Missing test user."));

        var userId = userValues.ToString();
        var role = Request.Headers.TryGetValue(RoleHeader, out var roleValues) ? roleValues.ToString() : "";

        var claims = new List<Claim>
        {
            new("sub", userId),
            new("user_id", userId),
        };
        if (!string.IsNullOrWhiteSpace(role))
            claims.Add(new Claim("role", role));

        var identity = new ClaimsIdentity(claims, Scheme);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
