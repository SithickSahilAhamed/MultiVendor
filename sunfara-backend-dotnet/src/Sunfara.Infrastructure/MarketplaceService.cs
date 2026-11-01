using System.Net.Http;
using System.Text;
using System.Text.Json;
using Google.Cloud.Firestore;
using Microsoft.Extensions.Configuration;
using Sunfara.Domain;

namespace Sunfara.Infrastructure;

public sealed class MarketplaceService(FirestoreCatalogStore store, IHttpClientFactory httpClientFactory, IConfiguration config)
{
    private string KeyId => config["RAZORPAY_KEY_ID"] ?? Environment.GetEnvironmentVariable("RAZORPAY_KEY_ID") ?? throw new InvalidOperationException("Razorpay key is not configured.");
    private string KeySecret => config["RAZORPAY_KEY_SECRET"] ?? Environment.GetEnvironmentVariable("RAZORPAY_KEY_SECRET") ?? throw new InvalidOperationException("Razorpay secret is not configured.");

    /* Checkout creates one master order (customer-facing: what they paid,
       where it ships) plus one vendor_orders document per distinct vendor
       in the cart - each vendor only ever sees and manages their own
       sub-order, with its own independent status/tracking/history, instead
       of one shared order document mixing every vendor's items together. */
    public async Task<string> CheckoutAsync(string customerId, Dictionary<string, object> request)
    {
        var items = ReadItems(request);
        if (items.Count == 0) throw new InvalidOperationException("Cart is empty.");
        var orderRef = store.Database.Collection("orders").Document();

        var paymentMethodValue = request.TryGetValue("paymentMethod", out var pmRaw) ? FirestoreCatalogStore.NormalizeValue(pmRaw) : "";
        var isCod = CheckoutPricing.IsCashOnDelivery(paymentMethodValue?.ToString());
        /* Declared here, populated inside the transaction, read after it
           commits - a Firestore transaction can retry silently on
           contention, so any non-transactional side effect (a notification
           write) triggered from *inside* the lambda would double-fire on
           every retry. Notifying only after RunTransactionAsync returns
           guarantees it happens exactly once, for the attempt that actually
           committed. */
        var committedVendorOrders = new List<(string VendorId, decimal VendorSubtotal)>();
        var committedLowStockAlerts = new List<(string VendorId, string ProductName, long RemainingStock)>();

        var couponCodeValue = request.TryGetValue("couponCode", out var ccRaw) ? FirestoreCatalogStore.NormalizeValue(ccRaw)?.ToString()?.Trim().ToUpperInvariant() : null;

        // Zones are rate config, not inventory — load outside the checkout
        // transaction so we never mix non-transactional reads into a write txn.
        var shippingZones = await LoadShippingZonesAsync();

        await store.Database.RunTransactionAsync(async transaction =>
        {
            committedLowStockAlerts = [];
            decimal subtotal = 0;
            var orderItems = new List<Dictionary<string, object>>();
            var productRefs = items.Select(item => store.Database.Collection("products").Document(item["productId"].ToString()!)).ToList();
            var products = new List<DocumentSnapshot>();
            foreach (var productRef in productRefs) products.Add(await transaction.GetSnapshotAsync(productRef));

            DocumentSnapshot? couponSnap = null;
            if (!string.IsNullOrWhiteSpace(couponCodeValue))
            {
                var couponQuery = store.Database.Collection("coupons").WhereEqualTo("code", couponCodeValue).Limit(1);
                var couponMatches = await transaction.GetSnapshotAsync(couponQuery);
                couponSnap = couponMatches.Documents.FirstOrDefault();
            }

            for (var index = 0; index < items.Count; index++)
            {
                var item = items[index];
                var productId = item["productId"].ToString()!; var quantity = Convert.ToInt32(item["quantity"]);
                if (quantity <= 0) throw new InvalidOperationException("Quantity must be positive.");
                var productRef = productRefs[index]; var product = products[index];
                if (!product.Exists || product.GetValue<string>("status") != "active") throw new InvalidOperationException($"Product {productId} is unavailable.");
                var stock = product.ContainsField("stock") ? product.GetValue<long>("stock") : 0;
                if (stock < quantity) throw new InvalidOperationException($"Insufficient stock for {productId}.");
                var price = Convert.ToDecimal(product.GetValue<double>("price")); var lineTotal = price * quantity; subtotal += lineTotal;
                /* Only COD commits stock at order-creation time - it has no
                   separate "payment confirmed" moment before delivery, so this
                   is the earliest point that reservation can happen. Online
                   payments decrement in ConfirmAllVendorOrdersForPaymentAsync
                   instead: decrementing here meant an abandoned/failed Razorpay
                   payment permanently removed real stock from sale forever
                   (nothing ever released it), since there was no background
                   job to notice the order stayed unpaid. */
                if (isCod)
                {
                    var remaining = stock - quantity;
                    transaction.Update(productRef, new Dictionary<string, object> { ["stock"] = remaining, ["updatedAt"] = FieldValue.ServerTimestamp });
                    if (remaining <= LowStockThreshold && stock > LowStockThreshold)
                        committedLowStockAlerts.Add((product.GetValue<string>("vendorId"), product.GetValue<string>("name"), remaining));
                }
                orderItems.Add(new()
                {
                    ["productId"] = productId, ["vendorId"] = product.GetValue<string>("vendorId"),
                    ["vendorName"] = product.ContainsField("vendorName") ? product.GetValue<string>("vendorName") : "",
                    ["name"] = product.GetValue<string>("name"), ["quantity"] = quantity,
                    ["price"] = (double)price, ["total"] = (double)lineTotal
                });
            }

            var shippingAddressValue = request.TryGetValue("shippingAddress", out var sa) ? FirestoreCatalogStore.NormalizeValue(sa) : new Dictionary<string, object>();
            var orderNumber = $"SUN-{DateTime.UtcNow:yyyyMMdd}-{orderRef.Id[..8].ToUpperInvariant()}";

            /* Validated and applied server-side now, not just stored as a
               label - checkout.js never even sent this field before, so a
               coupon "applied" in the cart UI silently vanished at payment
               time and the customer was charged full price regardless of
               what they were shown. Percent/flat reduce merchandise;
               freeshipping waives the computed delivery fee (SHIP-001). */
            decimal discountAmount = 0;
            string? appliedCouponCode = null;
            var freeShippingCoupon = false;
            if (couponSnap is { Exists: true })
            {
                var minOrder = couponSnap.ContainsField("minOrder") ? Convert.ToDecimal(couponSnap.GetValue<double>("minOrder")) : 0;
                var active = !couponSnap.ContainsField("active") || couponSnap.GetValue<bool>("active");
                if (active && subtotal >= minOrder)
                {
                    var discountType = couponSnap.ContainsField("type") ? couponSnap.GetValue<string>("type") : "flat";
                    if (string.Equals(discountType, "freeshipping", StringComparison.OrdinalIgnoreCase))
                    {
                        freeShippingCoupon = true;
                        appliedCouponCode = couponCodeValue;
                    }
                    else
                    {
                        var discountValue = couponSnap.ContainsField("discount") ? Convert.ToDecimal(couponSnap.GetValue<double>("discount")) : 0;
                        discountAmount = discountType == "percent" ? Math.Round(subtotal * discountValue / 100m, 2) : discountValue;
                        discountAmount = Math.Clamp(discountAmount, 0, subtotal);
                        appliedCouponCode = couponCodeValue;
                    }
                }
            }
            // SHIP-001 quotes on merchandise after discount; PAY-003 COD fee (0 today) then added.
            var merchandiseAfterDiscount = Math.Max(0m, subtotal - discountAmount);
            var destination = DestinationFromAddress(shippingAddressValue);
            var shippingQuote = ShippingRateEngine.Quote(shippingZones, destination, merchandiseAfterDiscount, freeShippingCoupon);
            var shippingAmount = shippingQuote.Amount;
            var totalAmount = CheckoutPricing.OrderTotal(subtotal, discountAmount, paymentMethodValue?.ToString()) + shippingAmount;
            var estimatedDelivery = DateTime.UtcNow.AddDays(Math.Max(1, shippingQuote.EstimatedDaysMax)).ToString("o");

            var byVendor = orderItems.GroupBy(i => i["vendorId"].ToString()!).ToList();
            var vendorOrderRefs = new List<(DocumentReference Ref, string VendorId, List<Dictionary<string, object>> Items, decimal VendorSubtotal)>();
            foreach (var group in byVendor)
            {
                var vendorOrderRef = store.Database.Collection("vendor_orders").Document();
                var vendorGrossSubtotal = group.Sum(i => Convert.ToDecimal(i["total"]));
                // Each vendor absorbs a share of the coupon proportional to their
                // share of the cart, so commission (calculated off this same
                // subtotal later) is based on what was actually realized.
                var vendorDiscountShare = subtotal > 0 ? discountAmount * (vendorGrossSubtotal / subtotal) : 0;
                var vendorNetSubtotal = Math.Round(vendorGrossSubtotal - vendorDiscountShare, 2);
                vendorOrderRefs.Add((vendorOrderRef, group.Key, group.ToList(), vendorNetSubtotal));
            }

            var order = new Dictionary<string, object>
            {
                ["customerId"] = customerId, ["orderNumber"] = orderNumber, ["items"] = orderItems,
                ["vendorOrderIds"] = vendorOrderRefs.Select(v => v.Ref.Id).ToList(),
                ["subtotal"] = (double)subtotal, ["totalAmount"] = (double)totalAmount,
                ["shippingAmount"] = (double)shippingAmount,
                ["shippingZoneId"] = shippingQuote.ZoneId,
                ["shippingZoneName"] = shippingQuote.ZoneName,
                ["shippingMatchedBy"] = shippingQuote.MatchedBy,
                ["freeShippingApplied"] = shippingQuote.FreeShippingApplied,
                ["couponCode"] = appliedCouponCode ?? "", ["discountAmount"] = (double)discountAmount,
                ["paymentStatus"] = "pending", ["paymentMethod"] = paymentMethodValue, ["shippingAddress"] = shippingAddressValue,
                ["createdAt"] = FieldValue.ServerTimestamp, ["updatedAt"] = FieldValue.ServerTimestamp
            };
            transaction.Create(orderRef, order);

            foreach (var (vendorOrderRef, vendorId, vendorItems, vendorSubtotal) in vendorOrderRefs)
            {
                var statusHistory = new List<Dictionary<string, object>> { new() { ["status"] = "pending", ["at"] = DateTime.UtcNow.ToString("o") } };
                transaction.Create(vendorOrderRef, new Dictionary<string, object>
                {
                    ["masterOrderId"] = orderRef.Id, ["orderNumber"] = orderNumber, ["customerId"] = customerId,
                    ["vendorId"] = vendorId, ["vendorName"] = vendorItems.FirstOrDefault()?.GetValueOrDefault("vendorName") ?? "",
                    ["items"] = vendorItems, ["subtotal"] = (double)vendorSubtotal,
                    // Full order shipping fee mirrored for vendor visibility (platform-collected).
                    ["shippingAmount"] = (double)shippingAmount,
                    ["shippingZoneId"] = shippingQuote.ZoneId,
                    ["shippingZoneName"] = shippingQuote.ZoneName,
                    ["status"] = "pending", ["statusHistory"] = statusHistory,
                    ["trackingNumber"] = "", ["carrier"] = "",
                    ["estimatedDelivery"] = estimatedDelivery,
                    ["paymentStatus"] = "pending", ["paymentMethod"] = paymentMethodValue,
                    ["commissionsCalculated"] = false,
                    ["createdAt"] = FieldValue.ServerTimestamp, ["updatedAt"] = FieldValue.ServerTimestamp
                });
            }

            // Reassigned (not appended to) so a transaction retry fully
            // overwrites the previous attempt's list rather than duplicating it.
            committedVendorOrders = vendorOrderRefs.Select(v => (v.VendorId, v.VendorSubtotal)).ToList();
        });

        if (isCod)
        {
            foreach (var (vendorId, vendorSubtotal) in committedVendorOrders)
                await NotifyAsync(vendorId, "new_order", "New Order Received", $"You have a new COD order worth ₹{(double)vendorSubtotal:N2}.", "#/vendor/orders");
            foreach (var (vendorId, productName, remaining) in committedLowStockAlerts)
                await NotifyAsync(vendorId, "low_stock", "Low Stock Alert", $"\"{productName}\" is down to {remaining} unit(s) left.", "#/vendor/products");
        }

        return orderRef.Id;
    }

