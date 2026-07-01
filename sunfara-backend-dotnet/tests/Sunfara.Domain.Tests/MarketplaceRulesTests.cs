using Sunfara.Domain;

namespace Sunfara.Domain.Tests;
public sealed class MarketplaceRulesTests
{
    [Fact] public void Commission_calculates_vendor_net() { var result=CommissionCalculator.Calculate(2000m,10m,50m,30m); Assert.Equal(200m,result.Commission); Assert.Equal(1720m,result.NetToVendor); }
    [Theory] [InlineData("pending","confirmed",true)] [InlineData("pending","delivered",false)] [InlineData("shipped","delivered",true)] [InlineData("completed","cancelled",false)]
    public void Order_transitions_are_guarded(string from,string to,bool expected)=>Assert.Equal(expected,OrderStateMachine.CanTransition(from,to));
    [Fact] public void Invalid_commission_rate_is_rejected()=>Assert.Throws<ArgumentOutOfRangeException>(()=>CommissionCalculator.Calculate(100m,101m));
}
