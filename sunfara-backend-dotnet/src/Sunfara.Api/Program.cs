using System.Threading.RateLimiting;
using FirebaseAdmin;
using Google.Api.Gax;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Sunfara.Api.Filters;
using Sunfara.Domain;
using Sunfara.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
var projectId = builder.Configuration["Firebase:ProjectId"] ?? Environment.GetEnvironmentVariable("FIREBASE_PROJECT_ID") ?? "sunfara-500b0";
var isTesting = builder.Environment.IsEnvironment("Testing");
var emulatorHost = Environment.GetEnvironmentVariable("FIRESTORE_EMULATOR_HOST");

// Load service account credentials: prefer an inline JSON env var (works in
// containers, where the key file is intentionally not part of the image),
// falling back to a local file for dev. Testing / emulator runs skip this —
// never require a real service account for CI.
GoogleCredential? credential = null;
if (!isTesting && string.IsNullOrEmpty(emulatorHost))
{
    var credJson = Environment.GetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!string.IsNullOrEmpty(credJson))
    {
        credential = GoogleCredential.FromJson(credJson);
    }
    else
    {
        var credPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "serviceAccountKey.json");
        var credFullPath = Path.GetFullPath(credPath);
        if (!File.Exists(credFullPath))
            credFullPath = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS") ?? "";
        if (File.Exists(credFullPath))
            credential = GoogleCredential.FromFile(credFullPath);
    }

    if (credential != null && FirebaseApp.DefaultInstance == null)
        FirebaseApp.Create(new AppOptions { Credential = credential });
}

builder.Services.AddControllers(options => options.Filters.AddService<VendorActiveFilter>());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddSingleton(_ =>
{
    // Safety: Testing must never silently talk to production Firestore.
    // Prefer an explicit demo project id under the emulator; refuse the live
    // project id unless ALLOW_PROD_PROJECT_IN_EMULATOR=1 (ops escape hatch).
    var firestoreProjectId = projectId;
    if (!string.IsNullOrEmpty(emulatorHost) || isTesting)
    {
        if (string.IsNullOrEmpty(emulatorHost))
            throw new InvalidOperationException("Testing requires FIRESTORE_EMULATOR_HOST so tests never hit production Firestore.");
        if (firestoreProjectId.Equals("sunfara-500b0", StringComparison.Ordinal)
            && Environment.GetEnvironmentVariable("ALLOW_PROD_PROJECT_IN_EMULATOR") != "1")
        {
            firestoreProjectId = "demo-sunfara-test";
        }
    }

    var firestoreBuilder = new FirestoreDbBuilder { ProjectId = firestoreProjectId };
    if (!string.IsNullOrEmpty(emulatorHost) || isTesting)
        firestoreBuilder.EmulatorDetection = EmulatorDetection.EmulatorOnly;
    else if (credential != null)
        firestoreBuilder.Credential = credential;
    return firestoreBuilder.Build();
});
builder.Services.AddScoped<FirestoreCatalogStore>();
builder.Services.AddScoped<MarketplaceService>();
builder.Services.AddScoped<VendorActiveFilter>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    // Without this, the default JWT handler remaps short claim names (e.g. "sub",
    // "role") to long legacy XML-namespace URIs, so User.FindFirst("sub") and
    // RequireClaim("role", ...) never match anything in the token - every
    // [Authorize] endpoint fails with 403 regardless of a valid token/claim.
    options.MapInboundClaims = false;
    options.Authority = $"https://securetoken.google.com/{projectId}";
    options.TokenValidationParameters = new TokenValidationParameters { ValidateIssuer = true, ValidIssuer = $"https://securetoken.google.com/{projectId}", ValidateAudience = true, ValidAudience = projectId, ValidateLifetime = true };
});
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", p => p.RequireClaim("role", "admin"));
    options.AddPolicy("Vendor", p => p.RequireClaim("role", "vendor", "admin"));
});
builder.Services.AddCors(o => o.AddPolicy("Sunfara", p => p.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? ["http://localhost:8000"]).AllowAnyHeader().AllowAnyMethod()));

// Unauthenticated, money/account-affecting endpoints are the ones worth
// throttling per-IP: nothing here needed rate limiting before because
// nothing existed at all - checkout spam, registration spam, and login
// brute-forcing were all completely unthrottled at the app layer.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddFixedWindowLimiter("auth", opt => { opt.PermitLimit = 10; opt.Window = TimeSpan.FromMinutes(1); opt.QueueLimit = 0; });
    o.AddFixedWindowLimiter("checkout", opt => { opt.PermitLimit = 20; opt.Window = TimeSpan.FromMinutes(1); opt.QueueLimit = 0; });
});

var app = builder.Build();

/* PAY-002: Production fails closed without RAZORPAY_WEBHOOK_SECRET so tab-close
   captures cannot silently leave orders unpaid with no server-side settle path. */
var webhookSecret = builder.Configuration["RAZORPAY_WEBHOOK_SECRET"]
    ?? Environment.GetEnvironmentVariable("RAZORPAY_WEBHOOK_SECRET");
RazorpayWebhookStartup.EnsureConfigured(webhookSecret, app.Environment.IsProduction());

// Swagger exposes the full API surface (every route, every request/response
// shape) to anyone who finds the URL - fine for local dev, not something a
// production API needs to hand an attacker for free.
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

// SEC-002: baseline security headers on all API responses. CSP lives on the
// static hosts (firebase.json / netlify.toml) — JSON APIs do not need a
// document CSP, but nosniff / frame / referrer baselines reduce abuse of
// mis-interpreted responses and clickjacking of any accidental HTML.
app.Use(async (ctx, next) =>
{
    ctx.Response.OnStarting(() =>
    {
        var headers = ctx.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
        headers["Cross-Origin-Resource-Policy"] = "cross-origin";
        return Task.CompletedTask;
    });
    await next();
});

app.UseCors("Sunfara"); app.UseRateLimiter(); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
app.MapGet("/", () => Results.Ok(new { status = "ok", service = "Sunfara API", docs = "/swagger" }));
app.MapGet("/api/health", (IHostEnvironment env, IConfiguration config) =>
{
    var secret = config["RAZORPAY_WEBHOOK_SECRET"] ?? Environment.GetEnvironmentVariable("RAZORPAY_WEBHOOK_SECRET");
    var webhookReady = RazorpayWebhookStartup.IsWebhookUsable(secret);
    if (env.IsProduction() && !webhookReady)
        return Results.Json(new { status = "unhealthy", service = "Sunfara C# Firebase Commerce API", webhookConfigured = false, error = RazorpayWebhookStartup.MissingSecretMessage }, statusCode: 503);
    return Results.Ok(new { status = "OK", service = "Sunfara C# Firebase Commerce API", webhookConfigured = webhookReady, environment = env.EnvironmentName });
});
app.Run();

// Expose entry point for WebApplicationFactory integration tests.
public partial class Program { }
