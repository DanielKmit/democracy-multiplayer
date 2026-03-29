import { BudgetState, SimulationState } from './types';
import { POLICIES } from './policies';

// ============================================================
// REALISTIC BUDGET MODEL
// ============================================================
//
// Novaria: ~12.6 million population, ~450B GDP at baseline
//
// Revenue sources:
//   Income Tax:    rate × working population × avg income (adjusted by GDP)
//   Corporate Tax: rate × business activity (adjusted by GDP and investment)
//   Carbon Tax:    rate × economic activity (adjusted by pollution)
//   Trade tariffs: proportional to trade_openness (less openness = more tariffs)
//
// Spending: Each policy has a BASE ANNUAL COST (in billions).
//   Actual cost = baseCost × (implementationLevel / 100)
//   Off = 0, Low (25) = 25% of base, Medium (50) = 50%, High (75) = 75%, Max (100) = 100%
//
// The default policy levels should produce revenue ≈ spending (balanced).
//
// GDP feedback: Good GDP → more revenue. Bad GDP → less.
// Laffer curve: Tax rates above ~70 start reducing effective revenue.
// ============================================================

const BASE_GDP = 450; // Billions
const POPULATION = 12.6; // Millions

// Base annual costs for spending policies (in billions)
const POLICY_BASE_COSTS: Record<string, number> = {
  // Economy
  trade_openness: 2,      // Trade infrastructure
  govt_spending: 50,      // General expenditure — THE big one
  minimum_wage: 3,        // Enforcement costs
  tech_research: 15,      // R&D funding

  // Welfare
  healthcare: 45,         // Huge cost
  education: 30,          // Schools & universities
  housing_subsidies: 12,  // Housing programs
  unemployment_benefits: 18, // Safety net
  pensions: 55,           // Biggest single cost (aging population)

  // Society
  civil_rights: 3,        // Enforcement & programs
  press_freedom: 1,       // Minimal direct cost
  immigration: 5,         // Processing & services
  drug_policy: 3,         // Enforcement / treatment
  religious_freedom: 1,
  gun_control: 2,         // Enforcement

  // Environment
  env_regulations: 8,     // Regulatory agencies
  renewables: 18,         // Green energy subsidies
  agriculture: 10,        // Farm subsidies

  // Security
  police: 20,             // Law enforcement
  military: 35,           // Armed forces
  intelligence: 12,       // Spying is expensive
  border_security: 8,     // Border patrol

  // Infrastructure
  public_transport: 15,   // Transit systems
  roads_rail: 20,         // National infrastructure
  urban_dev: 12,          // City development
  foreign_aid: 8,         // International aid
};

function lafferCurve(taxRate: number): number {
  // Tax rate 0-100 → effective collection multiplier
  // Peak efficiency around 40-55%, then drops off
  // At 100%, people evade/leave → you get less than at 70%
  if (taxRate <= 55) return taxRate / 100;
  // Quadratic dropoff after 55
  const overPeak = taxRate - 55;
  const penalty = (overPeak * overPeak) / 2000;
  return Math.max(0.1, (taxRate / 100) - penalty);
}

function getCreditRating(debtToGdp: number): BudgetState['creditRating'] {
  if (debtToGdp < 30) return 'AAA';
  if (debtToGdp < 60) return 'AA';
  if (debtToGdp < 80) return 'A';
  if (debtToGdp < 100) return 'BBB';
  if (debtToGdp < 130) return 'BB';
  if (debtToGdp < 170) return 'B';
  return 'CCC';
}

function getInterestRate(creditRating: BudgetState['creditRating']): number {
  switch (creditRating) {
    case 'AAA': return 1.5;
    case 'AA': return 2.0;
    case 'A': return 2.5;
    case 'BBB': return 3.5;
    case 'BB': return 5.0;
    case 'B': return 7.5;
    case 'CCC': return 12.0;
  }
}