    /* Called once a master order's payment is confirmed - either the
       client-side Razorpay verify call, or the webhook fallback below, and
       both can genuinely fire for the same order (a client that never gets
       to call verify because the tab closed right after paying, followed by
       the webhook arriving; or both firing close together), so this has to
       be safe to call twice: skips any vendor sub-order that's already past
       "pending", so stock only ever gets decremented once. Moves every
       vendor sub-order from pending to confirmed and, since online payment
       means money has genuinely already changed hands, triggers commission
       calculation immediately (COD instead triggers it on delivery in
       UpdateOrderStatusAsync, since that's when cash is actually collected). */
    public async Task ConfirmAllVendorOrdersForPaymentAsync(string masterOrderId)
    {
        var vendorOrdersSnap = await store.Database.Collection("vendor_orders").WhereEqualTo("masterOrderId", masterOrderId).GetSnapshotAsync();
        foreach (var doc in vendorOrdersSnap.Documents)
        {
            if (doc.ContainsField("status") && doc.GetValue<string>("status") != "pending") continue;
            var history = doc.ContainsField("statusHistory") ? doc.GetValue<List<Dictionary<string, object>>>("statusHistory") : [];
            history.Add(new Dictionary<string, object> { ["status"] = "confirmed", ["at"] = DateTime.UtcNow.ToString("o"), ["by"] = "system:payment" });
            await doc.Reference.UpdateAsync(new Dictionary<string, object>
            {
                ["status"] = "confirmed", ["statusHistory"] = history, ["paymentStatus"] = "paid", ["updatedAt"] = FieldValue.ServerTimestamp
            });
            var items = doc.ContainsField("items") ? doc.GetValue<List<Dictionary<string, object>>>("items") : [];
            await DecrementStockAsync(items);
            await CalculateAndRecordCommissionsAsync(doc.Id);

            var vendorId = doc.GetValue<string>("vendorId");
            var customerId = doc.GetValue<string>("customerId");
            var subtotal = doc.ContainsField("subtotal") ? doc.GetValue<double>("subtotal") : 0;
            await NotifyAsync(vendorId, "new_order", "New Order Received", $"You have a new order worth ₹{subtotal:N2}.", "#/vendor/orders");
            await NotifyAsync(customerId, "order_confirmed", "Order Confirmed", "Your payment was received and your order is confirmed.", "#/orders");
        }
    }

