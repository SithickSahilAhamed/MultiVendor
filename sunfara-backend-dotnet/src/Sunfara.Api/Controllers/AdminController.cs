using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sunfara.Infrastructure;

namespace Sunfara.Api.Controllers;
[Authorize(Policy = "Admin"), ApiController, Route("api/admin")]
public sealed class AdminController(FirestoreCatalogStore store, MarketplaceService marketplace) : ControllerBase
{
    private static readonly HashSet<string> Collections = ["vendors","products","orders","vendor_orders","customers","commissions","withdrawals","reviews","categories","coupons","inventorySources","shipments","invoices","refunds","returns","settings","auditLogs","transactions"];
    [HttpGet("{collection}")] public async Task<IActionResult> List(string collection, [FromQuery] int limit=100) => Allowed(collection) ? Ok(await store.ListAsync(collection,limit)) : NotFound();
    [HttpGet("{collection}/{id}")] public async Task<IActionResult> Get(string collection,string id) => !Allowed(collection) ? NotFound() : await store.GetAsync(collection,id) is { } item ? Ok(item) : NotFound();
    [HttpPost("{collection}")] public async Task<IActionResult> Add(string collection,[FromBody] Dictionary<string,object> item) { if(!Allowed(collection)) return NotFound(); var id=await store.AddAsync(collection,item); return Ok(new{id}); }
    [HttpPut("{collection}/{id}")] public async Task<IActionResult> Update(string collection,string id,[FromBody] Dictionary<string,object> item) => Allowed(collection) && await store.UpdateAsync(collection,id,item) ? NoContent() : NotFound();
    [HttpDelete("{collection}/{id}")] public async Task<IActionResult> Delete(string collection,string id) => Allowed(collection) && await store.DeleteAsync(collection,id) ? NoContent() : NotFound();
    [HttpPost("reviews/{id}/{action}")] public async Task<IActionResult> Moderate(string id,string action) { if(action is not ("approve" or "reject")) return BadRequest(); return await store.UpdateAsync("reviews",id,new(){["status"]=action=="approve"?"approved":"rejected"}) ? Ok() : NotFound(); }
    [HttpPost("withdrawals/{id}/approve")] public async Task<IActionResult> ApproveWithdrawal(string id) => await marketplace.ApproveWithdrawalAsync(id) ? Ok() : NotFound();

    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue() => Ok(await store.GetAsync("settings", "platformRevenue") ?? new Dictionary<string, object> { ["totalGrossSales"] = 0.0, ["totalCommissionEarned"] = 0.0, ["totalVendorPayouts"] = 0.0 });

    /* Targets a vendor's sub-order specifically (id here is a vendor_orders
       document id, not a master order id) - status/tracking live per vendor
       sub-order now, not on the shared master order. Admin override bypasses
       the OrderStateMachine transition check vendors are held to. */
    [HttpPut("vendor-orders/{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string id, [FromBody] OrderStatusRequest request)
    {
        try { await marketplace.UpdateOrderStatusAsync(id, vendorId: "", request.Status, isAdmin: true, request.TrackingNumber, request.Carrier); return Ok(); }
        catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); }
    }

    private static bool Allowed(string collection)=>Collections.Contains(collection);
}
public sealed record OrderStatusRequest(string Status, string? TrackingNumber = null, string? Carrier = null);
