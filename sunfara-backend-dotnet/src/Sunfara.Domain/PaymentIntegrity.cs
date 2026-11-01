using System.Security.Cryptography;
using System.Text;

namespace Sunfara.Domain;

/// <summary>
/// Checkout totals policy for PAY-003: no silent COD surcharge.
/// Server and UI must advertise the same total (fee = 0 unless explicitly enabled later).
/// </summary>
public static class CheckoutPricing
{
    /// <summary>COD surcharge in rupees. Phase 3 keeps this at 0 so UI cannot claim ₹40 the server never charges.</summary>
    public const decimal CodFeeRupees = 0m;

    public static decimal OrderTotal(decimal subtotal, decimal discountAmount, string? paymentMethod)
    {
        if (subtotal < 0 || discountAmount < 0) throw new ArgumentOutOfRangeException();
        var afterDiscount = Math.Max(0, subtotal - discountAmount);
        var fee = IsCashOnDelivery(paymentMethod) ? CodFeeRupees : 0m;
        return afterDiscount + fee;
    }

    public static bool IsCashOnDelivery(string? paymentMethod) =>
        string.Equals(paymentMethod?.Trim(), "Cash on Delivery", StringComparison.OrdinalIgnoreCase);

    public static bool IsOnlinePaymentMethod(string? paymentMethod) =>
        !string.IsNullOrWhiteSpace(paymentMethod) && !IsCashOnDelivery(paymentMethod);
}

/// <summary>HMAC helpers for Razorpay verify + webhook (fixture-testable without live keys).</summary>
public static class RazorpayHmac
{
    public static string HexSha256(string secret, string payload)
    {
        ArgumentException.ThrowIfNullOrEmpty(secret);
        ArgumentNullException.ThrowIfNull(payload);
        return Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(payload)));
    }

    public static bool FixedTimeEqualsHex(string expectedHex, string actualHex)
    {
        if (string.IsNullOrEmpty(expectedHex) || string.IsNullOrEmpty(actualHex)) return false;
        var expectedBytes = Encoding.UTF8.GetBytes(expectedHex.ToLowerInvariant());
        var actualBytes = Encoding.UTF8.GetBytes(actualHex.ToLowerInvariant());
        return expectedBytes.Length == actualBytes.Length && CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    public static string PaymentVerifySignature(string keySecret, string razorpayOrderId, string razorpayPaymentId) =>
        HexSha256(keySecret, $"{razorpayOrderId}|{razorpayPaymentId}");

    public static string WebhookSignature(string webhookSecret, string rawBody) =>
        HexSha256(webhookSecret, rawBody);
}

/// <summary>PAY-002: Production must not start without a webhook secret.</summary>
public static class RazorpayWebhookStartup
{
    public const string MissingSecretMessage =
        "RAZORPAY_WEBHOOK_SECRET is required when ASPNETCORE_ENVIRONMENT=Production. Set the Railway env var and register the webhook URL in the Razorpay dashboard.";

    public static void EnsureConfigured(string? webhookSecret, bool isProduction)
    {
        if (isProduction && string.IsNullOrWhiteSpace(webhookSecret))
            throw new InvalidOperationException(MissingSecretMessage);
    }

    public static bool IsWebhookUsable(string? webhookSecret) => !string.IsNullOrWhiteSpace(webhookSecret);
}

public sealed record OrderPaymentSnapshot(
    string OrderId,
    string PaymentStatus,
    string PaymentMethod,
    string? RazorpayOrderId,
    string? RazorpayPaymentId,
    DateTimeOffset CreatedAt,
    decimal TotalAmount);

public sealed record RazorpayCapturedPayment(
    string RazorpayPaymentId,
    string RazorpayOrderId,
    long AmountPaise,
    DateTimeOffset CapturedAt);

public sealed record ReconciliationMismatch(
    string Kind,
    string OrderId,
    string? RazorpayOrderId,
    string? RazorpayPaymentId,
    string Detail);

