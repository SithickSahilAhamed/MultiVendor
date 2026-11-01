using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Domain;

namespace Sunfara.Api.Controllers;

/// <summary>
/// Phase 8 POS / wholesale / auction — PARTIAL scaffolding only.
/// Live sell paths stay disabled until inventory foundations are confirmed.
/// </summary>
[ApiController, Route("api/parity")]
public sealed class LateParityController(IConfiguration config) : ControllerBase
{
    private bool InventoryReady =>
        StockReservationRules.IsEnabled(config["STOCK_RESERVATIONS_ENABLED"] ?? Environment.GetEnvironmentVariable("STOCK_RESERVATIONS_ENABLED"));

    [AllowAnonymous, HttpGet("status")]
    public IActionResult Status() => Ok(new
    {
        pos = new { id = PosRules.ModuleId, status = PosRules.StatusPartial, enabled = LateParityFlags.IsOn(config[LateParityFlags.PosEnabled] ?? Environment.GetEnvironmentVariable(LateParityFlags.PosEnabled)), canSell = PosRules.CanSellWithoutReservation(InventoryReady) },
        wholesale = new { id = WholesaleRules.ModuleId, status = WholesaleRules.StatusPartial, enabled = LateParityFlags.IsOn(config[LateParityFlags.WholesaleEnabled] ?? Environment.GetEnvironmentVariable(LateParityFlags.WholesaleEnabled)) },
        auction = new { id = AuctionRules.ModuleId, status = AuctionRules.StatusPartial, enabled = LateParityFlags.IsOn(config[LateParityFlags.AuctionEnabled] ?? Environment.GetEnvironmentVariable(LateParityFlags.AuctionEnabled)) },
        inventoryFoundationsReady = InventoryReady,
        note = "PARTIAL: scaffolding + domain tests only; not a live POS/wholesale/auction launch."
    });

    [Authorize(Policy = "Admin"), HttpPost("pos/sessions")]
    public IActionResult OpenPosSession([FromBody] PosOpenRequest request)
    {
        if (!LateParityFlags.IsOn(config[LateParityFlags.PosEnabled] ?? Environment.GetEnvironmentVariable(LateParityFlags.PosEnabled)))
            return StatusCode(503, new { error = "POS module flag disabled (POS_ENABLED).", status = PosRules.StatusPartial });
        if (!PosRules.CanSellWithoutReservation(InventoryReady))
            return StatusCode(503, new { error = "POS sell path blocked until stock reservations are enabled.", status = PosRules.StatusPartial });
        try
        {
            var session = PosRules.CreateSession(request.TerminalId, request.CashierStaffId);
            return Ok(session);
        }
        catch (ArgumentException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    [Authorize(Policy = "Admin"), HttpPost("wholesale/quote")]
    public IActionResult WholesaleQuote([FromBody] WholesaleQuoteRequest request)
    {
        if (!LateParityFlags.IsOn(config[LateParityFlags.WholesaleEnabled] ?? Environment.GetEnvironmentVariable(LateParityFlags.WholesaleEnabled)))
            return StatusCode(503, new { error = "Wholesale module flag disabled.", status = WholesaleRules.StatusPartial });
        var tiers = (request.Tiers ?? []).Select(t => new WholesaleTier(t.MinQty, t.UnitPrice)).ToList();
        try
        {
            var unit = WholesaleRules.TierPrice(request.BasePrice, request.Quantity, tiers);
            return Ok(new { unitPrice = unit, lineTotal = unit * request.Quantity, status = WholesaleRules.StatusPartial });
        }
        catch (ArgumentOutOfRangeException e)
        {
            return BadRequest(new { error = e.Message });
        }
    }

    [Authorize, HttpPost("auction/validate-bid")]
    public IActionResult ValidateBid([FromBody] AuctionBidRequest request)
    {
        if (!LateParityFlags.IsOn(config[LateParityFlags.AuctionEnabled] ?? Environment.GetEnvironmentVariable(LateParityFlags.AuctionEnabled)))
            return StatusCode(503, new { error = "Auction module flag disabled.", status = AuctionRules.StatusPartial });
        var ok = AuctionRules.IsBidValid(request.BidAmount, request.CurrentHigh, request.MinIncrement, request.EndsAt, DateTimeOffset.UtcNow);
        return Ok(new { valid = ok, status = AuctionRules.StatusPartial });
    }
}

public sealed record PosOpenRequest(string TerminalId, string CashierStaffId);
public sealed record WholesaleQuoteRequest(decimal BasePrice, int Quantity, List<WholesaleTierDto>? Tiers);
public sealed record WholesaleTierDto(int MinQty, decimal UnitPrice);
public sealed record AuctionBidRequest(decimal BidAmount, decimal CurrentHigh, decimal MinIncrement, DateTimeOffset EndsAt);
