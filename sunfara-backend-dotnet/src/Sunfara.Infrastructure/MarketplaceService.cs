using Google.Cloud.Firestore;
using Sunfara.Domain;

namespace Sunfara.Infrastructure;

public sealed class MarketplaceService(FirestoreCatalogStore store)
{
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

        await store.Database.RunTransactionAsync(async transaction =>
        {
            decimal subtotal = 0;
            var orderItems = new List<Dictionary<string, object>>();
            var productRefs = items.Select(item => store.Database.Collection("products").Document(item["productId"].ToString()!)).ToList();
            var products = new List<DocumentSnapshot>();
            foreach (var productRef in productRefs) products.Add(await transaction.GetSnapshotAsync(productRef));

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
                transaction.Update(productRef, new Dictionary<string, object> { ["stock"] = stock - quantity, ["updatedAt"] = FieldValue.ServerTimestamp });
                orderItems.Add(new()
                {
                    ["productId"] = productId, ["vendorId"] = product.GetValue<string>("vendorId"),
                    ["vendorName"] = product.ContainsField("vendorName") ? product.GetValue<string>("vendorName") : "",
                    ["name"] = product.GetValue<string>("name"), ["quantity"] = quantity,
                    ["price"] = (double)price, ["total"] = (double)lineTotal
                });
            }

            var paymentMethodValue = request.TryGetValue("paymentMethod", out var pm) ? FirestoreCatalogStore.NormalizeValue(pm) : "";
            var shippingAddressValue = request.TryGetValue("shippingAddress", out var sa) ? FirestoreCatalogStore.NormalizeValue(sa) : new Dictionary<string, object>();
            var orderNumber = $"SUN-{DateTime.UtcNow:yyyyMMdd}-{orderRef.Id[..8].ToUpperInvariant()}";

            var byVendor = orderItems.GroupBy(i => i["vendorId"].ToString()!).ToList();
            var vendorOrderRefs = new List<(DocumentReference Ref, string VendorId, List<Dictionary<string, object>> Items, decimal VendorSubtotal)>();
            foreach (var group in byVendor)
            {
                var vendorOrderRef = store.Database.Collection("vendor_orders").Document();
                var vendorSubtotal = group.Sum(i => Convert.ToDecimal(i["total"]));
                vendorOrderRefs.Add((vendorOrderRef, group.Key, group.ToList(), vendorSubtotal));
            }

            var order = new Dictionary<string, object>
            {
                ["customerId"] = customerId, ["orderNumber"] = orderNumber, ["items"] = orderItems,
                ["vendorOrderIds"] = vendorOrderRefs.Select(v => v.Ref.Id).ToList(),
                ["subtotal"] = (double)subtotal, ["totalAmount"] = (double)subtotal,
                ["paymentStatus"] = "pending", ["paymentMethod"] = paymentMethodValue, ["shippingAddress"] = shippingAddressValue,
                ["createdAt"] = FieldValue.ServerTimestamp, ["updatedAt"] = FieldValue.ServerTimestamp
            };
            foreach (var pair in request.Where(x => x.Key is "couponCode")) order[pair.Key] = FirestoreCatalogStore.NormalizeValue(pair.Value);
            transaction.Create(orderRef, order);

            foreach (var (vendorOrderRef, vendorId, vendorItems, vendorSubtotal) in vendorOrderRefs)
            {
                var statusHistory = new List<Dictionary<string, object>> { new() { ["status"] = "pending", ["at"] = DateTime.UtcNow.ToString("o") } };
                transaction.Create(vendorOrderRef, new Dictionary<string, object>
                {
                    ["masterOrderId"] = orderRef.Id, ["orderNumber"] = orderNumber, ["customerId"] = customerId,
                    ["vendorId"] = vendorId, ["vendorName"] = vendorItems.FirstOrDefault()?.GetValueOrDefault("vendorName") ?? "",
                    ["items"] = vendorItems, ["subtotal"] = (double)vendorSubtotal,
                    ["status"] = "pending", ["statusHistory"] = statusHistory,
                    ["trackingNumber"] = "", ["carrier"] = "", ["estimatedDelivery"] = DateTime.UtcNow.AddDays(4).ToString("o"),
                    ["paymentStatus"] = "pending", ["paymentMethod"] = paymentMethodValue,
                    ["commissionsCalculated"] = false,
                    ["createdAt"] = FieldValue.ServerTimestamp, ["updatedAt"] = FieldValue.ServerTimestamp
                });
            }
        });
        return orderRef.Id;
    }

    /* Called once a master order's payment is confirmed (Razorpay verify) -
       moves every vendor sub-order from pending to confirmed and, since
       online payment means money has genuinely already changed hands,
       triggers commission calculation immediately (COD instead triggers it
       on delivery in UpdateOrderStatusAsync, since that's when cash is
       actually collected). */
    public async Task ConfirmAllVendorOrdersForPaymentAsync(string masterOrderId)
    {
        var vendorOrdersSnap = await store.Database.Collection("vendor_orders").WhereEqualTo("masterOrderId", masterOrderId).GetSnapshotAsync();
        foreach (var doc in vendorOrdersSnap.Documents)
        {
            var history = doc.ContainsField("statusHistory") ? doc.GetValue<List<Dictionary<string, object>>>("statusHistory") : [];
            history.Add(new Dictionary<string, object> { ["status"] = "confirmed", ["at"] = DateTime.UtcNow.ToString("o"), ["by"] = "system:payment" });
            await doc.Reference.UpdateAsync(new Dictionary<string, object>
            {
                ["status"] = "confirmed", ["statusHistory"] = history, ["paymentStatus"] = "paid", ["updatedAt"] = FieldValue.ServerTimestamp
            });
            await CalculateAndRecordCommissionsAsync(doc.Id);
        }
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

    public async Task<string> RequestWithdrawalAsync(string vendorId, decimal amount)
    {
        if (amount <= 0) throw new InvalidOperationException("Amount must be positive.");
        var walletSnap = await store.Database.Collection("vendor_wallets").Document(vendorId).GetSnapshotAsync();
        var balance = walletSnap.Exists && walletSnap.ContainsField("balance") ? Convert.ToDecimal(walletSnap.GetValue<double>("balance")) : 0m;
        var pendingSnap = await store.Database.Collection("withdrawals").WhereEqualTo("vendorId", vendorId).WhereEqualTo("status", "pending").GetSnapshotAsync();
        var alreadyPending = pendingSnap.Documents.Sum(x => Convert.ToDecimal(x.GetValue<double>("amount")));
        if (amount > balance - alreadyPending) throw new InvalidOperationException("Withdrawal exceeds available earnings.");
        return await store.AddAsync("withdrawals", new() { ["vendorId"] = vendorId, ["amount"] = (double)amount, ["status"] = "pending" });
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
        return true;
    }

    private static List<Dictionary<string, object>> ReadItems(Dictionary<string, object> request)
    {
        if (!request.TryGetValue("items", out var raw) || raw is not System.Text.Json.JsonElement json || json.ValueKind != System.Text.Json.JsonValueKind.Array) return [];
        return json.EnumerateArray().Select(x => x.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.ValueKind == System.Text.Json.JsonValueKind.Number ? (object)p.Value.GetInt32() : p.Value.GetString()!)).ToList();
    }
}