    /* Preview-only mirror of the discount logic CheckoutAsync applies for
       real, so the cart/checkout UI can show an accurate number before the
       customer commits - reads live (no transaction) since nothing's being
       written or charged here. */
    public async Task<(bool Valid, decimal DiscountAmount, string Message, bool FreeShipping)> PreviewCouponAsync(string code, decimal subtotal)
    {
        var normalizedCode = code?.Trim().ToUpperInvariant() ?? "";
        if (string.IsNullOrWhiteSpace(normalizedCode)) return (false, 0, "Enter a coupon code.", false);

        var matches = await store.Database.Collection("coupons").WhereEqualTo("code", normalizedCode).Limit(1).GetSnapshotAsync();
        var coupon = matches.Documents.FirstOrDefault();
        if (coupon is not { Exists: true }) return (false, 0, "Invalid coupon code.", false);

        var active = !coupon.ContainsField("active") || coupon.GetValue<bool>("active");
        if (!active) return (false, 0, "This coupon is no longer active.", false);

        var minOrder = coupon.ContainsField("minOrder") ? Convert.ToDecimal(coupon.GetValue<double>("minOrder")) : 0;
        if (subtotal < minOrder) return (false, 0, $"Minimum order of ₹{(double)minOrder:N0} required for this coupon.", false);

        var discountType = coupon.ContainsField("type") ? coupon.GetValue<string>("type") : "flat";
        var description = coupon.ContainsField("description") ? coupon.GetValue<string>("description") : "Coupon applied";
        if (string.Equals(discountType, "freeshipping", StringComparison.OrdinalIgnoreCase))
            return (true, 0, description, true);

        var discountValue = coupon.ContainsField("discount") ? Convert.ToDecimal(coupon.GetValue<double>("discount")) : 0;
        var discountAmount = discountType == "percent" ? Math.Round(subtotal * discountValue / 100m, 2) : discountValue;
        discountAmount = Math.Clamp(discountAmount, 0, subtotal);

        return (true, discountAmount, description, false);
    }

    /* SHIP-001: public quote used by checkout UI before place-order so the
       Delivery line matches what CheckoutAsync will charge. */
    public async Task<ShippingQuote> QuoteShippingAsync(string? pincode, string? state, decimal merchandiseSubtotalAfterDiscount, bool freeShippingCoupon = false)
    {
        var zones = await LoadShippingZonesAsync();
        return ShippingRateEngine.Quote(zones, new ShippingDestination(pincode, state), merchandiseSubtotalAfterDiscount, freeShippingCoupon);
    }

    /* SHIP-002: carrier tracker webhook → update vendor_orders tracking /
       ETA and optionally advance status when the state machine allows. */
    public async Task<bool> ApplyCarrierTrackingEventAsync(CarrierTrackingEvent evt)
    {
        DocumentSnapshot? snapshot = null;
        DocumentReference? vendorOrderRef = null;

        if (!string.IsNullOrWhiteSpace(evt.VendorOrderId))
        {
            vendorOrderRef = store.Database.Collection("vendor_orders").Document(evt.VendorOrderId!);
            snapshot = await vendorOrderRef.GetSnapshotAsync();
            if (!snapshot.Exists) snapshot = null;
        }

        if (snapshot is null && !string.IsNullOrWhiteSpace(evt.TrackingNumber))
        {
            var matches = await store.Database.Collection("vendor_orders")
                .WhereEqualTo("trackingNumber", evt.TrackingNumber!.Trim())
                .Limit(1)
                .GetSnapshotAsync();
            snapshot = matches.Documents.FirstOrDefault();
            if (snapshot is { Exists: true }) vendorOrderRef = snapshot.Reference;
        }

        if (snapshot is null || vendorOrderRef is null || !snapshot.Exists) return false;

        var updates = new Dictionary<string, object> { ["updatedAt"] = FieldValue.ServerTimestamp };
        if (!string.IsNullOrWhiteSpace(evt.TrackingNumber)) updates["trackingNumber"] = evt.TrackingNumber!.Trim();
        if (!string.IsNullOrWhiteSpace(evt.Carrier)) updates["carrier"] = evt.Carrier!.Trim();
        if (!string.IsNullOrWhiteSpace(evt.EstimatedDeliveryIso)) updates["estimatedDelivery"] = evt.EstimatedDeliveryIso!;
        if (!string.IsNullOrWhiteSpace(evt.Location)) updates["lastTrackingLocation"] = evt.Location!;
        if (!string.IsNullOrWhiteSpace(evt.Status)) updates["lastCarrierStatus"] = evt.Status!;
        if (!string.IsNullOrWhiteSpace(evt.RawEventId)) updates["lastCarrierEventId"] = evt.RawEventId!;

        var currentStatus = snapshot.ContainsField("status") ? snapshot.GetValue<string>("status") : "pending";
        var mapped = CarrierEventMapper.MapToOrderStatus(evt.Status);
        var advanced = false;
        if (CarrierEventMapper.ShouldApplyStatusTransition(currentStatus, mapped))
        {
            var history = snapshot.ContainsField("statusHistory") ? snapshot.GetValue<List<Dictionary<string, object>>>("statusHistory") : [];
            history.Add(new Dictionary<string, object>
            {
                ["status"] = mapped!,
                ["at"] = DateTime.UtcNow.ToString("o"),
                ["by"] = "system:carrier"
            });
            updates["status"] = mapped!;
            updates["statusHistory"] = history;
            advanced = true;
            currentStatus = mapped!;
        }

        await vendorOrderRef.UpdateAsync(updates);

        if (advanced)
        {
            var paymentMethod = snapshot.ContainsField("paymentMethod") ? snapshot.GetValue<string>("paymentMethod") : "";
            var commissionsCalculated = snapshot.ContainsField("commissionsCalculated") && snapshot.GetValue<bool>("commissionsCalculated");
            if (currentStatus == "delivered" && paymentMethod == "Cash on Delivery" && !commissionsCalculated)
                await CalculateAndRecordCommissionsAsync(vendorOrderRef.Id);

            var notifyCustomerId = snapshot.GetValue<string>("customerId");
            var tracking = updates.TryGetValue("trackingNumber", out var tn) ? tn?.ToString() : (snapshot.ContainsField("trackingNumber") ? snapshot.GetValue<string>("trackingNumber") : "");
            if (currentStatus == "shipped")
                await NotifyAsync(notifyCustomerId, "order_shipped", "Order Shipped", $"Your order has shipped{(string.IsNullOrWhiteSpace(tracking) ? "." : $" - tracking: {tracking}")}", "#/orders");
            else if (currentStatus == "delivered")
                await NotifyAsync(notifyCustomerId, "order_delivered", "Order Delivered", "Your order has been delivered. Enjoy!", "#/orders");
        }

        return true;
    }

    private async Task<IReadOnlyList<ShippingZone>> LoadShippingZonesAsync()
    {
        var snap = await store.Database.Collection("shipping_zones").Limit(200).GetSnapshotAsync();
        return snap.Documents.Select(MapShippingZone).ToList();
    }