export function calculateBudget(
  policyValues: Record<string, number>,
  simulation: SimulationState,
  previousDebtTotal: number
): BudgetState {
  // ---- GDP calculation ----
  const gdp = BASE_GDP * (1 + simulation.gdpGrowth / 100);
  const employmentRate = 1 - (simulation.unemployment / 100);

  // ---- REVENUE ----
  const incomeTaxRate = policyValues.income_tax ?? 40;
  const corporateTaxRate = policyValues.corporate_tax ?? 30;
  const carbonTaxRate = policyValues.carbon_tax ?? 20;
  const tradeOpenness = policyValues.trade_openness ?? 60;

  // Income tax: workers pay based on income × employment
  // At default 40% rate with normal GDP → ~80B
  const incomeTaxRevenue = lafferCurve(incomeTaxRate) * gdp * 0.45 * employmentRate;

  // Corporate tax: businesses pay based on profits × business activity
  // At default 30% rate → ~35B
  const businessActivity = 1 + (simulation.gdpGrowth / 50); // Better GDP = more profit
  const corruptionLeakage = 1 - (simulation.corruption / 200); // Corruption = tax evasion
  const corporateTaxRevenue = lafferCurve(corporateTaxRate) * gdp * 0.2 * businessActivity * corruptionLeakage;

  // Carbon tax: modest revenue, scales with economic activity
  // At default 20% → ~5B
  const carbonTaxRevenue = (carbonTaxRate / 100) * gdp * 0.06;

  // Trade tariffs: LESS openness = MORE tariffs (inverse)
  // At default 60% openness → ~3B
  const tariffRate = Math.max(0, (100 - tradeOpenness)) / 100;
  const tariffRevenue = tariffRate * gdp * 0.08;

  // Other revenue: fees, licenses, state enterprises → ~15B flat
  const otherRevenue = 15 * (gdp / BASE_GDP);

  const totalRevenue = incomeTaxRevenue + corporateTaxRevenue + carbonTaxRevenue + tariffRevenue + otherRevenue;

  // ---- SPENDING ----
  let totalSpending = 0;

  for (const policy of POLICIES) {
    const baseCost = POLICY_BASE_COSTS[policy.id];
    if (baseCost === undefined) continue; // Tax policies don't have spending costs
    if (policy.budgetCostPerPoint < 0) continue; // Revenue policies

    const level = policyValues[policy.id] ?? policy.defaultValue;
    // Spending = base cost × implementation level
    const cost = baseCost * (level / 100);
    totalSpending += cost;
  }

  // Corruption wastes money
  const corruptionWaste = 1 + (simulation.corruption / 300);
  totalSpending *= corruptionWaste;

  // Inflation increases costs
  const inflationCost = 1 + (simulation.inflation / 200);
  totalSpending *= inflationCost;

  // ---- DEBT & INTEREST ----
  const previousDebt = Math.max(0, previousDebtTotal);
  const creditRating = getCreditRating((previousDebt / gdp) * 100);
  const interestRate = getInterestRate(creditRating);
  const interestPayments = previousDebt * (interestRate / 100);

  // ---- BALANCE ----
  const balance = totalRevenue - totalSpending - interestPayments;
  const deficit = -balance; // positive deficit = spending > revenue

  // ---- NEW DEBT ----
  let newDebtTotal = previousDebt - balance; // If balance positive, debt shrinks
  newDebtTotal = Math.max(0, newDebtTotal);

  const debtToGdp = (newDebtTotal / gdp) * 100;

  const newCreditRating = getCreditRating(debtToGdp);
  const creditDowngrade = getInterestRate(newCreditRating) > interestRate;

  return {
    revenue: Math.round(totalRevenue * 10) / 10,
    spending: Math.round(totalSpending * 10) / 10,
    interestPayments: Math.round(interestPayments * 10) / 10,
    deficit: Math.round(deficit * 10) / 10,
    balance: Math.round(balance * 10) / 10,
    debtTotal: Math.round(newDebtTotal * 10) / 10,
    debtToGdp: Math.round(debtToGdp * 10) / 10,
    creditRating: newCreditRating,
    interestRate: interestRate,
    creditDowngrade,
  };
}
