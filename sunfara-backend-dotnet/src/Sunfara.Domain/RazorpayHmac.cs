using System.Security.Cryptography;
using System.Text;

namespace Sunfara.Domain;

/* Shared HMAC helpers for Razorpay payment.verify and webhook signatures.
   Kept in Domain so CI unit tests can lock the crypto vectors without
   spinning up ASP.NET or calling live Razorpay. Controllers must use these
   rather than re-implementing hex HMAC (easy to drift). */
public static class RazorpayHmac
{
    public static string PaymentVerifySignature(string keySecret, string razorpayOrderId, string razorpayPaymentId)
    {
        var payload = $"{razorpayOrderId}|{razorpayPaymentId}";
        return ToHexLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(keySecret), Encoding.UTF8.GetBytes(payload)));
    }

    public static string WebhookSignature(string webhookSecret, string rawBody)
        => ToHexLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(webhookSecret), Encoding.UTF8.GetBytes(rawBody)));

    public static bool FixedTimeEqualsHex(string expectedHex, string actualHex)
    {
        var expectedBytes = Encoding.UTF8.GetBytes((expectedHex ?? "").ToLowerInvariant());
        var actualBytes = Encoding.UTF8.GetBytes((actualHex ?? "").ToLowerInvariant());
        return expectedBytes.Length == actualBytes.Length
            && CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    private static string ToHexLower(byte[] bytes) => Convert.ToHexStringLower(bytes);
}