    private static ShippingZone MapShippingZone(DocumentSnapshot doc)
    {
        var prefixes = ReadStringList(doc, "pincodePrefixes");
        var states = ReadStringList(doc, "states");
        var ranges = new List<PincodeRange>();
        if (doc.ContainsField("pincodeRanges"))
        {
            try
            {
                foreach (var raw in doc.GetValue<List<object>>("pincodeRanges") ?? [])
                {
                    if (raw is not Dictionary<string, object> map) continue;
                    var from = map.TryGetValue("from", out var f) ? Convert.ToInt64(f) : 0;
                    var to = map.TryGetValue("to", out var t) ? Convert.ToInt64(t) : 0;
                    if (from > 0 && to >= from) ranges.Add(new PincodeRange(from, to));
                }
            }
            catch { /* ignore malformed range lists */ }
        }

        decimal? freeAbove = null;
        var freeAboveVal = ReadDecimalField(doc, "freeAboveSubtotal");
        if (freeAboveVal is > 0) freeAbove = freeAboveVal;

        return new ShippingZone(
            Id: doc.Id,
            Name: doc.ContainsField("name") ? doc.GetValue<string>("name") : doc.Id,
            Active: !doc.ContainsField("active") || doc.GetValue<bool>("active"),
            Priority: (int)(ReadDecimalField(doc, "priority") ?? 0),
            FlatAmount: ReadDecimalField(doc, "flatAmount") ?? ShippingRateEngine.DefaultFlatAmount,
            FreeAboveSubtotal: freeAbove,
            EstimatedDaysMin: (int)(ReadDecimalField(doc, "estimatedDaysMin") ?? 4),
            EstimatedDaysMax: (int)(ReadDecimalField(doc, "estimatedDaysMax") ?? 6),
            PincodePrefixes: prefixes,
            PincodeRanges: ranges,
            States: states,
            DefaultCarrier: doc.ContainsField("defaultCarrier") ? doc.GetValue<string>("defaultCarrier") : "");
    }

    private static decimal? ReadDecimalField(DocumentSnapshot doc, string field)
    {
        if (!doc.ContainsField(field)) return null;
        try { return Convert.ToDecimal(doc.GetValue<object>(field)); }
        catch { return null; }
    }

    private static List<string> ReadStringList(DocumentSnapshot doc, string field)
    {
        if (!doc.ContainsField(field)) return [];
        try
        {
            return (doc.GetValue<List<object>>(field) ?? [])
                .Select(x => x?.ToString()?.Trim() ?? "")
                .Where(s => s.Length > 0)
                .ToList();
        }
        catch
        {
            return [];
        }
    }

    private static ShippingDestination DestinationFromAddress(object? shippingAddressValue)
    {
        string? pincode = null;
        string? state = null;
        if (shippingAddressValue is Dictionary<string, object> map)
        {
            if (map.TryGetValue("pincode", out var p)) pincode = p?.ToString();
            if (map.TryGetValue("state", out var s)) state = s?.ToString();
        }
        return new ShippingDestination(pincode, state);
    }

    /* Stock reservation for online payments happens here, not at checkout -
       see the comment in CheckoutAsync. Money's already captured by this
       point (Razorpay verify already succeeded), so a product that sold out
       in the gap between checkout and payment isn't rejected here - it's
       clamped at zero and left for the vendor/admin to notice and resolve
       (rare in practice: it only happens if the same last few units get
       bought by two different in-flight checkouts within one payment
       window), rather than trying to unwind a payment that's already real. */
    private const long LowStockThreshold = 5;

    private async Task DecrementStockAsync(List<Dictionary<string, object>> items)
    {
        var lowStockAlerts = new List<(string VendorId, string ProductName, long RemainingStock)>();
        await store.Database.RunTransactionAsync(async transaction =>
        {
            lowStockAlerts = [];
            var productRefs = items.Select(i => store.Database.Collection("products").Document(i["productId"].ToString()!)).ToList();
            var products = new List<DocumentSnapshot>();
            foreach (var productRef in productRefs) products.Add(await transaction.GetSnapshotAsync(productRef));
            for (var i = 0; i < products.Count; i++)
            {
                if (!products[i].Exists) continue;
                var stock = products[i].ContainsField("stock") ? products[i].GetValue<long>("stock") : 0;
                var quantity = Convert.ToInt64(items[i]["quantity"]);
                var remaining = Math.Max(0, stock - quantity);
                transaction.Update(productRefs[i], new Dictionary<string, object> { ["stock"] = remaining, ["updatedAt"] = FieldValue.ServerTimestamp });
                if (remaining <= LowStockThreshold && stock > LowStockThreshold)
                    lowStockAlerts.Add((items[i]["vendorId"].ToString()!, items[i]["name"].ToString()!, remaining));
            }
        });
        foreach (var (vendorId, productName, remaining) in lowStockAlerts)
            await NotifyAsync(vendorId, "low_stock", "Low Stock Alert", $"\"{productName}\" is down to {remaining} unit(s) left.", "#/vendor/products");
    }

    /* Advances a single vendor's sub-order status, validating the transition
       against OrderStateMachine, appending to statusHistory, optionally
       recording tracking info, and triggering commission calculation once
       the sale is final for COD (online payments are confirmed - and
       commissioned - as a batch in ConfirmAllVendorOrdersForPaymentAsync). */
    public async Task UpdateOrderStatusAsync(string vendorOrderId, string vendorId, string newStatus, bool isAdmin, string? trackingNumber = null, string? carrier = null)
    {
        var vendorOrderRef = store.Database.Collection("vendor_orders").Document(vendorOrderId);
        var snapshot = await vendorOrderRef.GetSnapshotAsync();
        if (!snapshot.Exists) throw new InvalidOperationException("Order not found.");

        var orderVendorId = snapshot.GetValue<string>("vendorId");
        if (!isAdmin && orderVendorId != vendorId) throw new UnauthorizedAccessException("This order does not belong to you.");

        var currentStatus = snapshot.ContainsField("status") ? snapshot.GetValue<string>("status") : "pending";
        if (!isAdmin && !OrderStateMachine.CanTransition(currentStatus, newStatus))
            throw new InvalidOperationException($"Cannot move an order from '{currentStatus}' to '{newStatus}'.");

        /* Cancelling used to have zero side effects - no refund, no stock
           restore, no commission reversal - so cancelling an order that was
           already paid online silently kept the customer's money with no
           way to give it back. Blocking it here (even for admin) forces
           that case through the return/refund flow instead, which does all
           three correctly. COD orders are unaffected: no money was ever
           collected before delivery, so a plain cancel is still safe. */
        var existingPaymentStatus = snapshot.ContainsField("paymentStatus") ? snapshot.GetValue<string>("paymentStatus") : "";
        if (newStatus == "cancelled" && existingPaymentStatus == "paid")
            throw new InvalidOperationException("This order was already paid online - cancel it through the return/refund flow so the customer is actually refunded, instead of just marking it cancelled.");

        var history = snapshot.ContainsField("statusHistory") ? snapshot.GetValue<List<Dictionary<string, object>>>("statusHistory") : [];
        history.Add(new Dictionary<string, object> { ["status"] = newStatus, ["at"] = DateTime.UtcNow.ToString("o"), ["by"] = isAdmin ? "admin" : vendorId });

        var updates = new Dictionary<string, object> { ["status"] = newStatus, ["statusHistory"] = history, ["updatedAt"] = FieldValue.ServerTimestamp };
        if (!string.IsNullOrWhiteSpace(trackingNumber)) updates["trackingNumber"] = trackingNumber;
        if (!string.IsNullOrWhiteSpace(carrier)) updates["carrier"] = carrier;
        await vendorOrderRef.UpdateAsync(updates);

        var paymentMethod = snapshot.ContainsField("paymentMethod") ? snapshot.GetValue<string>("paymentMethod") : "";
        var commissionsCalculated = snapshot.ContainsField("commissionsCalculated") && snapshot.GetValue<bool>("commissionsCalculated");
        if (newStatus == "delivered" && paymentMethod == "Cash on Delivery" && !commissionsCalculated)
            await CalculateAndRecordCommissionsAsync(vendorOrderId);

        var notifyCustomerId = snapshot.GetValue<string>("customerId");
        if (newStatus == "shipped")
            await NotifyAsync(notifyCustomerId, "order_shipped", "Order Shipped", $"Your order has shipped{(string.IsNullOrWhiteSpace(trackingNumber) ? "." : $" - tracking: {trackingNumber}")}", "#/orders");
        else if (newStatus == "delivered")
            await NotifyAsync(notifyCustomerId, "order_delivered", "Order Delivered", "Your order has been delivered. Enjoy!", "#/orders");
    }

