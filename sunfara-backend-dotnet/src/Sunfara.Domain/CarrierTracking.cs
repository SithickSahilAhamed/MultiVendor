using System.Security.Cryptography;
using System.Text;

namespace Sunfara.Domain;

/// <summary>
/// Carrier webhook helpers: HMAC verification and status mapping onto the
/// existing vendor_orders state machine. Carrier-agnostic so one webhook
/// contract can front Delhivery / Shiprocket / mock trackers.
/// </summary>
public static class CarrierWebhookSecurity
{
    public static bool VerifyHmacSha256Hex(string secret, string rawBody, string providedSignatureHex)
    {
        if (string.IsNullOrEmpty(secret) || string.IsNullOrEmpty(providedSignatureHex)) return false;
        var expected = Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(rawBody ?? "")));
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var actualBytes = Encoding.UTF8.GetBytes(providedSignatureHex.Trim().ToLowerInvariant());
        return expectedBytes.Length == actualBytes.Length && CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    public static string SignHmacSha256Hex(string secret, string rawBody) =>
        Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(rawBody ?? "")));
}

public static class CarrierEventMapper
{
    /// <summary>
    /// Maps a carrier event status string to an optional vendor_orders status
    /// transition target. Returns null when the event only updates tracking
    /// metadata (ETA / location) without advancing fulfillment status.
    /// </summary>
    public static string? MapToOrderStatus(string? carrierStatus)
    {
        if (string.IsNullOrWhiteSpace(carrierStatus)) return null;
        var key = carrierStatus.Trim().ToLowerInvariant().Replace(' ', '_').Replace('-', '_');

        return key switch
        {
            "picked_up" or "pickup" or "dispatched" or "in_transit" or "out_for_delivery"
                or "shipped" or "ofd" => "shipped",
            "delivered" or "delivery_complete" or "rto_delivered" => "delivered",
            "rto" or "returned_to_origin" or "undelivered_returned" => "returned",
            "cancelled" or "canceled" => null, // do not auto-cancel paid orders via carrier
            _ => null
        };
    }

    public static bool ShouldApplyStatusTransition(string currentOrderStatus, string? mappedTarget)
    {
        if (string.IsNullOrWhiteSpace(mappedTarget)) return false;
        if (string.Equals(currentOrderStatus, mappedTarget, StringComparison.OrdinalIgnoreCase)) return false;
        // Only advance when the state machine allows it (vendors/admin path).
        return OrderStateMachine.CanTransition(currentOrderStatus, mappedTarget);
    }
}

public sealed record CarrierTrackingEvent(
    string? VendorOrderId,
    string? TrackingNumber,
    string? Carrier,
    string? Status,
    string? EstimatedDeliveryIso,
    string? Location,
    string? RawEventId);
