using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Domain;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;

[ApiController, Route("api/shipping")]
public sealed class ShippingController(MarketplaceService marketplace, IConfiguration config) : ControllerBase
{
    /* SHIP-001: quote delivery before checkout commit. Auth optional so cart
       can preview; amount is recomputed server-side at CheckoutAsync. */
    [AllowAnonymous, HttpPost("quote")]
    public async Task<IActionResult> Quote([FromBody] ShippingQuoteRequest request)
    {
        try
        {
            var quote = await marketplace.QuoteShippingAsync(
                request.Pincode,
                request.State,
                request.Subtotal,
                request.FreeShippingCoupon);
            return Ok(new
            {
                shippingAmount = quote.Amount,
                zoneId = quote.ZoneId,
                zoneName = quote.ZoneName,
                freeShippingApplied = quote.FreeShippingApplied,
                estimatedDaysMin = quote.EstimatedDaysMin,
                estimatedDaysMax = quote.EstimatedDaysMax,
                matchedBy = quote.MatchedBy
            });
        }
        catch (ArgumentOutOfRangeException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    /* SHIP-002: carrier / tracker webhook. Signature required via
       SHIPPING_WEBHOOK_SECRET (HMAC-SHA256 hex of raw body in
       X-Sunfara-Signature). When secret unset → 503 (fail closed for
       misconfigured staging; does not change Razorpay / prod deploy). */
    [AllowAnonymous, HttpPost("webhooks/{carrier}")]
    public async Task<IActionResult> CarrierWebhook(string carrier)
    {
        var webhookSecret = config["SHIPPING_WEBHOOK_SECRET"] ?? Environment.GetEnvironmentVariable("SHIPPING_WEBHOOK_SECRET");
        if (string.IsNullOrEmpty(webhookSecret))
            return StatusCode(503, new { error = "Shipping webhook is not configured." });

        Request.EnableBuffering();
        using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync();
        Request.Body.Position = 0;

        var signatureHeader = Request.Headers["X-Sunfara-Signature"].ToString();
        if (!CarrierWebhookSecurity.VerifyHmacSha256Hex(webhookSecret, rawBody, signatureHeader))
            return Unauthorized();

        CarrierTrackingEvent evt;
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(rawBody) ? "{}" : rawBody);
            var root = doc.RootElement;
            evt = new CarrierTrackingEvent(
                VendorOrderId: ReadString(root, "vendorOrderId"),
                TrackingNumber: ReadString(root, "trackingNumber"),
                Carrier: ReadString(root, "carrier") ?? carrier,
                Status: ReadString(root, "status"),
                EstimatedDeliveryIso: ReadString(root, "estimatedDelivery"),
                Location: ReadString(root, "location"),
                RawEventId: ReadString(root, "eventId") ?? ReadString(root, "id"));
        }
        catch (JsonException)
        {
            return BadRequest(new { error = "Invalid JSON payload." });
        }

        if (string.IsNullOrWhiteSpace(evt.VendorOrderId) && string.IsNullOrWhiteSpace(evt.TrackingNumber))
            return BadRequest(new { error = "vendorOrderId or trackingNumber is required." });

        var applied = await marketplace.ApplyCarrierTrackingEventAsync(evt);
        if (!applied) return NotFound(new { error = "Vendor order not found for tracking event." });
        return Ok(new { success = true });
    }

    private static string? ReadString(JsonElement root, string name) =>
        root.TryGetProperty(name, out var el) && el.ValueKind == JsonValueKind.String ? el.GetString() : null;
}

public sealed record ShippingQuoteRequest(string? Pincode, string? State, decimal Subtotal, bool FreeShippingCoupon = false);
