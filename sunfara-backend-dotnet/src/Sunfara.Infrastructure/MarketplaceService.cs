using Google.Cloud.Firestore;

namespace Sunfara.Infrastructure;

public sealed class MarketplaceService(FirestoreCatalogStore store)
{
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
                orderItems.Add(new() { ["productId"] = productId, ["vendorId"] = product.GetValue<string>("vendorId"), ["name"] = product.GetValue<string>("name"), ["quantity"] = quantity, ["price"] = (double)price, ["total"] = (double)lineTotal });
            }
            var order = new Dictionary<string, object> { ["customerId"] = customerId, ["orderNumber"] = $"SUN-{DateTime.UtcNow:yyyyMMdd}-{orderRef.Id[..8].ToUpperInvariant()}", ["items"] = orderItems, ["subtotal"] = (double)subtotal, ["totalAmount"] = (double)subtotal, ["status"] = "pending", ["paymentStatus"] = "pending", ["createdAt"] = FieldValue.ServerTimestamp, ["updatedAt"] = FieldValue.ServerTimestamp };
            foreach (var pair in request.Where(x => x.Key is "shippingAddress" or "paymentMethod" or "couponCode")) order[pair.Key] = pair.Value;
            transaction.Create(orderRef, order);
        });
        return orderRef.Id;
    }

    public async Task<string> RequestWithdrawalAsync(string vendorId, decimal amount)
    {
        if (amount <= 0) throw new InvalidOperationException("Amount must be positive.");
        var unpaid = await store.Database.Collection("commissions").WhereEqualTo("vendorId", vendorId).WhereEqualTo("status", "approved").GetSnapshotAsync();
        var available = unpaid.Documents.Sum(x => Convert.ToDecimal(x.GetValue<double>("netToVendor")));
        if (amount > available) throw new InvalidOperationException("Withdrawal exceeds available earnings.");
        return await store.AddAsync("withdrawals", new() { ["vendorId"] = vendorId, ["amount"] = (double)amount, ["status"] = "pending" });
    }

    private static List<Dictionary<string, object>> ReadItems(Dictionary<string, object> request)
    {
        if (!request.TryGetValue("items", out var raw) || raw is not System.Text.Json.JsonElement json || json.ValueKind != System.Text.Json.JsonValueKind.Array) return [];
        return json.EnumerateArray().Select(x => x.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.ValueKind == System.Text.Json.JsonValueKind.Number ? (object)p.Value.GetInt32() : p.Value.GetString()!)).ToList();
    }
}
