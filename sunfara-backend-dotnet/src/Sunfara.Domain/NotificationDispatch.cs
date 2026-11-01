namespace Sunfara.Domain;

/// <summary>
/// NOTIF-001 — fan-out rules from in-app notifications to email/SMS/FCM.
/// Providers are mocked in tests; production wires real SDKs behind the same interface.
/// </summary>
public static class NotificationDispatchRules
{
    public static readonly HashSet<string> ExternalizableTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "new_order", "order_confirmed", "order_shipped", "order_delivered",
        "order_refunded", "withdrawal_approved", "low_stock", "payout_failed"
    };

    public static bool ShouldFanOut(string? type) =>
        !string.IsNullOrWhiteSpace(type) && ExternalizableTypes.Contains(type);

    public static IReadOnlyList<NotificationChannel> PreferredChannels(NotificationPrefs prefs)
    {
        var channels = new List<NotificationChannel>();
        if (prefs.EmailEnabled && !string.IsNullOrWhiteSpace(prefs.Email)) channels.Add(NotificationChannel.Email);
        if (prefs.SmsEnabled && !string.IsNullOrWhiteSpace(prefs.Phone)) channels.Add(NotificationChannel.Sms);
        if (prefs.PushEnabled && !string.IsNullOrWhiteSpace(prefs.FcmToken)) channels.Add(NotificationChannel.Push);
        return channels;
    }

    public static NotificationDispatchPlan BuildPlan(
        string userId,
        string type,
        string title,
        string message,
        NotificationPrefs prefs)
    {
        if (!ShouldFanOut(type))
            return new NotificationDispatchPlan(userId, type, title, message, Array.Empty<NotificationChannel>());
        return new NotificationDispatchPlan(userId, type, title, message, PreferredChannels(prefs));
    }
}

public enum NotificationChannel { Email, Sms, Push }

public sealed record NotificationPrefs(
    bool EmailEnabled,
    bool SmsEnabled,
    bool PushEnabled,
    string? Email,
    string? Phone,
    string? FcmToken);

public sealed record NotificationDispatchPlan(
    string UserId,
    string Type,
    string Title,
    string Message,
    IReadOnlyList<NotificationChannel> Channels);

public interface INotificationChannelSender
{
    Task SendAsync(NotificationChannel channel, NotificationDispatchPlan plan, CancellationToken ct = default);
}