/// <summary>PAY-004: compare Firestore order payment state vs Razorpay captures (and list unpaid online).</summary>
public static class PaymentReconciliation
{
    public const string KindCapturedButUnpaid = "captured_but_unpaid";
    public const string KindUnpaidOnline = "unpaid_online";
    public const string KindPaidMissingCapture = "paid_missing_capture";
    public const string KindAmountMismatch = "amount_mismatch";

    public static IReadOnlyList<ReconciliationMismatch> FindMismatches(
        IEnumerable<OrderPaymentSnapshot> orders,
        IEnumerable<RazorpayCapturedPayment> captures,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null)
    {
        var orderList = orders
            .Where(o => (!from.HasValue || o.CreatedAt >= from) && (!to.HasValue || o.CreatedAt <= to))
            .ToList();
        var captureList = captures.ToList();
        var byRazorpayOrder = captureList
            .Where(c => !string.IsNullOrWhiteSpace(c.RazorpayOrderId))
            .GroupBy(c => c.RazorpayOrderId, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);

        var mismatches = new List<ReconciliationMismatch>();

        foreach (var order in orderList)
        {
            var status = order.PaymentStatus?.Trim().ToLowerInvariant() ?? "";
            var isCod = CheckoutPricing.IsCashOnDelivery(order.PaymentMethod);
            var hasRpOrder = !string.IsNullOrWhiteSpace(order.RazorpayOrderId);

            if (!isCod && status is "pending" or "unpaid" or "")
            {
                mismatches.Add(new ReconciliationMismatch(
                    KindUnpaidOnline,
                    order.OrderId,
                    order.RazorpayOrderId,
                    order.RazorpayPaymentId,
                    "Online order is still unpaid in Firestore (tab-close or abandoned checkout risk)."));
            }

            if (hasRpOrder && byRazorpayOrder.TryGetValue(order.RazorpayOrderId!, out var caps))
            {
                var cap = caps[0];
                if (status != "paid")
                {
                    mismatches.Add(new ReconciliationMismatch(
                        KindCapturedButUnpaid,
                        order.OrderId,
                        order.RazorpayOrderId,
                        cap.RazorpayPaymentId,
                        "Razorpay shows a captured payment but Firestore paymentStatus is not paid."));
                }

                var expectedPaise = (long)Math.Round(order.TotalAmount * 100m, MidpointRounding.AwayFromZero);
                if (status == "paid" && cap.AmountPaise != expectedPaise)
                {
                    mismatches.Add(new ReconciliationMismatch(
                        KindAmountMismatch,
                        order.OrderId,
                        order.RazorpayOrderId,
                        cap.RazorpayPaymentId,
                        $"Amount mismatch: Firestore ₹{order.TotalAmount} ({expectedPaise} paise) vs Razorpay {cap.AmountPaise} paise."));
                }
            }
            else if (!isCod && status == "paid" && captureList.Count > 0)
            {
                // Only flag when a capture set was provided (empty set = unpaid-only scan).
                mismatches.Add(new ReconciliationMismatch(
                    KindPaidMissingCapture,
                    order.OrderId,
                    order.RazorpayOrderId,
                    order.RazorpayPaymentId,
                    "Firestore marked paid but no matching Razorpay capture was found in the comparison set."));
            }
        }

        // Captures with no matching order document (orphaned capture).
        var knownRpOrders = new HashSet<string>(
            orderList.Where(o => !string.IsNullOrWhiteSpace(o.RazorpayOrderId)).Select(o => o.RazorpayOrderId!),
            StringComparer.Ordinal);
        foreach (var cap in captureList)
        {
            if (string.IsNullOrWhiteSpace(cap.RazorpayOrderId) || knownRpOrders.Contains(cap.RazorpayOrderId)) continue;
            mismatches.Add(new ReconciliationMismatch(
                KindCapturedButUnpaid,
                "",
                cap.RazorpayOrderId,
                cap.RazorpayPaymentId,
                "Razorpay capture has no matching Firestore order for this razorpayOrderId."));
        }

        return mismatches;
    }
}
