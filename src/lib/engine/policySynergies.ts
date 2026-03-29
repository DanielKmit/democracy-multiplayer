// ============================================
// Policy Synergies — Combo Effects
// Certain policy combinations create bonus/penalty effects
// ============================================

import { SimulationState, SimVarKey } from './types';

export interface PolicySynergy {
  id: string;
  name: string;
  description: string;
  icon: string;
  conditions: SynergyCondition[];
  effects: Partial<Record<SimVarKey, number>>;
  approvalBonus: number;  // direct approval modifier
}

export interface SynergyCondition {
  policyId: string;
  comparison: 'above' | 'below';
  threshold: number;
}

export interface ActiveSynergy {
  synergyId: string;
  name: string;
  icon: string;
  effects: Partial<Record<SimVarKey, number>>;
  approvalBonus: number;
}

export const POLICY_SYNERGIES: PolicySynergy[] = [
  {
    id: 'innovation_hub',
    name: 'Innovation Hub',
    description: 'High education + high tech investment creates a knowledge economy boom',
    icon: '🚀',
    conditions: [
      { policyId: 'education', comparison: 'above', threshold: 70 },
      { policyId: 'tech_research', comparison: 'above', threshold: 70 },
    ],
    effects: { gdpGrowth: 2, educationIndex: 5 },
    approvalBonus: 3,
  },
  {
    id: 'police_state',
    name: 'Police State',
    description: 'High military + low civil rights creates authoritarian stability',
    icon: '🔒',
    conditions: [
      { policyId: 'military', comparison: 'above', threshold: 70 },
      { policyId: 'police', comparison: 'above', threshold: 70 },
      { policyId: 'civil_rights', comparison: 'below', threshold: 30 },
    ],
    effects: { crime: -15, freedomIndex: -10 },
    approvalBonus: -5,
  },
  {
    id: 'social_democracy',
    name: 'Social Democracy',
    description: 'High welfare + high taxes create a comprehensive safety net',
    icon: '🌹',
    conditions: [
      { policyId: 'healthcare', comparison: 'above', threshold: 70 },
      { policyId: 'income_tax', comparison: 'above', threshold: 60 },
      { policyId: 'unemployment_benefits', comparison: 'above', threshold: 60 },
    ],
    effects: { equality: 10, healthIndex: 5, gdpGrowth: -1 },
    approvalBonus: 2,
  },
  {
    id: 'green_revolution',
    name: 'Green Revolution',
    description: 'Strong environmental policy + renewables creates a sustainable economy',
    icon: '🌿',
    conditions: [
      { policyId: 'env_regulations', comparison: 'above', threshold: 70 },
      { policyId: 'renewables', comparison: 'above', threshold: 70 },
      { policyId: 'carbon_tax', comparison: 'above', threshold: 50 },
    ],
    effects: { pollution: -15, gdpGrowth: -1, healthIndex: 5 },
    approvalBonus: 2,
  },
  {
    id: 'free_market_paradise',
    name: 'Free Market Paradise',
    description: 'Low taxes + high trade + minimal regulation unleashes growth',
    icon: '💰',
    conditions: [
      { policyId: 'income_tax', comparison: 'below', threshold: 30 },
      { policyId: 'corporate_tax', comparison: 'below', threshold: 25 },
      { policyId: 'trade_openness', comparison: 'above', threshold: 75 },
    ],
    effects: { gdpGrowth: 3, equality: -8, unemployment: -2 },
    approvalBonus: 1,
  },
  {
    id: 'fortress_nation',
    name: 'Fortress Nation',
    description: 'Closed borders + strong military + low immigration creates isolationism',
    icon: '🏰',
    conditions: [
      { policyId: 'border_security', comparison: 'above', threshold: 75 },
      { policyId: 'military', comparison: 'above', threshold: 70 },
      { policyId: 'immigration', comparison: 'below', threshold: 25 },
    ],
    effects: { nationalSecurity: 10, gdpGrowth: -2, freedomIndex: -5 },
    approvalBonus: -1,
  },
  {
    id: 'welfare_state_crisis',
    name: 'Welfare State Crisis',
    description: 'High spending + low taxes = unsustainable fiscal situation',
    icon: '💸',
    conditions: [
      { policyId: 'govt_spending', comparison: 'above', threshold: 75 },
      { policyId: 'income_tax', comparison: 'below', threshold: 30 },
      { policyId: 'corporate_tax', comparison: 'below', threshold: 25 },
    ],
    effects: { inflation: 5, gdpGrowth: -2 },
    approvalBonus: -3,
  },
  {
    id: 'digital_society',
    name: 'Digital Society',
    description: 'Tech investment + education + press freedom creates an information economy',
    icon: '💻',
    conditions: [
      { policyId: 'tech_research', comparison: 'above', threshold: 70 },
      { policyId: 'education', comparison: 'above', threshold: 65 },
      { policyId: 'press_freedom', comparison: 'above', threshold: 70 },
    ],
    effects: { gdpGrowth: 1.5, corruption: -5, educationIndex: 3 },
    approvalBonus: 2,
  },
  {
    id: 'crime_wave',
    name: 'Crime Wave',
    description: 'Low police + high inequality + drug liberalization creates lawlessness',
    icon: '🔫',
    conditions: [
      { policyId: 'police', comparison: 'below', threshold: 30 },
      { policyId: 'drug_policy', comparison: 'above', threshold: 75 },
    ],
    effects: { crime: 15, freedomIndex: 3 },
    approvalBonus: -4,
  },
  {
    id: 'healthcare_excellence',
    name: 'Healthcare Excellence',
    description: 'Massive health investment + housing stability creates a healthy nation',
    icon: '🏥',
    conditions: [
      { policyId: 'healthcare', comparison: 'above', threshold: 75 },
      { policyId: 'housing_subsidies', comparison: 'above', threshold: 60 },
    ],
    effects: { healthIndex: 10, equality: 3 },
    approvalBonus: 3,
  },
];

/**
 * Check which synergies are currently active.
 */
export function checkActiveSynergies(
  policies: Record<string, number>,
): ActiveSynergy[] {
  const active: ActiveSynergy[] = [];

  for (const synergy of POLICY_SYNERGIES) {
    const allMet = synergy.conditions.every(cond => {
      const value = policies[cond.policyId] ?? 50;
      return cond.comparison === 'above'
        ? value >= cond.threshold
        : value <= cond.threshold;
    });

    if (allMet) {
      active.push({
        synergyId: synergy.id,
        name: synergy.name,
        icon: synergy.icon,
        effects: synergy.effects,
        approvalBonus: synergy.approvalBonus,
      });
    }
  }

  return active;
}

/**
 * Get the synergy definition by ID.
 */
export function getSynergyById(id: string): PolicySynergy | undefined {
  return POLICY_SYNERGIES.find(s => s.id === id);
}

/**
 * Apply synergy effects to simulation state.
 */
export function applySynergyEffects(
  sim: SimulationState,
  activeSynergies: ActiveSynergy[],
): void {
  for (const synergy of activeSynergies) {
    for (const [key, value] of Object.entries(synergy.effects)) {
      const k = key as SimVarKey;
      (sim as unknown as Record<string, number>)[k] =
        ((sim as unknown as Record<string, number>)[k] ?? 0) + (value as number);
    }
  }
}
