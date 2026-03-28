import { BudgetState, SimulationState } from './types';
import { POLICIES } from './policies';

export function calculateBudget(
  policyValues: Record<string, number>,
  simulation: SimulationState,
  previousDebt: number
): BudgetState {
  let revenue = 0;
  let spending = 0;

  for (const policy of POLICIES) {
    const value = policyValues[policy.id] ?? policy.defaultValue;
    const cost = policy.budgetCostPerPoint * value;

    if (cost < 0) {
      revenue += Math.abs(cost);
    } else {
      spending += cost;
    }
  }

  // GDP affects revenue (higher GDP = more tax base)
  const gdpMultiplier = 1 + (simulation.gdpGrowth / 100);
  revenue *= gdpMultiplier;

  // Round
  revenue = Math.round(revenue * 10) / 10;
  spending = Math.round(spending * 10) / 10;

  const deficit = spending - revenue;
  let debtToGdp = previousDebt + (deficit / 10); // simplified: deficit adds to debt
  debtToGdp = Math.max(0, Math.round(debtToGdp * 10) / 10);

  const creditDowngrade = debtToGdp > 150;

  return { revenue, spending, deficit, debtToGdp, creditDowngrade };
}
