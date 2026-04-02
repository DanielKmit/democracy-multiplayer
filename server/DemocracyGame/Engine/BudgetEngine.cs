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

    public static BudgetState CalculateBudget(
        Dictionary<string, int> policies,
        SimulationState sim,
        BudgetState? previous = null)
    {
        double revenue = 0;
        double spending = 0;

        foreach (var policy in PolicyData.All)
        {
            var value = policies.GetValueOrDefault(policy.Id, policy.DefaultValue);
            var cost = value * policy.BudgetCostPerPoint;
            if (cost < 0)
                revenue += Math.Abs(cost); // Negative cost = revenue (taxes)
            else
                spending += cost;
        }

        // GDP affects revenue
        revenue *= 1 + (sim.GdpGrowth / 100);

        // Unemployment increases welfare spending
        spending += sim.Unemployment * 0.5;

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