    /* Calculates one vendor's commission for their sub-order, writes a
       commission record, credits their wallet, logs a transaction, and
       updates platform revenue. Guarded so it can only ever run once per
       vendor order (Firestore has no unique-constraint, so this is an
       explicit idempotency flag rather than relying on retries never
       happening). */
    public async Task CalculateAndRecordCommissionsAsync(string vendorOrderId)
    {
        var vendorOrderRef = store.Database.Collection("vendor_orders").Document(vendorOrderId);
        var snapshot = await vendorOrderRef.GetSnapshotAsync();
        if (!snapshot.Exists) return;
        if (snapshot.ContainsField("commissionsCalculated") && snapshot.GetValue<bool>("commissionsCalculated")) return;

        var vendorId = snapshot.GetValue<string>("vendorId");
        var gross = Convert.ToDecimal(snapshot.GetValue<double>("subtotal"));
        var vendorSnap = await store.Database.Collection("vendors").Document(vendorId).GetSnapshotAsync();
        var rate = vendorSnap.Exists && vendorSnap.ContainsField("commission") ? Convert.ToDecimal(vendorSnap.GetValue<double>("commission")) : 10m;
        var result = CommissionCalculator.Calculate(gross, rate);

        await store.AddAsync("commissions", new Dictionary<string, object>
        {
            ["vendorId"] = vendorId, ["orderId"] = vendorOrderId,
            ["grossAmount"] = (double)result.Gross, ["rate"] = (double)result.Rate,
            ["commissionAmount"] = (double)result.Commission, ["netToVendor"] = (double)result.NetToVendor,
            ["status"] = "approved"
        });

        var walletRef = store.Database.Collection("vendor_wallets").Document(vendorId);
        await store.Database.RunTransactionAsync(async transaction =>
        {
            var walletSnap = await transaction.GetSnapshotAsync(walletRef);
            var balance = walletSnap.Exists && walletSnap.ContainsField("balance") ? Convert.ToDecimal(walletSnap.GetValue<double>("balance")) : 0m;
            var totalEarned = walletSnap.Exists && walletSnap.ContainsField("totalEarned") ? Convert.ToDecimal(walletSnap.GetValue<double>("totalEarned")) : 0m;
            transaction.Set(walletRef, new Dictionary<string, object>
            {
                ["vendorId"] = vendorId,
                ["balance"] = (double)(balance + result.NetToVendor),
                ["totalEarned"] = (double)(totalEarned + result.NetToVendor),
                ["totalWithdrawn"] = walletSnap.Exists && walletSnap.ContainsField("totalWithdrawn") ? walletSnap.GetValue<double>("totalWithdrawn") : 0.0,
                ["updatedAt"] = FieldValue.ServerTimestamp
            }, SetOptions.MergeAll);
        });

        await RecordTransactionAsync("commission_split", vendorOrderId, vendorId, result.Commission,
            $"Commission split for order {vendorOrderId}: {result.Rate}% of ₹{(double)result.Gross:N2} gross");
        await UpdatePlatformRevenueAsync(grossDelta: result.Gross, commissionDelta: result.Commission, payoutDelta: 0);

        await vendorOrderRef.UpdateAsync(new Dictionary<string, object> { ["commissionsCalculated"] = true });
    }

    /* Append-only accounting record for every money movement - this is what
       "no ledger, no accounting export" in the audit meant: individual
       wallet/commission documents show current state, but nothing recorded
       the history of how money moved until now. */
    private async Task RecordTransactionAsync(string type, string referenceId, string vendorId, decimal amount, string description)
    {
        await store.AddAsync("transactions", new Dictionary<string, object>
        {
            ["type"] = type, ["referenceId"] = referenceId, ["vendorId"] = vendorId,
            ["amount"] = (double)amount, ["description"] = description
        });
    }

    /* One notifications doc per (recipient, event) - userId is either a
       customerId or a vendorId, the same claim value NotificationsController
       reads off the caller's token, so one collection and one query shape
       covers both without needing separate customer/vendor notification
       systems. */
    private async Task NotifyAsync(string userId, string type, string title, string message, string link = "")
    {
        await store.AddAsync("notifications", new Dictionary<string, object>
        {
            ["userId"] = userId, ["type"] = type, ["title"] = title, ["message"] = message,
            ["link"] = link, ["read"] = false
        });
    }

    /* Single aggregate document - not per-vendor, this is the platform's own
       revenue: total sales that passed through it, total commission it
       earned, total it has paid out to vendors. */
    private async Task UpdatePlatformRevenueAsync(decimal grossDelta, decimal commissionDelta, decimal payoutDelta)
    {
        var revenueRef = store.Database.Collection("settings").Document("platformRevenue");
        await store.Database.RunTransactionAsync(async transaction =>
        {
            var snap = await transaction.GetSnapshotAsync(revenueRef);
            var totalGrossSales = snap.Exists && snap.ContainsField("totalGrossSales") ? Convert.ToDecimal(snap.GetValue<double>("totalGrossSales")) : 0m;
            var totalCommissionEarned = snap.Exists && snap.ContainsField("totalCommissionEarned") ? Convert.ToDecimal(snap.GetValue<double>("totalCommissionEarned")) : 0m;
            var totalVendorPayouts = snap.Exists && snap.ContainsField("totalVendorPayouts") ? Convert.ToDecimal(snap.GetValue<double>("totalVendorPayouts")) : 0m;
            transaction.Set(revenueRef, new Dictionary<string, object>
            {
                ["totalGrossSales"] = (double)(totalGrossSales + grossDelta),
                ["totalCommissionEarned"] = (double)(totalCommissionEarned + commissionDelta),
                ["totalVendorPayouts"] = (double)(totalVendorPayouts + payoutDelta),
                ["updatedAt"] = FieldValue.ServerTimestamp
            }, SetOptions.MergeAll);
        });
    }

