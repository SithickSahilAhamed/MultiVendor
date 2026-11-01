using System.Net.Http.Headers;
using Google.Api.Gax;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Sunfara.Infrastructure;

namespace Sunfara.Integration.Tests.Infrastructure;

public sealed class SunfaraApiFactory : WebApplicationFactory<Program>
{
    public const string KeySecret = "test_key_secret_fixture";
    public const string WebhookSecret = "whsec_fixture_phase4";
    public const string KeyId = "rzp_test_fixture";

    private readonly MockHttpMessageHandler _httpHandler = new();

    public MockHttpMessageHandler HttpHandler => _httpHandler;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // FirestoreDb registration below replaces Program's singleton so Testing
        // never resolves the production-guarded factory. Emulator presence is
        // enforced per-test via EmulatorGuard / EmulatorFact.
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Firebase:ProjectId"] = EmulatorGuard.ProjectId,
                ["RAZORPAY_KEY_ID"] = KeyId,
                ["RAZORPAY_KEY_SECRET"] = KeySecret,
                ["RAZORPAY_WEBHOOK_SECRET"] = WebhookSecret,
                ["AllowedOrigins:0"] = "http://localhost:8000",
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<FirestoreDb>();
            services.AddSingleton(_ => new FirestoreDbBuilder
            {
                ProjectId = EmulatorGuard.ProjectId,
                EmulatorDetection = EmulatorDetection.EmulatorOnly,
            }.Build());

            services.RemoveAll<IHttpClientFactory>();
            services.AddSingleton<IHttpClientFactory>(new FixedHttpClientFactory(_httpHandler));

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.Scheme;
                options.DefaultChallengeScheme = TestAuthHandler.Scheme;
            }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.Scheme, _ => { });
        });
    }

    public HttpClient CreateAuthedClient(string userId, string? role = null)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserHeader, userId);
        if (!string.IsNullOrWhiteSpace(role))
            client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, role);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return client;
    }

    public FirestoreCatalogStore CreateStore()
    {
        var db = Services.GetRequiredService<FirestoreDb>();
        return new FirestoreCatalogStore(db);
    }

    public MarketplaceService CreateMarketplace()
    {
        var scope = Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<MarketplaceService>();
    }
}

public sealed class FixedHttpClientFactory(HttpMessageHandler handler) : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
}

public sealed class MockHttpMessageHandler : HttpMessageHandler
{
    public Func<HttpRequestMessage, HttpResponseMessage>? Responder { get; set; }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (Responder is null)
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.NotImplemented)
            {
                Content = new StringContent("""{"error":"no mock responder"}""")
            });
        return Task.FromResult(Responder(request));
    }
}
