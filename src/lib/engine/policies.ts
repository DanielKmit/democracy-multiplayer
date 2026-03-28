import { PolicyDefinition } from './types';

export const POLICIES: PolicyDefinition[] = [
  // ===== ECONOMY =====
  {
    id: 'income_tax',
    name: 'Income Tax Rate',
    category: 'economy',
    description: 'Tax on personal income. Higher rates fund services but reduce economic activity.',
    defaultValue: 40,
    effects: {
      gdpGrowth: -0.04,
      equality: 0.3,
      unemployment: 0.02,
    },
    budgetCostPerPoint: -1.5, // revenue
  },
  {
    id: 'corporate_tax',
    name: 'Corporate Tax Rate',
    category: 'economy',
    description: 'Tax on business profits. Funds the state but may drive businesses away.',
    defaultValue: 30,
    effects: {
      gdpGrowth: -0.05,
      equality: 0.2,
      unemployment: 0.03,
    },
    budgetCostPerPoint: -1.2,
  },
  {
    id: 'sales_tax',
    name: 'Sales Tax / VAT',
    category: 'economy',
    description: 'Consumption tax. Broad revenue base but regressive.',
    defaultValue: 20,
    effects: {
      gdpGrowth: -0.02,
      equality: -0.15,
      inflation: 0.05,
    },
    budgetCostPerPoint: -1.0,
  },
  {
    id: 'govt_spending',
    name: 'Government Spending',
    category: 'economy',
    description: 'General government expenditure level.',
    defaultValue: 50,
    effects: {
      gdpGrowth: 0.03,
      inflation: 0.06,
      unemployment: -0.05,
    },
    budgetCostPerPoint: 1.0,
  },
  {
    id: 'trade_openness',
    name: 'Trade Openness',
    category: 'economy',
    description: 'How open borders are to international trade.',
    defaultValue: 60,
    effects: {
      gdpGrowth: 0.04,
      unemployment: 0.02,
      equality: -0.1,
    },
    budgetCostPerPoint: 0,
  },
  {
    id: 'minimum_wage',
    name: 'Minimum Wage',
    category: 'economy',
    description: 'Floor for worker compensation.',
    defaultValue: 40,
    effects: {
      equality: 0.3,
      unemployment: 0.04,
      gdpGrowth: -0.02,
    },
    budgetCostPerPoint: 0,
  },

  // ===== WELFARE =====
  {
    id: 'healthcare',
    name: 'Healthcare Funding',
    category: 'welfare',
    description: 'Public healthcare system funding.',
    defaultValue: 50,
    effects: {
      healthIndex: 0.6,
      gdpGrowth: 0.01,
      equality: 0.15,
    },
    budgetCostPerPoint: 0.8,
  },
  {
    id: 'education',
    name: 'Education Funding',
    category: 'welfare',
    description: 'Investment in schools, universities, and training.',
    defaultValue: 50,
    effects: {
      educationIndex: 0.6,
      gdpGrowth: 0.02,
      unemployment: -0.03,
      equality: 0.1,
    },
    budgetCostPerPoint: 0.7,
  },
  {
    id: 'pensions',
    name: 'Pension Spending',
    category: 'welfare',
    description: 'Support for retirees.',
    defaultValue: 45,
    effects: {
      equality: 0.15,
    },
    budgetCostPerPoint: 0.9,
  },
  {
    id: 'unemployment_benefits',
    name: 'Unemployment Benefits',
    category: 'welfare',
    description: 'Support for job seekers.',
    defaultValue: 40,
    effects: {
      equality: 0.2,
      unemployment: 0.02, // slight moral hazard
      crime: -0.15,
    },
    budgetCostPerPoint: 0.5,
  },
  {
    id: 'housing_subsidies',
    name: 'Housing Subsidies',
    category: 'welfare',
    description: 'Government support for affordable housing.',
    defaultValue: 30,
    effects: {
      equality: 0.2,
      healthIndex: 0.1,
    },
    budgetCostPerPoint: 0.6,
  },
  {
    id: 'foreign_aid',
    name: 'Foreign Aid',
    category: 'welfare',
    description: 'International development assistance.',
    defaultValue: 20,
    effects: {
      freedomIndex: 0.05,
      nationalSecurity: 0.05,
    },
    budgetCostPerPoint: 0.4,
  },

  // ===== SOCIETY =====
  {
    id: 'immigration',
    name: 'Immigration Policy',
    category: 'society',
    description: 'How open borders are. 0 = closed, 100 = open.',
    defaultValue: 50,
    effects: {
      gdpGrowth: 0.02,
      unemployment: 0.02,
      freedomIndex: 0.15,
      crime: 0.05,
    },
    budgetCostPerPoint: 0.1,
  },
  {
    id: 'civil_rights',
    name: 'Civil Rights Level',
    category: 'society',
    description: 'Protection of individual freedoms and rights.',
    defaultValue: 60,
    effects: {
      freedomIndex: 0.5,
      equality: 0.2,
      crime: 0.03,
    },
    budgetCostPerPoint: 0.1,
  },
  {
    id: 'press_freedom',
    name: 'Press Freedom',
    category: 'society',
    description: 'Media independence and freedom of speech.',
    defaultValue: 65,
    effects: {
      freedomIndex: 0.4,
    },
    budgetCostPerPoint: 0,
  },
  {
    id: 'drug_policy',
    name: 'Drug Policy',
    category: 'society',
    description: '0 = strict prohibition, 100 = full legalization.',
    defaultValue: 30,
    effects: {
      freedomIndex: 0.15,
      crime: -0.2,
      healthIndex: -0.05,
    },
    budgetCostPerPoint: -0.1, // slight revenue from legal drugs
  },
  {
    id: 'gun_control',
    name: 'Gun Control',
    category: 'society',
    description: '0 = no restrictions, 100 = strict control.',
    defaultValue: 50,
    effects: {
      crime: -0.2,
      freedomIndex: -0.1,
    },
    budgetCostPerPoint: 0.1,
  },
  {
    id: 'religious_freedom',
    name: 'Religious Freedom',
    category: 'society',
    description: 'Protection of religious practices and institutions.',
    defaultValue: 70,
    effects: {
      freedomIndex: 0.2,
      equality: 0.05,
    },
    budgetCostPerPoint: 0,
  },

  // ===== ENVIRONMENT =====
  {
    id: 'carbon_tax',
    name: 'Carbon Tax',
    category: 'environment',
    description: 'Tax on carbon emissions.',
    defaultValue: 20,
    effects: {
      pollution: -0.5,
      gdpGrowth: -0.03,
      inflation: 0.02,
    },
    budgetCostPerPoint: -0.5,
  },
  {
    id: 'renewables',
    name: 'Renewable Energy Subsidies',
    category: 'environment',
    description: 'Support for wind, solar, and clean energy.',
    defaultValue: 30,
    effects: {
      pollution: -0.3,
      gdpGrowth: 0.01,
    },
    budgetCostPerPoint: 0.6,
  },
  {
    id: 'env_regulations',
    name: 'Environmental Regulations',
    category: 'environment',
    description: 'Rules limiting industrial pollution.',
    defaultValue: 40,
    effects: {
      pollution: -0.4,
      gdpGrowth: -0.02,
      healthIndex: 0.1,
    },
    budgetCostPerPoint: 0.2,
  },
  {
    id: 'public_transport',
    name: 'Public Transport Investment',
    category: 'environment',
    description: 'Buses, trains, metro systems.',
    defaultValue: 35,
    effects: {
      pollution: -0.15,
      gdpGrowth: 0.01,
      equality: 0.1,
    },
    budgetCostPerPoint: 0.7,
  },

  // ===== SECURITY =====
  {
    id: 'police',
    name: 'Police Funding',
    category: 'security',
    description: 'Law enforcement budget.',
    defaultValue: 50,
    effects: {
      crime: -0.4,
      freedomIndex: -0.1,
      nationalSecurity: 0.15,
    },
    budgetCostPerPoint: 0.6,
  },
  {
    id: 'military',
    name: 'Military Spending',
    category: 'security',
    description: 'National defense budget.',
    defaultValue: 40,
    effects: {
      nationalSecurity: 0.5,
      gdpGrowth: -0.01,
    },
    budgetCostPerPoint: 1.0,
  },
  {
    id: 'intelligence',
    name: 'Intelligence Budget',
    category: 'security',
    description: 'Surveillance and intelligence services.',
    defaultValue: 30,
    effects: {
      nationalSecurity: 0.3,
      freedomIndex: -0.2,
      crime: -0.1,
    },
    budgetCostPerPoint: 0.5,
  },
  {
    id: 'border_security',
    name: 'Border Security',
    category: 'security',
    description: 'Immigration enforcement and border control.',
    defaultValue: 45,
    effects: {
      nationalSecurity: 0.2,
      crime: -0.05,
      freedomIndex: -0.05,
    },
    budgetCostPerPoint: 0.4,
  },

  // ===== INFRASTRUCTURE =====
  {
    id: 'roads_rail',
    name: 'Road & Rail Investment',
    category: 'infrastructure',
    description: 'Transportation infrastructure.',
    defaultValue: 40,
    effects: {
      gdpGrowth: 0.03,
      pollution: 0.05,
    },
    budgetCostPerPoint: 0.7,
  },
  {
    id: 'tech_research',
    name: 'Technology & Research',
    category: 'infrastructure',
    description: 'R&D and innovation funding.',
    defaultValue: 35,
    effects: {
      gdpGrowth: 0.04,
      educationIndex: 0.2,
      unemployment: -0.02,
    },
    budgetCostPerPoint: 0.6,
  },
  {
    id: 'agriculture',
    name: 'Agriculture Subsidies',
    category: 'infrastructure',
    description: 'Support for farming and food production.',
    defaultValue: 35,
    effects: {
      gdpGrowth: 0.01,
      pollution: 0.1,
      equality: 0.05,
    },
    budgetCostPerPoint: 0.5,
  },
  {
    id: 'urban_dev',
    name: 'Urban Development',
    category: 'infrastructure',
    description: 'City planning, housing, and urban infrastructure.',
    defaultValue: 40,
    effects: {
      gdpGrowth: 0.02,
      pollution: 0.05,
      healthIndex: 0.1,
      equality: 0.1,
    },
    budgetCostPerPoint: 0.6,
  },
];

export const POLICY_MAP = new Map(POLICIES.map(p => [p.id, p]));
export const POLICIES_BY_CATEGORY = POLICIES.reduce((acc, p) => {
  if (!acc[p.category]) acc[p.category] = [];
  acc[p.category].push(p);
  return acc;
}, {} as Record<string, PolicyDefinition[]>);