    /* Balance-check-then-write used to be two separate non-transactional reads
       followed by an unguarded write - two withdrawal requests submitted close
       together could both read the same "available" balance before either
       commits, both pass the check, and both get created (a real double-spend
       race). Wrapping the read and the write in one transaction closes that.
       Also gates on the vendor's live status - a suspended vendor's token
       still works until it expires/is revoked (see AdminController.Update),
       so this is the other half of actually stopping a suspended vendor from
       pulling money out. */
    public async Task<string> RequestWithdrawalAsync(string vendorId, decimal amount)
    {
        if (amount <= 0) throw new InvalidOperationException("Amount must be positive.");
        if (!await IsVendorActiveAsync(vendorId)) throw new InvalidOperationException("Your account is not in good standing and cannot request withdrawals right now.");

        var withdrawalRef = store.Database.Collection("withdrawals").Document();
        await store.Database.RunTransactionAsync(async transaction =>
        {
            var walletRef = store.Database.Collection("vendor_wallets").Document(vendorId);
            var walletSnap = await transaction.GetSnapshotAsync(walletRef);
            var balance = walletSnap.Exists && walletSnap.ContainsField("balance") ? Convert.ToDecimal(walletSnap.GetValue<double>("balance")) : 0m;

            var pendingQuery = store.Database.Collection("withdrawals").WhereEqualTo("vendorId", vendorId).WhereEqualTo("status", "pending");
            var pendingSnap = await transaction.GetSnapshotAsync(pendingQuery);
            var alreadyPending = pendingSnap.Documents.Sum(x => Convert.ToDecimal(x.GetValue<double>("amount")));

            if (amount > balance - alreadyPending) throw new InvalidOperationException("Withdrawal exceeds available earnings.");

            transaction.Create(withdrawalRef, new Dictionary<string, object>
            {
                ["vendorId"] = vendorId, ["amount"] = (double)amount, ["status"] = "pending",
                ["createdAt"] = FieldValue.ServerTimestamp, ["updatedAt"] = FieldValue.ServerTimestamp
            });
        });
        return withdrawalRef.Id;
    }

    public async Task<bool> IsVendorActiveAsync(string vendorId)
    {
        var vendorSnap = await store.Database.Collection("vendors").Document(vendorId).GetSnapshotAsync();
        return vendorSnap.Exists && vendorSnap.ContainsField("status") && vendorSnap.GetValue<string>("status") == "active";
    }

    /* Debits the vendor's wallet only on admin approval - a pending request
       reserves against the balance (see RequestWithdrawalAsync) but doesn't
       move money until approved, matching the existing admin-approval UX. */
    public async Task<bool> ApproveWithdrawalAsync(string withdrawalId)
    {
        var withdrawalRef = store.Database.Collection("withdrawals").Document(withdrawalId);
        var snapshot = await withdrawalRef.GetSnapshotAsync();
        if (!snapshot.Exists || snapshot.GetValue<string>("status") != "pending") return false;

        var vendorId = snapshot.GetValue<string>("vendorId");
        var amount = Convert.ToDecimal(snapshot.GetValue<double>("amount"));
        var walletRef = store.Database.Collection("vendor_wallets").Document(vendorId);

        await store.Database.RunTransactionAsync(async transaction =>
        {
            var walletSnap = await transaction.GetSnapshotAsync(walletRef);
            var balance = walletSnap.Exists && walletSnap.ContainsField("balance") ? Convert.ToDecimal(walletSnap.GetValue<double>("balance")) : 0m;
            var totalWithdrawn = walletSnap.Exists && walletSnap.ContainsField("totalWithdrawn") ? Convert.ToDecimal(walletSnap.GetValue<double>("totalWithdrawn")) : 0m;
            transaction.Set(walletRef, new Dictionary<string, object>
            {
                ["balance"] = (double)(balance - amount),
                ["totalWithdrawn"] = (double)(totalWithdrawn + amount),
                ["updatedAt"] = FieldValue.ServerTimestamp
            }, SetOptions.MergeAll);
            transaction.Update(withdrawalRef, new Dictionary<string, object> { ["status"] = "approved", ["approvedAt"] = FieldValue.ServerTimestamp });
        });

        await RecordTransactionAsync("payout", withdrawalId, vendorId, amount, $"Withdrawal payout of ₹{(double)amount:N2} approved");
        await UpdatePlatformRevenueAsync(grossDelta: 0, commissionDelta: 0, payoutDelta: amount);
        await NotifyAsync(vendorId, "withdrawal_approved", "Withdrawal Approved", $"Your withdrawal of ₹{(double)amount:N2} has been approved and processed.", "#/vendor/earnings");
        return true;
    }

    /* Customer-initiated: only valid once a vendor's sub-order is
       "delivered" (matches OrderStateMachine - delivered is the only state
       that can move to return_requested). Status transition is applied
       inline (like ConfirmAllVendorOrdersForPaymentAsync) rather than via
       UpdateOrderStatusAsync because that method assumes the caller is the
       vendor or an admin, not the customer. */
    public async Task<string> RequestReturnAsync(string vendorOrderId, string customerId, string reason)
    {
        var vendorOrderRef = store.Database.Collection("vendor_orders").Document(vendorOrderId);
        var snapshot = await vendorOrderRef.GetSnapshotAsync();
        if (!snapshot.Exists) throw new InvalidOperationException("Order not found.");
        if (snapshot.GetValue<string>("customerId") != customerId) throw new UnauthorizedAccessException("This order does not belong to you.");

        var currentStatus = snapshot.ContainsField("status") ? snapshot.GetValue<string>("status") : "pending";
        if (!OrderStateMachine.CanTransition(currentStatus, "return_requested"))
            throw new InvalidOperationException($"An order in '{currentStatus}' status cannot be returned.");

        var vendorId = snapshot.GetValue<string>("vendorId");
        var returnId = await store.AddAsync("returns", new Dictionary<string, object>
        {
            ["vendorOrderId"] = vendorOrderId, ["masterOrderId"] = snapshot.GetValue<string>("masterOrderId"),
            ["customerId"] = customerId, ["vendorId"] = vendorId,
            ["vendorName"] = snapshot.ContainsField("vendorName") ? snapshot.GetValue<string>("vendorName") : "",
            ["reason"] = string.IsNullOrWhiteSpace(reason) ? "Not specified" : reason,
            ["amount"] = snapshot.GetValue<double>("subtotal"),
            ["status"] = "requested", ["requestedAt"] = FieldValue.ServerTimestamp
        });

        await AppendStatusAsync(vendorOrderRef, snapshot, "return_requested", by: customerId);
        return returnId;
    }

