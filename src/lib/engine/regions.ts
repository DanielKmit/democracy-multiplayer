import { RegionDefinition } from './types';

export const REGIONS: RegionDefinition[] = [
  {
    id: 'capitalis',
    name: 'Capitalis',
    description: 'The capital region — urban, wealthy, and cosmopolitan.',
    populationShare: 0.25,
    seats: 25,
    economicLean: 55,   // slightly center-right
    socialLean: 75,      // liberal
    dominantGroups: ['urban', 'business', 'liberals', 'youth'],
    characteristics: 'Financial hub, tech startups, cultural center',
    keyIssues: ['Housing costs', 'Public transport', 'Tech economy', 'Civil liberties'],
    policyWeights: {
      urban_dev: 2.0,
      public_transport: 1.8,
      housing_subsidies: 1.6,
      tech_research: 1.5,
      civil_rights: 1.5,
      press_freedom: 1.4,
      corporate_tax: 1.3,
    },
  },
  {
    id: 'nordmark',
    name: 'Nordmark',
    description: 'Industrial heartland — factories, unions, and working-class pride.',
    populationShare: 0.20,
    seats: 20,
    economicLean: 30,    // left-leaning
    socialLean: 45,      // slightly authoritarian
    dominantGroups: ['workers', 'retirees', 'urban'],
    characteristics: 'Heavy industry, manufacturing, strong unions',
    keyIssues: ['Factory jobs', 'Workers rights', 'Healthcare', 'Pensions'],
    policyWeights: {
      minimum_wage: 2.0,
      unemployment_benefits: 1.8,
      healthcare: 1.7,
      pensions: 1.6,
      education: 1.3,
      trade_openness: 1.5,
    },
  },
  {
    id: 'sudfeld',
    name: 'Sudfeld',
    description: 'Southern agricultural heartland — traditional values and farming communities.',
    populationShare: 0.18,
    seats: 18,
    economicLean: 60,    // center-right
    socialLean: 30,      // conservative/authoritarian
    dominantGroups: ['rural', 'religious', 'retirees'],
    characteristics: 'Farmland, vineyards, traditional culture',
    keyIssues: ['Agriculture subsidies', 'Religious values', 'Immigration control', 'Rural infrastructure'],
    policyWeights: {
      agriculture: 2.5,
      religious_freedom: 2.0,
      immigration: 1.8,
      border_security: 1.6,
      roads_rail: 1.5,
      gun_control: 1.3,
    },
  },
  {
    id: 'ostwald',
    name: 'Ostwald',
    description: 'Eastern swing region — diverse economy, politically unpredictable.',
    populationShare: 0.15,
    seats: 15,
    economicLean: 50,    // centrist
    socialLean: 50,      // centrist
    dominantGroups: ['workers', 'youth', 'business'],
    characteristics: 'Mixed economy, university towns, diverse demographics',
    keyIssues: ['Education', 'Employment', 'Development', 'Healthcare'],
    policyWeights: {
      education: 1.8,
      healthcare: 1.5,
      govt_spending: 1.4,
      tech_research: 1.3,
      unemployment_benefits: 1.3,
    },
  },
  {
    id: 'westhafen',
    name: 'Westhafen',
    description: 'Western coastal region — ports, trade, and international connections.',
    populationShare: 0.13,
    seats: 13,
    economicLean: 65,    // right-leaning
    socialLean: 60,      // moderately liberal
    dominantGroups: ['business', 'liberals', 'workers'],
    characteristics: 'Major port city, international trade, shipping industry',
    keyIssues: ['Trade agreements', 'Port infrastructure', 'Foreign policy', 'Environment'],
    policyWeights: {
      trade_openness: 2.5,
      foreign_aid: 1.5,
      roads_rail: 1.4,
      env_regulations: 1.3,
      corporate_tax: 1.5,
      immigration: 1.2,
    },
  },
  {
    id: 'bergland',
    name: 'Bergland',
    description: 'Mountainous rural region — traditional, self-reliant, and proud.',
    populationShare: 0.09,
    seats: 9,
    economicLean: 55,    // slightly right
    socialLean: 25,      // strongly conservative
    dominantGroups: ['rural', 'religious', 'patriots'],
    characteristics: 'Mountain villages, mining, timber, tourism',
    keyIssues: ['Agriculture', 'Military/defense', 'Traditional values', 'Border security'],
    policyWeights: {
      agriculture: 2.0,
      military: 1.8,
      border_security: 1.7,
      religious_freedom: 1.6,
      env_regulations: 1.5,
      gun_control: 1.5,
      immigration: 1.4,
    },
  },
];

export const REGION_MAP = new Map(REGIONS.map(r => [r.id, r]));
