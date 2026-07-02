using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;

[ApiController, Route("api/payments"), Authorize]
public sealed class PaymentsController(FirestoreCatalogStore store, IHttpClientFactory httpClientFactory, IConfiguration config) : ControllerBase
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
            ["status"] = "processing",
            ["razorpayPaymentId"] = request.RazorpayPaymentId
        });

        return Ok(new { success = true });
    }
}

public sealed record CreateOrderRequest(string OrderId);
public sealed record VerifyPaymentRequest(string OrderId, string RazorpayOrderId, string RazorpayPaymentId, string RazorpaySignature);
