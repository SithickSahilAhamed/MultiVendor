using Microsoft.Extensions.Logging;
using Sunfara.Domain;

namespace Sunfara.Infrastructure;

/// <summary>
/// NOTIF-001 default sender — logs outbound channel attempts.
/// Staging can point to real providers without changing MarketplaceService.
/// </summary>
public sealed class LoggingNotificationChannelSender(ILogger<LoggingNotificationChannelSender> logger) : INotificationChannelSender
{
    public Task SendAsync(NotificationChannel channel, NotificationDispatchPlan plan, CancellationToken ct = default)
    {
        logger.LogInformation(
            "NOTIF-001 fan-out {Channel} user={UserId} type={Type} title={Title}",
            channel, plan.UserId, plan.Type, plan.Title);
        return Task.CompletedTask;
    }
}

public sealed class RecordingNotificationChannelSender : INotificationChannelSender
{
    public List<(NotificationChannel Channel, NotificationDispatchPlan Plan)> Sent { get; } = [];

    public Task SendAsync(NotificationChannel channel, NotificationDispatchPlan plan, CancellationToken ct = default)
    {
        Sent.Add((channel, plan));
        return Task.CompletedTask;
    }
}
