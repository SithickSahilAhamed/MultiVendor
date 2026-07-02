namespace Sunfara.Domain;

public static class CommissionCalculator
{
    public static CommissionResult Calculate(decimal subtotal, decimal rate, decimal platformFee = 0, decimal gatewayFee = 0)
    {
        if (subtotal < 0 || rate is < 0 or > 100 || platformFee < 0 || gatewayFee < 0) throw new ArgumentOutOfRangeException();
        var commission = decimal.Round(subtotal * rate / 100m, 2, MidpointRounding.AwayFromZero);
        return new(subtotal, rate, commission, platformFee, gatewayFee, subtotal - commission - platformFee - gatewayFee);
    }
}
public sealed record CommissionResult(decimal Gross, decimal Rate, decimal Commission, decimal PlatformFee, decimal GatewayFee, decimal NetToVendor);

public static class OrderStateMachine
{
    private static readonly Dictionary<string, HashSet<string>> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        ["pending"] = ["confirmed", "cancelled"], ["confirmed"] = ["processing", "cancelled"],
        ["processing"] = ["packed", "cancelled"], ["packed"] = ["shipped", "cancelled"],
        ["shipped"] = ["delivered", "returned"],
        ["delivered"] = ["completed", "return_requested"], ["return_requested"] = ["returned", "return_rejected"],
        ["returned"] = ["refunded"], ["completed"] = [], ["cancelled"] = [], ["refunded"] = []
    };
    public static bool CanTransition(string from, string to) => Allowed.TryGetValue(from, out var next) && next.Contains(to);
}
