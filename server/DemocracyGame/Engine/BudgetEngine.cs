using DemocracyGame.Models;
using DemocracyGame.Data;

namespace DemocracyGame.Engine;

/// <summary>
/// Budget calculation — revenue, spending, debt, credit rating.
/// Port of budget.ts.
/// </summary>
public static class BudgetEngine
{
    private static double Clamp(double val, double min, double max) =>
        Math.Min(max, Math.Max(min, val));

    private const double BaseGdp = 450; // billions
    private const double Population = 12.6; // millions

    // Base spending costs for major policies (billions)
    private static readonly Dictionary<string, double> PolicyBaseCosts = new()
    {
        ["pensions"] = 55, ["govt_spending"] = 50, ["healthcare"] = 45,
        ["education"] = 35, ["military"] = 40, ["police"] = 20,
        ["unemployment_benefits"] = 25, ["housing_subsidies"] = 15,
        ["public_transport"] = 20, ["roads_rail"] = 25, ["urban_dev"] = 15,
        ["foreign_aid"] = 10, ["intelligence"] = 12, ["border_security"] = 8,
        ["renewables"] = 18, ["agriculture"] = 12, ["tech_research"] = 15,
    };

    /// <summary>
    /// Laffer curve — tax efficiency drops above 55% rate.
    /// Peak revenue at ~55%, declining sharply above that.
    /// </summary>
    private static double LafferMultiplier(int taxRate)
    {
        if (taxRate <= 55) return 1.0;
        var excess = taxRate - 55;
        return Math.Max(0.3, 1.0 - excess * 0.015); // Drops ~1.5% per point above 55
    }

    public static BudgetState CalculateBudget(
        Dictionary<string, int> policies,
        SimulationState sim,
        BudgetState? previous = null)
    {
        // === REVENUE ===
        var incomeTax = policies.GetValueOrDefault("income_tax", 40);
        var corporateTax = policies.GetValueOrDefault("corporate_tax", 30);
        var carbonTax = policies.GetValueOrDefault("carbon_tax", 20);

        // Income tax revenue: base * rate * Laffer curve * GDP multiplier
        var incomeRevenue = Population * 0.03 * incomeTax * LafferMultiplier(incomeTax);
        // Corporate tax: base * rate * Laffer curve
        var corpRevenue = BaseGdp * 0.001 * corporateTax * LafferMultiplier(corporateTax);
        // Carbon tax: direct rate-based
        var carbonRevenue = carbonTax * 0.15;

        double revenue = incomeRevenue + corpRevenue + carbonRevenue;

        // GDP growth boosts overall revenue
        revenue *= 1 + (sim.GdpGrowth / 100);

        // === SPENDING ===
        double spending = 0;

        foreach (var (policyId, baseCost) in PolicyBaseCosts)
        {
            var level = policies.GetValueOrDefault(policyId, 50) / 100.0; // 0.0 to 1.0
            spending += baseCost * level;
        }

        // Corruption waste: 0.5% of spending per point of corruption above 20
        var corruptionWaste = Math.Max(0, (sim.Corruption - 20)) * spending * 0.005;
        spending += corruptionWaste;

        // Inflation waste: higher costs when inflation is high
        var inflationWaste = Math.Max(0, (sim.Inflation - 3)) * spending * 0.01;
        spending += inflationWaste;

        // Unemployment increases welfare spending automatically
        spending += sim.Unemployment * 0.8;

        var prevDebt = previous?.DebtTotal ?? 100;
        var prevDebtToGdp = previous?.DebtToGdp ?? 40;

        var deficit = spending - revenue;
        var balance = revenue - spending;

        var debtTotal = prevDebt + deficit;
        if (debtTotal < 0) debtTotal = 0;

        // Debt to GDP ratio
        var gdpEstimate = 1000 * (1 + sim.GdpGrowth / 100);
        var debtToGdp = gdpEstimate > 0 ? (debtTotal / gdpEstimate) * 100 : prevDebtToGdp;

        // Interest rate based on debt level
        var interestRate = debtToGdp switch
        {
            < 30 => 2.0,
            < 50 => 3.0,
            < 70 => 4.5,
            < 90 => 6.0,
            < 120 => 8.0,
            _ => 12.0
        };

        var interestPayments = debtTotal * (interestRate / 100);

        // Credit rating
        var creditRating = debtToGdp switch
        {
            < 30 => CreditRating.AAA,
            < 45 => CreditRating.AA,
            < 60 => CreditRating.A,
            < 75 => CreditRating.BBB,
            < 90 => CreditRating.BB,
            < 110 => CreditRating.B,
            _ => CreditRating.CCC
        };

        var creditDowngrade = previous != null && creditRating > previous.CreditRating;

        return new BudgetState
        {
            Revenue = Math.Round(revenue, 1),
            Spending = Math.Round(spending, 1),
            InterestPayments = Math.Round(interestPayments, 1),
            Deficit = Math.Round(deficit, 1),
            Balance = Math.Round(balance, 1),
            DebtTotal = Math.Round(debtTotal, 1),
            DebtToGdp = Math.Round(debtToGdp, 1),
            CreditRating = creditRating,
            InterestRate = interestRate,
            CreditDowngrade = creditDowngrade,
        };
    }
}
