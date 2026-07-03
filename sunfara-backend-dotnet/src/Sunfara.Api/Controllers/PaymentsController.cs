using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;

[ApiController, Route("api/payments"), Authorize]
public sealed class PaymentsController(FirestoreCatalogStore store, MarketplaceService marketplace, IHttpClientFactory httpClientFactory, IConfiguration config) : ControllerBase
{
    private string UserId => User.FindFirst("user_id")?.Value ?? User.FindFirst("sub")?.Value ?? throw new UnauthorizedAccessException();
    private string KeyId => config["RAZORPAY_KEY_ID"] ?? Environment.GetEnvironmentVariable("RAZORPAY_KEY_ID") ?? throw new InvalidOperationException("Razorpay key is not configured.");
    private string KeySecret => config["RAZORPAY_KEY_SECRET"] ?? Environment.GetEnvironmentVariable("RAZORPAY_KEY_SECRET") ?? throw new InvalidOperationException("Razorpay secret is not configured.");

    /* Creates a Razorpay order for an existing Firestore order and returns just
       the public key id + Razorpay order id the frontend needs to open Checkout.
       The key secret never leaves this method. */
    [HttpPost("create-order")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        var order = await store.GetAsync("orders", request.OrderId);
        if (order is null || order.GetValueOrDefault("customerId")?.ToString() != UserId) return NotFound(new { error = "Order not found." });
        if (order.GetValueOrDefault("paymentStatus")?.ToString() == "paid") return BadRequest(new { error = "Order is already paid." });

        var amountRupees = Convert.ToDecimal(order["totalAmount"]);
        var amountPaise = (long)Math.Round(amountRupees * 100, MidpointRounding.AwayFromZero);

        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{KeyId}:{KeySecret}")));

        var payload = JsonSerializer.Serialize(new { amount = amountPaise, currency = "INR", receipt = request.OrderId });
        var response = await client.PostAsync("https://api.razorpay.com/v1/orders", new StringContent(payload, Encoding.UTF8, "application/json"));
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode, new { error = "Failed to create payment order." });

        using var doc = JsonDocument.Parse(body);
        var razorpayOrderId = doc.RootElement.GetProperty("id").GetString()!;
        await store.UpdateAsync("orders", request.OrderId, new Dictionary<string, object> { ["razorpayOrderId"] = razorpayOrderId });

        return Ok(new { razorpayOrderId, amount = amountPaise, currency = "INR", keyId = KeyId });
    }

    /* Verifies the HMAC-SHA256 signature Razorpay returns after a successful
       payment before trusting it - this is the step that actually confirms
       the payment is real and wasn't forged client-side. */
    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyPaymentRequest request)
    {
        var order = await store.GetAsync("orders", request.OrderId);
        if (order is null || order.GetValueOrDefault("customerId")?.ToString() != UserId) return NotFound(new { error = "Order not found." });
        if (order.GetValueOrDefault("paymentStatus")?.ToString() == "paid") return Ok(new { success = true, alreadyVerified = true });

        var payload = $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}";
        var expectedSignature = Convert.ToHexStringLower(
            HMACSHA256.HashData(Encoding.UTF8.GetBytes(KeySecret), Encoding.UTF8.GetBytes(payload)));

        var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);
        var actualBytes = Encoding.UTF8.GetBytes(request.RazorpaySignature.ToLowerInvariant());
        if (expectedBytes.Length != actualBytes.Length || !CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes))
            return BadRequest(new { error = "Payment verification failed." });

        await store.UpdateAsync("orders", request.OrderId, new Dictionary<string, object>
        {
            ["paymentStatus"] = "paid",
            ["razorpayPaymentId"] = request.RazorpayPaymentId
        });
        await marketplace.ConfirmAllVendorOrdersForPaymentAsync(request.OrderId);

        return Ok(new { success = true });
    }

    /* Fallback confirmation path for when the client-side handler never gets
       to call /verify - reproduced live: a real Razorpay test payment was
       captured while the order still showed "pending" because the browser
       tab lost the moment the handler needed to fire. Razorpay calls this
       URL server-to-server whenever a payment actually captures, independent
       of what the customer's browser does, so it's the source of truth
       /verify was missing. Needs RAZORPAY_WEBHOOK_SECRET configured here and
       the same URL + secret registered in the Razorpay dashboard (Settings ->
       Webhooks) before it does anything - until then this just 503s. */
    [AllowAnonymous, HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        var webhookSecret = config["RAZORPAY_WEBHOOK_SECRET"] ?? Environment.GetEnvironmentVariable("RAZORPAY_WEBHOOK_SECRET");
        if (string.IsNullOrEmpty(webhookSecret)) return StatusCode(503, new { error = "Webhook is not configured." });

        Request.EnableBuffering();
        using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync();
        Request.Body.Position = 0;

        var signatureHeader = Request.Headers["X-Razorpay-Signature"].ToString();
        var expectedSignature = Convert.ToHexStringLower(HMACSHA256.HashData(Encoding.UTF8.GetBytes(webhookSecret), Encoding.UTF8.GetBytes(rawBody)));
        var expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);
        var actualBytes = Encoding.UTF8.GetBytes(signatureHeader.ToLowerInvariant());
        if (expectedBytes.Length != actualBytes.Length || !CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes))
            return Unauthorized();

        using var doc = JsonDocument.Parse(rawBody);
        if (doc.RootElement.GetProperty("event").GetString() != "payment.captured") return Ok();

        var paymentEntity = doc.RootElement.GetProperty("payload").GetProperty("payment").GetProperty("entity");
        var razorpayOrderId = paymentEntity.GetProperty("order_id").GetString();
        var razorpayPaymentId = paymentEntity.GetProperty("id").GetString();
        if (razorpayOrderId is null) return Ok();

        var matches = await store.WhereAsync("orders", "razorpayOrderId", razorpayOrderId, 1);
        var order = matches.FirstOrDefault();
        if (order is null || order.GetValueOrDefault("paymentStatus")?.ToString() == "paid") return Ok();

        var orderId = order["id"].ToString()!;
        await store.UpdateAsync("orders", orderId, new Dictionary<string, object> { ["paymentStatus"] = "paid", ["razorpayPaymentId"] = razorpayPaymentId ?? "" });
        await marketplace.ConfirmAllVendorOrdersForPaymentAsync(orderId);

        return Ok();
    }
}

public sealed record CreateOrderRequest(string OrderId);
public sealed record VerifyPaymentRequest(string OrderId, string RazorpayOrderId, string RazorpayPaymentId, string RazorpaySignature);
