import { VoterGroupDefinition } from './types';

export const VOTER_GROUPS: VoterGroupDefinition[] = [
  {
    id: 'workers',
    name: 'Workers',
    populationShare: 0.15,
    concerns: {
      unemployment: -0.8,   // hate unemployment
      equality: 0.6,
      gdpGrowth: 0.4,
      healthIndex: 0.3,
    },
    policyPreferences: {
      minimum_wage: 70,
      unemployment_benefits: 65,
      income_tax: 45,     // moderate tax
      healthcare: 70,
      education: 60,
    },
  },
  {
    id: 'business',
    name: 'Business Owners',
    populationShare: 0.10,
    concerns: {
      gdpGrowth: 0.9,
      unemployment: -0.3,
      inflation: -0.5,
    },
    policyPreferences: {
      corporate_tax: 20,
      income_tax: 25,
      trade_openness: 80,
      env_regulations: 25,
      minimum_wage: 25,
    },
  },
  {
    id: 'youth',
    name: 'Youth',
    populationShare: 0.12,
    concerns: {
      educationIndex: 0.7,
      pollution: -0.6,
      freedomIndex: 0.5,
      equality: 0.4,
      unemployment: -0.5,
    },
    policyPreferences: {
      education: 80,
      housing_subsidies: 75,
      carbon_tax: 60,
      renewables: 70,
      civil_rights: 80,
      drug_policy: 65,
    },
  },
  {
    id: 'retirees',
    name: 'Retirees',
    populationShare: 0.13,
    concerns: {
      healthIndex: 0.8,
      inflation: -0.6,
      crime: -0.5,
    },
    policyPreferences: {
      pensions: 85,
      healthcare: 80,
      police: 60,
      immigration: 35,
    },
  },
  {
    id: 'environmentalists',
    name: 'Environmentalists',
    populationShare: 0.08,
    concerns: {
      pollution: -0.9,
      healthIndex: 0.4,
      freedomIndex: 0.3,
    },
    policyPreferences: {
      carbon_tax: 80,
      renewables: 85,
      env_regulations: 80,
      public_transport: 75,
      agriculture: 30,
    },
  },
  {
    id: 'patriots',
    name: 'Patriots',
    populationShare: 0.10,
    concerns: {
      nationalSecurity: 0.8,
      crime: -0.5,
      gdpGrowth: 0.3,
    },
    policyPreferences: {
      military: 80,
      border_security: 80,
      immigration: 15,
      intelligence: 65,
      foreign_aid: 15,
    },
  },
  {
    id: 'liberals',
    name: 'Liberals',
    populationShare: 0.10,
    concerns: {
      freedomIndex: 0.9,
      equality: 0.6,
      crime: -0.2,
    },
    policyPreferences: {
      civil_rights: 85,
      press_freedom: 85,
      drug_policy: 70,
      immigration: 75,
      intelligence: 20,
      gun_control: 65,
    },
  },
  {
    id: 'religious',
    name: 'Religious',
    populationShare: 0.08,
    concerns: {
      freedomIndex: 0.3,
      crime: -0.5,
      equality: 0.2,
    },
    policyPreferences: {
      religious_freedom: 90,
      drug_policy: 15,
      foreign_aid: 55,
      gun_control: 30,
      immigration: 40,
    },
  },
  {
    id: 'rural',
    name: 'Rural',
    populationShare: 0.07,
    concerns: {
      gdpGrowth: 0.4,
      unemployment: -0.5,
      crime: -0.3,
    },
    policyPreferences: {
      agriculture: 80,
      roads_rail: 70,
      gun_control: 20,
      env_regulations: 25,
      border_security: 60,
    },
  },
  {
    id: 'urban',
    name: 'Urban',
    populationShare: 0.07,
    concerns: {
      pollution: -0.5,
      gdpGrowth: 0.4,
      educationIndex: 0.4,
      healthIndex: 0.3,
      crime: -0.4,
    },
    policyPreferences: {
      public_transport: 80,
      urban_dev: 75,
      housing_subsidies: 65,
      gun_control: 65,
      police: 55,
    },
  },
];

export const VOTER_GROUP_MAP = new Map(VOTER_GROUPS.map(g => [g.id, g]));
