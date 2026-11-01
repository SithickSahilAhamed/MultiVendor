namespace Sunfara.Domain;

/// <summary>
/// CAT-004 — first-class product variant SKUs.
/// Variants are additive on product documents: variants[] with id/sku/name/price/stock.
/// Checkout line items may carry variantId; stock decrements that variant when present.
/// </summary>
public static class ProductVariantRules
{
    public const string DefaultVariantId = "default";

    public static bool HasVariants(IReadOnlyList<ProductVariant>? variants) =>
        variants is { Count: > 0 } && !(variants.Count == 1 && variants[0].Id == DefaultVariantId && variants[0].IsSynthetic);

    public static ProductVariant? Find(IReadOnlyList<ProductVariant> variants, string? variantId)
    {
        if (string.IsNullOrWhiteSpace(variantId)) return variants.FirstOrDefault(v => v.Id == DefaultVariantId) ?? variants.FirstOrDefault();
        return variants.FirstOrDefault(v => string.Equals(v.Id, variantId, StringComparison.OrdinalIgnoreCase));
    }

    public static long EffectiveStock(ProductVariant? variant, long productLevelStock) =>
        variant is null ? productLevelStock : variant.Stock;

    public static decimal EffectivePrice(ProductVariant? variant, decimal productLevelPrice) =>
        variant is null ? productLevelPrice : variant.Price;

    public static IReadOnlyList<ProductVariant> Normalize(IEnumerable<ProductVariant>? incoming, decimal productPrice, long productStock)
    {
        var list = (incoming ?? []).Where(v => !string.IsNullOrWhiteSpace(v.Id)).ToList();
        if (list.Count == 0)
        {
            return
            [
                new ProductVariant(DefaultVariantId, "Standard", "STD", productPrice, productStock, IsSynthetic: true)
            ];
        }
        return list;
    }

    public static bool TryValidateSelection(IReadOnlyList<ProductVariant> variants, string? variantId, int quantity, out string error)
    {
        error = "";
        if (quantity <= 0) { error = "Quantity must be positive."; return false; }
        var match = Find(variants, variantId);
        if (match is null) { error = "Selected variant is unavailable."; return false; }
        if (match.Stock < quantity) { error = $"Insufficient stock for variant {match.Id}."; return false; }
        return true;
    }
}

public sealed record ProductVariant(
    string Id,
    string Name,
    string? Sku,
    decimal Price,
    long Stock,
    bool IsSynthetic = false);
