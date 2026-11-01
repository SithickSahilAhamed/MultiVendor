namespace Sunfara.Domain;

/// <summary>
/// Builds the merge payload for customers/{uid} upsert (AUTH-004).
/// Caller must use the authenticated Firebase UID as the document id.
/// </summary>
public static class CustomerProfile
{
    public static Dictionary<string, object> BuildUpsert(
        string uid,
        string? name,
        string? email,
        string? phone)
    {
        if (string.IsNullOrWhiteSpace(uid))
            throw new ArgumentException("Customer uid is required.", nameof(uid));

        var data = new Dictionary<string, object>();
        if (!string.IsNullOrWhiteSpace(name)) data["name"] = name.Trim();
        if (!string.IsNullOrWhiteSpace(email)) data["email"] = email.Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(phone)) data["phone"] = phone.Trim();
        data["uid"] = uid;
        return data;
    }

    /// <summary>
    /// Token subject must equal the path/body uid — never allow upserting another user.
    /// </summary>
    public static bool MayUpsert(string tokenUid, string? requestedUid) =>
        !string.IsNullOrWhiteSpace(tokenUid) &&
        (string.IsNullOrWhiteSpace(requestedUid) ||
         string.Equals(tokenUid, requestedUid, StringComparison.Ordinal));
}