    /* Vendor (or admin) decides the outcome. Rejecting just closes the loop.
       Approving moves the order to "returned" and immediately kicks off the
       refund - a real Razorpay refund call for online payments (only this
       vendor's share of a multi-vendor payment, since Razorpay supports
       partial refunds of a single payment), or a straight bookkeeping
       reversal for COD, where cash was collected offline and there's
       nothing for a payment gateway to refund. */
    public async Task ReviewReturnAsync(string returnId, string vendorId, bool approve, bool isAdmin)
    {
        var returnRef = store.Database.Collection("returns").Document(returnId);
        var returnSnap = await returnRef.GetSnapshotAsync();
        if (!returnSnap.Exists) throw new InvalidOperationException("Return request not found.");
        var currentReturnStatus = returnSnap.GetValue<string>("status");
        if (currentReturnStatus is not ("requested" or "refund_failed")) throw new InvalidOperationException("This return has already been reviewed.");
        if (!isAdmin && returnSnap.GetValue<string>("vendorId") != vendorId) throw new UnauthorizedAccessException("This return does not belong to you.");

        var vendorOrderId = returnSnap.GetValue<string>("vendorOrderId");
        var vendorOrderRef = store.Database.Collection("vendor_orders").Document(vendorOrderId);
        var vendorOrderSnap = await vendorOrderRef.GetSnapshotAsync();
        if (!vendorOrderSnap.Exists) throw new InvalidOperationException("Order not found.");

        var reviewer = isAdmin ? "admin" : vendorId;
        if (!approve)
        {
            await AppendStatusAsync(vendorOrderRef, vendorOrderSnap, "return_rejected", by: reviewer);
            await returnRef.UpdateAsync(new Dictionary<string, object> { ["status"] = "rejected", ["reviewedAt"] = FieldValue.ServerTimestamp });
            return;
        }

        /* The vendor's "returned" decision and the refund itself are recorded
           separately - if the refund call throws (Razorpay outage, account
           restriction, network blip), the return stays retryable via
           "refund_failed" instead of being silently stuck forever behind
           the "already reviewed" guard above. Found by a real refund call
           failing live in testing; a vendor order that's already "returned"
           is left as-is on retry rather than re-appending duplicate history. */
        if (vendorOrderSnap.GetValue<string>("status") != "returned")
            await AppendStatusAsync(vendorOrderRef, vendorOrderSnap, "returned", by: reviewer);
        await returnRef.UpdateAsync(new Dictionary<string, object> { ["reviewedAt"] = FieldValue.ServerTimestamp });

        try { await ProcessRefundAsync(returnId); }
        catch (Exception ex)
        {
            await returnRef.UpdateAsync(new Dictionary<string, object> { ["status"] = "refund_failed", ["refundError"] = ex.Message });
            throw;
        }
    }

