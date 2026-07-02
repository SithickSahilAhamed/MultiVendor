using Google.Cloud.Firestore;
using System.Text.Json;

namespace Sunfara.Infrastructure;

public sealed class FirestoreCatalogStore(FirestoreDb db)
{
    public async Task<IReadOnlyList<Dictionary<string, object>>> ListAsync(string collection, int limit = 100)
    {
        var snapshot = await db.Collection(collection).Limit(Math.Clamp(limit, 1, 500)).GetSnapshotAsync();
        return snapshot.Documents.Select(ToDocument).ToList();
    }

    public async Task<Dictionary<string, object>?> GetAsync(string collection, string id)
    {
        var snapshot = await db.Collection(collection).Document(id).GetSnapshotAsync();
        return snapshot.Exists ? ToDocument(snapshot) : null;
    }

    public async Task<string> AddAsync(string collection, Dictionary<string, object> data)
    {
        data = Normalize(data);
        data["createdAt"] = FieldValue.ServerTimestamp;
        data["updatedAt"] = FieldValue.ServerTimestamp;
        var reference = await db.Collection(collection).AddAsync(data);
        return reference.Id;
    }

    public async Task<bool> UpdateAsync(string collection, string id, Dictionary<string, object> data)
    {
        var reference = db.Collection(collection).Document(id);
        if (!(await reference.GetSnapshotAsync()).Exists) return false;
        data = Normalize(data); data["updatedAt"] = FieldValue.ServerTimestamp;
        await reference.SetAsync(data, SetOptions.MergeAll); return true;
    }

    public async Task<bool> DeleteAsync(string collection, string id)
    {
        var reference = db.Collection(collection).Document(id);
        if (!(await reference.GetSnapshotAsync()).Exists) return false;
        await reference.DeleteAsync(); return true;
    }

    public async Task<IReadOnlyList<Dictionary<string, object>>> WhereAsync(string collection, string field, object value, int limit = 100)
    {
        var snapshot = await db.Collection(collection).WhereEqualTo(field, value).Limit(Math.Clamp(limit, 1, 500)).GetSnapshotAsync();
        return snapshot.Documents.Select(ToDocument).ToList();
    }

    public async Task<IReadOnlyList<Dictionary<string, object>>> WhereArrayContainsAsync(string collection, string field, object value, int limit = 200)
    {
        var snapshot = await db.Collection(collection).WhereArrayContains(field, value).OrderByDescending("createdAt").Limit(Math.Clamp(limit, 1, 500)).GetSnapshotAsync();
        return snapshot.Documents.Select(ToDocument).ToList();
    }

    public FirestoreDb Database => db;

    private static Dictionary<string, object> Normalize(Dictionary<string, object> source) => source.ToDictionary(x => x.Key, x => NormalizeValue(x.Value));

    /* Converts a raw System.Text.Json.JsonElement (what ASP.NET Core model
       binding produces for any non-primitive value in a Dictionary<string,
       object> request body) into plain CLR types Firestore's serializer
       actually understands. Public because callers outside AddAsync/
       UpdateAsync - e.g. CheckoutAsync copying shippingAddress/couponCode
       straight from the request body into an order - need the same
       conversion or Firestore throws ArgumentException: "Unable to create
       converter for type System.Text.Json.JsonElement". */
    public static object NormalizeValue(object? value) => value switch
    {
        null => "",
        JsonElement e when e.ValueKind == JsonValueKind.Object => e.EnumerateObject().ToDictionary(x => x.Name, x => NormalizeValue(x.Value)),
        JsonElement e when e.ValueKind == JsonValueKind.Array => e.EnumerateArray().Select(x => NormalizeValue(x)).ToList(),
        JsonElement e when e.ValueKind == JsonValueKind.String => e.GetString() ?? "",
        JsonElement e when e.ValueKind == JsonValueKind.Number && e.TryGetInt64(out var n) => n,
        JsonElement e when e.ValueKind == JsonValueKind.Number => e.GetDouble(),
        JsonElement e when e.ValueKind is JsonValueKind.True or JsonValueKind.False => e.GetBoolean(),
        JsonElement => "",
        _ => value
    };

    /* Google.Cloud.Firestore.Timestamp has no public properties System.Text.Json's
       default reflection-based serializer can see, so every createdAt/updatedAt
       (and anything else stored via FieldValue.ServerTimestamp) was silently
       serializing as an empty object "{}" to every API response - no created/
       updated date ever actually reached the frontend, on any entity, all
       session. Recursively convert Timestamps (including ones nested inside
       arrays/maps, e.g. statusHistory entries) into DateTime, which serializes
       as a normal ISO date string. */
    private static Dictionary<string, object> ToDocument(DocumentSnapshot snapshot)
    {
        var result = snapshot.ToDictionary();
        result["id"] = snapshot.Id;
        return ConvertTimestamps(result);
    }

    private static Dictionary<string, object> ConvertTimestamps(Dictionary<string, object> source) =>
        source.ToDictionary(x => x.Key, x => ConvertTimestampValue(x.Value));

    private static object ConvertTimestampValue(object? value) => value switch
    {
        null => "",
        Timestamp ts => ts.ToDateTime(),
        Dictionary<string, object> dict => ConvertTimestamps(dict),
        List<object> list => list.Select(ConvertTimestampValue).ToList(),
        _ => value
    };
}
