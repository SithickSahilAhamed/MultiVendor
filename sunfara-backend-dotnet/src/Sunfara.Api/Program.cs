using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Sunfara.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
var projectId = builder.Configuration["Firebase:ProjectId"] ?? Environment.GetEnvironmentVariable("FIREBASE_PROJECT_ID") ?? "sunfara-500b0";

// Load service account key
var credPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "serviceAccountKey.json");
var credFullPath = Path.GetFullPath(credPath);
if (!File.Exists(credFullPath))
    credFullPath = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS") ?? "";

if (File.Exists(credFullPath))
{
    Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credFullPath);
    if (FirebaseApp.DefaultInstance == null)
        FirebaseApp.Create(new AppOptions { Credential = GoogleCredential.FromFile(credFullPath) });
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton(_ => FirestoreDb.Create(projectId));
builder.Services.AddScoped<FirestoreCatalogStore>();
builder.Services.AddScoped<MarketplaceService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.Authority = $"https://securetoken.google.com/{projectId}";
    options.TokenValidationParameters = new TokenValidationParameters { ValidateIssuer = true, ValidIssuer = $"https://securetoken.google.com/{projectId}", ValidateAudience = true, ValidAudience = projectId, ValidateLifetime = true };
});
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", p => p.RequireClaim("role", "admin"));
    options.AddPolicy("Vendor", p => p.RequireClaim("role", "vendor", "admin"));
});
builder.Services.AddCors(o => o.AddPolicy("Sunfara", p => p.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? ["http://localhost:8000"]).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseSwagger(); app.UseSwaggerUI(); app.UseCors("Sunfara"); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
app.Run();