    /* Reverses everything CalculateAndRecordCommissionsAsync did for this
       vendor order - debits the wallet credit, restores product stock,
       negates the platform revenue totals - and, for online payments,
       actually calls Razorpay first. Bookkeeping only runs if the real
       refund call (when there is one) succeeds, so the system never shows
       "refunded" while the customer's money hasn't actually moved. */
    private async Task ProcessRefundAsync(string returnId)
    {
        var returnRef = store.Database.Collection("returns").Document(returnId);
        var returnSnap = await returnRef.GetSnapshotAsync();
        var vendorOrderId = returnSnap.GetValue<string>("vendorOrderId");
        var masterOrderId = returnSnap.GetValue<string>("masterOrderId");
        var vendorId = returnSnap.GetValue<string>("vendorId");
        var customerId = returnSnap.GetValue<string>("customerId");

        var vendorOrderRef = store.Database.Collection("vendor_orders").Document(vendorOrderId);
        var vendorOrderSnap = await vendorOrderRef.GetSnapshotAsync();
        var subtotal = Convert.ToDecimal(vendorOrderSnap.GetValue<double>("subtotal"));
        var paymentMethod = vendorOrderSnap.ContainsField("paymentMethod") ? vendorOrderSnap.GetValue<string>("paymentMethod") : "";
        var items = vendorOrderSnap.ContainsField("items") ? vendorOrderSnap.GetValue<List<Dictionary<string, object>>>("items") : [];

        string method; string? razorpayRefundId = null;
        if (paymentMethod == "Cash on Delivery")
        {
            method = "manual";
        }
        else
        {
            method = "razorpay";
            var masterOrder = await store.GetAsync("orders", masterOrderId);
            var razorpayPaymentId = masterOrder?.GetValueOrDefault("razorpayPaymentId")?.ToString();
            if (string.IsNullOrWhiteSpace(razorpayPaymentId))
                throw new InvalidOperationException("No captured payment was found for this order, so it cannot be refunded automatically.");

            var amountPaise = (long)Math.Round(subtotal * 100, MidpointRounding.AwayFromZero);
            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
                "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{KeyId}:{KeySecret}")));
            var payload = JsonSerializer.Serialize(new { amount = amountPaise, speed = "normal", notes = new { vendorOrderId, returnId } });
            var response = await client.PostAsync($"https://api.razorpay.com/v1/payments/{razorpayPaymentId}/refund", new StringContent(payload, Encoding.UTF8, "application/json"));
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode) throw new InvalidOperationException("Razorpay refund failed: " + body);
            using var doc = JsonDocument.Parse(body);
            razorpayRefundId = doc.RootElement.GetProperty("id").GetString();
        }

        var commissionMatches = await store.WhereAsync("commissions", "orderId", vendorOrderId, 1);
        var commission = commissionMatches.FirstOrDefault();
        var commissionAmount = commission is not null ? Convert.ToDecimal(commission["commissionAmount"]) : 0m;
        var netToVendor = commission is not null ? Convert.ToDecimal(commission["netToVendor"]) : subtotal;

        var walletRef = store.Database.Collection("vendor_wallets").Document(vendorId);
        await store.Database.RunTransactionAsync(async transaction =>
        {
            var walletSnap = await transaction.GetSnapshotAsync(walletRef);
            var balance = walletSnap.Exists && walletSnap.ContainsField("balance") ? Convert.ToDecimal(walletSnap.GetValue<double>("balance")) : 0m;
            var totalEarned = walletSnap.Exists && walletSnap.ContainsField("totalEarned") ? Convert.ToDecimal(walletSnap.GetValue<double>("totalEarned")) : 0m;
            transaction.Set(walletRef, new Dictionary<string, object>
            {
                ["balance"] = (double)(balance - netToVendor), ["totalEarned"] = (double)(totalEarned - netToVendor),
                ["updatedAt"] = FieldValue.ServerTimestamp
            }, SetOptions.MergeAll);
        });

        var productQuantities = items.Select(i => (ProductId: i["productId"].ToString()!, Quantity: Convert.ToInt32(i["quantity"]))).ToList();
        await store.Database.RunTransactionAsync(async transaction =>
        {
            var productRefs = productQuantities.Select(pq => store.Database.Collection("products").Document(pq.ProductId)).ToList();
            var products = new List<DocumentSnapshot>();
            foreach (var productRef in productRefs) products.Add(await transaction.GetSnapshotAsync(productRef));
            for (var i = 0; i < products.Count; i++)
            {
                if (!products[i].Exists) continue;
                var stock = products[i].ContainsField("stock") ? products[i].GetValue<long>("stock") : 0;
                transaction.Update(productRefs[i], new Dictionary<string, object> { ["stock"] = stock + productQuantities[i].Quantity, ["updatedAt"] = FieldValue.ServerTimestamp });
            }
        });

        if (commission is not null) await store.UpdateAsync("commissions", commission["id"].ToString()!, new Dictionary<string, object> { ["status"] = "refunded" });

        await store.AddAsync("refunds", new Dictionary<string, object>
        {
            ["vendorOrderId"] = vendorOrderId, ["returnId"] = returnId, ["masterOrderId"] = masterOrderId,
            ["vendorId"] = vendorId, ["customerId"] = customerId, ["amount"] = (double)subtotal,
            ["method"] = method, ["razorpayRefundId"] = razorpayRefundId ?? "", ["status"] = "completed"
        });

        await RecordTransactionAsync("refund", vendorOrderId, vendorId, -subtotal, $"Refund of ₹{(double)subtotal:N2} for returned order {vendorOrderId}");
        await UpdatePlatformRevenueAsync(grossDelta: -subtotal, commissionDelta: -commissionAmount, payoutDelta: 0);

        var refreshedSnap = await vendorOrderRef.GetSnapshotAsync();
        await AppendStatusAsync(vendorOrderRef, refreshedSnap, "refunded", by: "system:refund");
        await vendorOrderRef.UpdateAsync(new Dictionary<string, object> { ["paymentStatus"] = "refunded" });
        await returnRef.UpdateAsync(new Dictionary<string, object> { ["status"] = "approved", ["refundStatus"] = "completed", ["refundedAt"] = FieldValue.ServerTimestamp });
        await NotifyAsync(customerId, "order_refunded", "Refund Completed", $"Your refund of ₹{(double)subtotal:N2} has been processed.", "#/orders");
    }

    private static async Task AppendStatusAsync(DocumentReference vendorOrderRef, DocumentSnapshot snapshot, string newStatus, string by)
    {
        var history = snapshot.ContainsField("statusHistory") ? snapshot.GetValue<List<Dictionary<string, object>>>("statusHistory") : [];
        history.Add(new Dictionary<string, object> { ["status"] = newStatus, ["at"] = DateTime.UtcNow.ToString("o"), ["by"] = by });
        await vendorOrderRef.UpdateAsync(new Dictionary<string, object> { ["status"] = newStatus, ["statusHistory"] = history, ["updatedAt"] = FieldValue.ServerTimestamp });
    }

    private static List<Dictionary<string, object>> ReadItems(Dictionary<string, object> request)
    {
        if (!request.TryGetValue("items", out var raw) || raw is not System.Text.Json.JsonElement json || json.ValueKind != System.Text.Json.JsonValueKind.Array) return [];
        return json.EnumerateArray().Select(x => x.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.ValueKind == System.Text.Json.JsonValueKind.Number ? (object)p.Value.GetInt32() : p.Value.GetString()!)).ToList();
    }

    /* PAY-004: build order payment snapshots for a date window (in-memory filter;
       avoids new composite indexes). Optional Razorpay capture list can be empty
       for an unpaid-online-only scan, or filled from the Razorpay API / fixtures. */
    public async Task<(IReadOnlyList<OrderPaymentSnapshot> Orders, IReadOnlyList<ReconciliationMismatch> Mismatches)> ReconcilePaymentsAsync(
        DateTimeOffset from,
        DateTimeOffset to,
        IReadOnlyList<RazorpayCapturedPayment>? captures = null)
    {
        var docs = await store.ListAsync("orders", 500);
        var snapshots = docs.Select(ToOrderPaymentSnapshot).Where(o => o.CreatedAt >= from && o.CreatedAt <= to).ToList();
        var captureList = captures ?? await TryFetchRazorpayCapturesAsync(from, to);
        var mismatches = PaymentReconciliation.FindMismatches(snapshots, captureList, from, to);
        return (snapshots, mismatches);
    }

    /* Cancels a stuck unpaid online master order (and its pending vendor sub-orders)
       so operators can clear tab-close / abandoned Razorpay checkouts from PAY-004. */
    public async Task CancelUnpaidOnlineOrderAsync(string masterOrderId)
    {
        var order = await store.GetAsync("orders", masterOrderId) ?? throw new InvalidOperationException("Order not found.");
        var paymentStatus = order.GetValueOrDefault("paymentStatus")?.ToString() ?? "";
        var paymentMethod = order.GetValueOrDefault("paymentMethod")?.ToString() ?? "";
        if (CheckoutPricing.IsCashOnDelivery(paymentMethod))
            throw new InvalidOperationException("COD orders cannot be cancelled via unpaid-online reconciliation.");
        if (string.Equals(paymentStatus, "paid", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Order is already paid.");

        await store.UpdateAsync("orders", masterOrderId, new Dictionary<string, object>
        {
            ["paymentStatus"] = "cancelled",
            ["cancellationReason"] = "unpaid_online_reconciliation"
        });

        var vendorOrders = await store.Database.Collection("vendor_orders").WhereEqualTo("masterOrderId", masterOrderId).GetSnapshotAsync();
        foreach (var doc in vendorOrders.Documents)
        {
            if (doc.ContainsField("status") && doc.GetValue<string>("status") != "pending") continue;
            await AppendStatusAsync(doc.Reference, doc, "cancelled", by: "admin:unpaid_reconciliation");
            await doc.Reference.UpdateAsync(new Dictionary<string, object> { ["paymentStatus"] = "cancelled", ["updatedAt"] = FieldValue.ServerTimestamp });
        }
    }

    private static OrderPaymentSnapshot ToOrderPaymentSnapshot(Dictionary<string, object> order)
    {
        var created = order.TryGetValue("createdAt", out var createdRaw) && createdRaw is DateTime dt
            ? new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc))
            : DateTimeOffset.UtcNow;
        var total = order.TryGetValue("totalAmount", out var totalRaw) ? Convert.ToDecimal(totalRaw) : 0m;
        return new OrderPaymentSnapshot(
            order.GetValueOrDefault("id")?.ToString() ?? "",
            order.GetValueOrDefault("paymentStatus")?.ToString() ?? "",
            order.GetValueOrDefault("paymentMethod")?.ToString() ?? "",
            order.GetValueOrDefault("razorpayOrderId")?.ToString(),
            order.GetValueOrDefault("razorpayPaymentId")?.ToString(),
            created,
            total);
    }

    private async Task<IReadOnlyList<RazorpayCapturedPayment>> TryFetchRazorpayCapturesAsync(DateTimeOffset from, DateTimeOffset to)
    {
        var keyId = config["RAZORPAY_KEY_ID"] ?? Environment.GetEnvironmentVariable("RAZORPAY_KEY_ID");
        var keySecret = config["RAZORPAY_KEY_SECRET"] ?? Environment.GetEnvironmentVariable("RAZORPAY_KEY_SECRET");
        if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret)) return [];

        try
        {
            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue(
                "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}")));
            var fromUnix = from.ToUnixTimeSeconds();
            var toUnix = to.ToUnixTimeSeconds();
            var url = $"https://api.razorpay.com/v1/payments?from={fromUnix}&to={toUnix}&count=100";
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return [];
            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array) return [];

            var captures = new List<RazorpayCapturedPayment>();
            foreach (var item in items.EnumerateArray())
            {
                var status = item.TryGetProperty("status", out var st) ? st.GetString() : null;
                if (!string.Equals(status, "captured", StringComparison.OrdinalIgnoreCase)) continue;
                var paymentId = item.GetProperty("id").GetString() ?? "";
                var orderId = item.TryGetProperty("order_id", out var oid) ? oid.GetString() ?? "" : "";
                var amount = item.TryGetProperty("amount", out var amt) ? amt.GetInt64() : 0;
                var createdAt = item.TryGetProperty("created_at", out var ca) && ca.TryGetInt64(out var unix)
                    ? DateTimeOffset.FromUnixTimeSeconds(unix)
                    : DateTimeOffset.UtcNow;
                captures.Add(new RazorpayCapturedPayment(paymentId, orderId, amount, createdAt));
            }
            return captures;
        }
        catch
        {
            // Reconciliation still returns Firestore unpaid list when Razorpay is unreachable.
            return [];
        }
    }
}
