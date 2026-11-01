using System.Text.Json;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Sunfara.Domain;
using Sunfara.Infrastructure;

// SeedDocument + CatalogSeedBuilder live in Sunfara.Domain for unit tests.

/* CAT-001 catalog seed — idempotent upsert of categories / vendors / products
   from sunfara/data JSON. Never deletes collections. Requires a slug→UID map
   so vendor docs use Firebase Auth UIDs (AUTH-003). Default is dry-run. */

static int Fail(string message)
{
    Console.Error.WriteLine("ERROR: " + message);
    return 1;
}

var argsList = args.ToList();
var wantsApply = argsList.RemoveAll(a => a is "--apply") > 0;
var wantsDryRun = argsList.RemoveAll(a => a is "--dry-run") > 0;
// Default dry-run; --apply writes; --dry-run wins if both are passed.
var apply = wantsApply && !wantsDryRun;

string? dataDir = null;
string? vendorMapPath = null;
string? projectId = Environment.GetEnvironmentVariable("FIREBASE_PROJECT_ID") ?? "sunfara-500b0";

for (var i = 0; i < argsList.Count; i++)
{
    switch (argsList[i])
    {
        case "--data-dir" when i + 1 < argsList.Count: dataDir = argsList[++i]; break;
        case "--vendor-map" when i + 1 < argsList.Count: vendorMapPath = argsList[++i]; break;
        case "--project-id" when i + 1 < argsList.Count: projectId = argsList[++i]; break;
        case "--help" or "-h":
            PrintHelp();
            return 0;
        default:
            return Fail($"Unknown argument: {argsList[i]}. Use --help.");
    }
}

dataDir ??= Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "..", "sunfara", "data"));
if (!Directory.Exists(dataDir))
    return Fail($"Data directory not found: {dataDir}");

if (string.IsNullOrWhiteSpace(vendorMapPath))
    return Fail("Missing --vendor-map path (JSON object: vendorSlug → Firebase Auth UID).");

if (!File.Exists(vendorMapPath))
    return Fail($"Vendor map not found: {vendorMapPath}");

JsonDocument categoriesJson, vendorsJson, productsJson, mapJson;
try
{
    categoriesJson = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(dataDir, "categories.json")));
    vendorsJson = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(dataDir, "vendors.json")));
    productsJson = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(dataDir, "products.json")));
    mapJson = JsonDocument.Parse(await File.ReadAllTextAsync(vendorMapPath));
}
catch (Exception ex)
{
    return Fail("Failed to read JSON inputs: " + ex.Message);
}

Dictionary<string, string> vendorMap;
IReadOnlyList<SeedDocument> categoryDocs, vendorDocs, productDocs;
try
{
    vendorMap = CatalogSeedBuilder.ParseVendorMap(mapJson.RootElement);
    categoryDocs = CatalogSeedBuilder.BuildCategories(categoriesJson.RootElement);
    vendorDocs = CatalogSeedBuilder.BuildVendors(vendorsJson.RootElement, vendorMap);
    productDocs = CatalogSeedBuilder.BuildProducts(productsJson.RootElement, vendorMap.Values.Distinct().ToList());
}
catch (Exception ex)
{
    return Fail(ex.Message);
}

Console.WriteLine($"CAT-001 CatalogSeed  project={projectId}  mode={(apply ? "APPLY (merge upsert)" : "DRY-RUN")}");
Console.WriteLine($"  data-dir: {dataDir}");
Console.WriteLine($"  categories: {categoryDocs.Count}");
Console.WriteLine($"  vendors:    {vendorDocs.Count} (UID-linked)");
Console.WriteLine($"  products:   {productDocs.Count} (status=active)");
Console.WriteLine("  policy: merge upsert by document id — never deletes existing docs/collections");

if (!apply)
{
    foreach (var doc in categoryDocs.Take(3))
        Console.WriteLine($"  [dry-run] categories/{doc.Id}");
    foreach (var doc in vendorDocs)
        Console.WriteLine($"  [dry-run] vendors/{doc.Id} (slug={doc.Data.GetValueOrDefault("slug")})");
    foreach (var doc in productDocs.Take(5))
        Console.WriteLine($"  [dry-run] products/{doc.Id} vendorId={doc.Data.GetValueOrDefault("vendorId")}");
    if (productDocs.Count > 5) Console.WriteLine($"  [dry-run] … {productDocs.Count - 5} more products");
    Console.WriteLine("Dry-run complete. Re-run with --apply to write (requires Firebase credentials).");
    return 0;
}

try
{
    EnsureFirebaseApp(projectId);
    var db = new FirestoreDbBuilder { ProjectId = projectId }.Build();
    var store = new FirestoreCatalogStore(db);

    foreach (var doc in categoryDocs)
    {
        await store.UpsertAsync(doc.Collection, doc.Id, doc.Data);
        Console.WriteLine($"  upserted {doc.Collection}/{doc.Id}");
    }
    foreach (var doc in vendorDocs)
    {
        await store.UpsertAsync(doc.Collection, doc.Id, doc.Data);
        Console.WriteLine($"  upserted {doc.Collection}/{doc.Id}");
    }
    foreach (var doc in productDocs)
    {
        await store.UpsertAsync(doc.Collection, doc.Id, doc.Data);
        Console.WriteLine($"  upserted {doc.Collection}/{doc.Id}");
    }

    Console.WriteLine("Apply complete. Verify: GET /api/products and /api/categories (active products should be non-empty).");
    return 0;
}
catch (Exception ex)
{
    return Fail("Firestore apply failed: " + ex.Message);
}

static void EnsureFirebaseApp(string projectId)
{
    if (FirebaseApp.DefaultInstance is not null) return;

    var inline = Environment.GetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!string.IsNullOrWhiteSpace(inline))
    {
        FirebaseApp.Create(new AppOptions
        {
            Credential = GoogleCredential.FromJson(inline),
            ProjectId = projectId
        });
        return;
    }

    var path = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");
    if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
    {
        FirebaseApp.Create(new AppOptions
        {
            Credential = GoogleCredential.FromFile(path),
            ProjectId = projectId
        });
        return;
    }

    // ADC / emulator / workload identity
    FirebaseApp.Create(new AppOptions
    {
        Credential = GoogleCredential.GetApplicationDefault(),
        ProjectId = projectId
    });
}

static void PrintHelp()
{
    Console.WriteLine("""
        Sunfara.CatalogSeed (CAT-001)

          --data-dir PATH       Folder with categories.json, vendors.json, products.json
                                (default: repo sunfara/data relative to tool)
          --vendor-map PATH     Required JSON: { "haaniya": "<firebaseAuthUid>", ... }
          --project-id ID       Firebase/Firestore project (default FIREBASE_PROJECT_ID or sunfara-500b0)
          --dry-run             Plan only (default when --apply omitted)
          --apply               Merge-upsert into Firestore (never deletes)

        Credentials (apply only): FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.
        Do not commit secret values. Prefer staging before production.
        """);
}
