import { PolicyDefinition, PolicyCategory } from './types';

export const POLICIES: PolicyDefinition[] = [
  // ===== ECONOMY =====
  { id: 'income_tax', name: 'Income Tax', category: 'economy', description: 'Tax rate on personal income. Higher = more revenue but less growth.', defaultValue: 40, effects: { gdpGrowth: -0.03, equality: 0.04, unemployment: 0.01 }, budgetCostPerPoint: -0.8 },
  { id: 'corporate_tax', name: 'Corporate Tax', category: 'economy', description: 'Tax rate on business profits.', defaultValue: 30, effects: { gdpGrowth: -0.04, equality: 0.03, unemployment: 0.02 }, budgetCostPerPoint: -0.6 },
  { id: 'trade_openness', name: 'Trade Openness', category: 'economy', description: 'How open the economy is to global trade.', defaultValue: 60, effects: { gdpGrowth: 0.03, unemployment: -0.01, equality: -0.02 }, budgetCostPerPoint: 0.1 },
  { id: 'govt_spending', name: 'Government Spending', category: 'economy', description: 'Overall level of state expenditure.', defaultValue: 50, effects: { gdpGrowth: 0.01, unemployment: -0.02, inflation: 0.02 }, budgetCostPerPoint: 0.8 },
  { id: 'minimum_wage', name: 'Minimum Wage', category: 'economy', description: 'Mandatory minimum pay for workers.', defaultValue: 40, effects: { equality: 0.04, unemployment: 0.02, gdpGrowth: -0.01 }, budgetCostPerPoint: 0.1 },
  { id: 'tech_research', name: 'Technology & Research', category: 'economy', description: 'Investment in R&D and innovation.', defaultValue: 35, effects: { gdpGrowth: 0.04, educationIndex: 0.03, pollution: -0.01 }, budgetCostPerPoint: 0.5 },

  // ===== WELFARE =====
  { id: 'healthcare', name: 'Healthcare', category: 'welfare', description: 'Public healthcare system funding.', defaultValue: 50, effects: { healthIndex: 0.08, equality: 0.02, gdpGrowth: -0.01 }, budgetCostPerPoint: 0.6 },
  { id: 'education', name: 'Education', category: 'welfare', description: 'Schools, universities, and training programs.', defaultValue: 50, effects: { educationIndex: 0.08, gdpGrowth: 0.02, equality: 0.02 }, budgetCostPerPoint: 0.5 },
  { id: 'housing_subsidies', name: 'Housing Subsidies', category: 'welfare', description: 'Government support for affordable housing.', defaultValue: 30, effects: { equality: 0.03, healthIndex: 0.01 }, budgetCostPerPoint: 0.4 },
  { id: 'unemployment_benefits', name: 'Unemployment Benefits', category: 'welfare', description: 'Social safety net for jobless citizens.', defaultValue: 40, effects: { equality: 0.03, unemployment: -0.01, crime: -0.02 }, budgetCostPerPoint: 0.5 },
  { id: 'pensions', name: 'Pensions', category: 'welfare', description: 'State pension system for retirees.', defaultValue: 45, effects: { equality: 0.02 }, budgetCostPerPoint: 0.6 },

  // ===== SOCIETY =====
  { id: 'civil_rights', name: 'Civil Rights', category: 'society', description: 'Protection of individual freedoms and rights.', defaultValue: 60, effects: { freedomIndex: 0.08, equality: 0.03, crime: -0.01 }, budgetCostPerPoint: 0.15 },
  { id: 'press_freedom', name: 'Press Freedom', category: 'society', description: 'Independence of media and journalism.', defaultValue: 65, effects: { freedomIndex: 0.06, corruption: -0.03, nationalSecurity: -0.01 }, budgetCostPerPoint: 0.05 },
  { id: 'immigration', name: 'Immigration Policy', category: 'society', description: 'How open borders are to immigrants. Higher = more open.', defaultValue: 50, effects: { gdpGrowth: 0.01, crime: 0.02, freedomIndex: 0.02, equality: -0.01 }, budgetCostPerPoint: 0.2 },
  { id: 'drug_policy', name: 'Drug Policy', category: 'society', description: 'From strict prohibition (0) to full legalization (100).', defaultValue: 30, effects: { freedomIndex: 0.03, crime: -0.02, healthIndex: -0.01 }, budgetCostPerPoint: 0.1 },
  { id: 'religious_freedom', name: 'Religious Freedom', category: 'society', description: 'Protection of religious practice and diversity.', defaultValue: 70, effects: { freedomIndex: 0.04 }, budgetCostPerPoint: 0.05 },
  { id: 'gun_control', name: 'Gun Control', category: 'society', description: 'Restrictions on firearms ownership.', defaultValue: 60, effects: { crime: -0.03, freedomIndex: -0.02, nationalSecurity: 0.01 }, budgetCostPerPoint: 0.1 },

  // ===== ENVIRONMENT =====
  { id: 'env_regulations', name: 'Environmental Regulations', category: 'environment', description: 'Rules on pollution, emissions, and waste.', defaultValue: 40, effects: { pollution: -0.06, gdpGrowth: -0.02 }, budgetCostPerPoint: 0.3 },
  { id: 'renewables', name: 'Renewable Energy', category: 'environment', description: 'Investment in solar, wind, and clean energy.', defaultValue: 30, effects: { pollution: -0.04, gdpGrowth: 0.01 }, budgetCostPerPoint: 0.4 },
  { id: 'carbon_tax', name: 'Carbon Tax', category: 'environment', description: 'Tax on carbon emissions.', defaultValue: 20, effects: { pollution: -0.05, gdpGrowth: -0.02, inflation: 0.01 }, budgetCostPerPoint: -0.3 },
  { id: 'agriculture', name: 'Agriculture Policy', category: 'environment', description: 'Support for farming and rural economy.', defaultValue: 35, effects: { pollution: 0.01, gdpGrowth: 0.01, equality: 0.01 }, budgetCostPerPoint: 0.3 },

  // ===== SECURITY =====
  { id: 'police', name: 'Police Funding', category: 'security', description: 'Law enforcement resources and training.', defaultValue: 50, effects: { crime: -0.06, freedomIndex: -0.02, nationalSecurity: 0.02 }, budgetCostPerPoint: 0.5 },
  { id: 'military', name: 'Military', category: 'security', description: 'National defense and armed forces.', defaultValue: 40, effects: { nationalSecurity: 0.06, gdpGrowth: -0.01 }, budgetCostPerPoint: 0.7 },
  { id: 'intelligence', name: 'Intelligence Services', category: 'security', description: 'Domestic and foreign intelligence agencies.', defaultValue: 30, effects: { nationalSecurity: 0.04, freedomIndex: -0.02, corruption: -0.01 }, budgetCostPerPoint: 0.4 },
  { id: 'border_security', name: 'Border Security', category: 'security', description: 'Border patrol and customs enforcement.', defaultValue: 45, effects: { nationalSecurity: 0.03, crime: -0.02, freedomIndex: -0.01 }, budgetCostPerPoint: 0.3 },

  // ===== INFRASTRUCTURE =====
  { id: 'public_transport', name: 'Public Transport', category: 'infrastructure', description: 'Buses, trains, metro systems.', defaultValue: 40, effects: { pollution: -0.02, gdpGrowth: 0.01, equality: 0.02 }, budgetCostPerPoint: 0.5 },
  { id: 'roads_rail', name: 'Roads & Rail', category: 'infrastructure', description: 'National road and rail network.', defaultValue: 50, effects: { gdpGrowth: 0.02, pollution: 0.01 }, budgetCostPerPoint: 0.6 },
  { id: 'urban_dev', name: 'Urban Development', category: 'infrastructure', description: 'City planning, housing, and urban renewal.', defaultValue: 40, effects: { gdpGrowth: 0.01, pollution: 0.01, healthIndex: 0.01 }, budgetCostPerPoint: 0.4 },
  { id: 'foreign_aid', name: 'Foreign Aid', category: 'infrastructure', description: 'International development assistance.', defaultValue: 25, effects: { nationalSecurity: 0.01, gdpGrowth: -0.01 }, budgetCostPerPoint: 0.3 },
];

export const POLICY_MAP = new Map(POLICIES.map(p => [p.id, p]));

export const POLICIES_BY_CATEGORY: Record<PolicyCategory, PolicyDefinition[]> = {
  economy: POLICIES.filter(p => p.category === 'economy'),
  welfare: POLICIES.filter(p => p.category === 'welfare'),
  society: POLICIES.filter(p => p.category === 'society'),
  environment: POLICIES.filter(p => p.category === 'environment'),
  security: POLICIES.filter(p => p.category === 'security'),
  infrastructure: POLICIES.filter(p => p.category === 'infrastructure'),
};
