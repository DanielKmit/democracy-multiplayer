import { PolicyDefinition, PolicyCategory } from './types';

// REALISTIC POLICY EFFECTS
// Key principle: EVERY policy has winners AND losers. Nothing is free.
// Sim effects show impact per point of deviation from 50 (center).
// Negative budgetCostPerPoint = revenue (taxes), Positive = spending.
//
// Remember: voters react to BOTH sim vars AND direct policy preferences.
// A policy might improve a sim var that a group cares about, but the group
// might STILL hate the policy if it goes against their direct interests.

export const POLICIES: PolicyDefinition[] = [
  // ===== ECONOMY =====
  {
    id: 'income_tax', name: 'Income Tax', category: 'economy',
    description: 'Tax rate on personal income. Funds government but hurts growth and angers earners.',
    defaultValue: 40,
    effects: {
      gdpGrowth: -0.04,    // High taxes hurt growth
      unemployment: 0.015,  // Slightly increases unemployment (less incentive to work)
      equality: 0.03,       // Redistribution effect
      inflation: -0.01,     // Slightly deflationary (less spending money)
    },
    budgetCostPerPoint: -0.8, // Revenue
  },
  {
    id: 'corporate_tax', name: 'Corporate Tax', category: 'economy',
    description: 'Tax rate on business profits. Revenue source but hurts investment and job creation.',
    defaultValue: 30,
    effects: {
      gdpGrowth: -0.05,     // Strongly hurts business growth
      unemployment: 0.025,   // Businesses hire less or leave
      equality: 0.02,        // Mild redistribution
      corruption: 0.01,      // Companies find loopholes when taxes high
    },
    budgetCostPerPoint: -0.6,
  },
  {
    id: 'trade_openness', name: 'Trade Openness', category: 'economy',
    description: 'How open the economy is to global trade. Boosts growth but exposes domestic workers.',
    defaultValue: 60,
    effects: {
      gdpGrowth: 0.03,       // Good for overall economy
      unemployment: 0.01,    // Some domestic jobs lost to competition
      equality: -0.03,       // Widens gap — capital owners benefit more
      inflation: -0.01,      // Cheaper imports
    },
    budgetCostPerPoint: 0.1,
  },
  {
    id: 'govt_spending', name: 'Government Spending', category: 'economy',
    description: 'Overall state expenditure level. Stimulates economy but risks inflation and debt.',
    defaultValue: 50,
    effects: {
      gdpGrowth: 0.02,       // Short-term stimulus
      unemployment: -0.02,   // Government creates jobs
      inflation: 0.04,       // More money chasing goods = inflation
      corruption: 0.02,      // More spending = more opportunities for graft
      equality: 0.01,        // Slight redistributive effect
    },
    budgetCostPerPoint: 0.8,
  },
  {
    id: 'minimum_wage', name: 'Minimum Wage', category: 'economy',
    description: 'Mandatory minimum pay. Helps low earners but increases costs for businesses.',
    defaultValue: 40,
    effects: {
      equality: 0.05,         // Directly helps low-wage workers
      unemployment: 0.03,     // Some businesses can\'t afford to hire
      gdpGrowth: -0.02,       // Increased costs slow growth
      inflation: 0.01,        // Wage-push inflation
    },
    budgetCostPerPoint: 0.1,
  },
  {
    id: 'tech_research', name: 'Technology & Research', category: 'economy',
    description: 'Investment in R&D. Long-term growth but expensive and benefits elites first.',
    defaultValue: 35,
    effects: {
      gdpGrowth: 0.04,       // Innovation drives growth
      educationIndex: 0.02,  // Knowledge spillover
      equality: -0.02,       // Tech benefits educated/wealthy first
      pollution: -0.01,      // Green tech potential
    },
    budgetCostPerPoint: 0.5,
  },

  // ===== WELFARE =====
  {
    id: 'healthcare', name: 'Healthcare', category: 'welfare',
    description: 'Public healthcare funding. Saves lives and improves productivity but costs a fortune.',
    defaultValue: 50,
    effects: {
      healthIndex: 0.08,     // Direct health improvement
      gdpGrowth: -0.015,    // Costs drag on economy
      unemployment: -0.01,  // Healthy workers miss fewer days
      equality: 0.02,        // Poor get access to care
      inflation: 0.01,       // Healthcare spending is inflationary
    },
    budgetCostPerPoint: 0.7, // Expensive
  },
  {
    id: 'education', name: 'Education', category: 'welfare',
    description: 'Schools and universities. Long-term investment but expensive and slow to pay off.',
    defaultValue: 50,
    effects: {
      educationIndex: 0.08,  // Direct improvement
      gdpGrowth: 0.01,       // Educated workforce
      equality: 0.02,        // Social mobility
      crime: -0.02,          // Educated youth less likely to turn to crime
      corruption: -0.01,     // Educated citizens fight corruption
    },
    budgetCostPerPoint: 0.5,
  },
  {
    id: 'housing_subsidies', name: 'Housing Subsidies', category: 'welfare',
    description: 'Government support for affordable housing. Helps poor but distorts markets.',
    defaultValue: 30,
    effects: {
      equality: 0.03,        // Helps low-income
      healthIndex: 0.01,     // Stable housing = better health
      gdpGrowth: -0.01,      // Market distortion
      inflation: 0.01,       // Can push up housing prices
    },
    budgetCostPerPoint: 0.4,
  },
  {
    id: 'unemployment_benefits', name: 'Unemployment Benefits', category: 'welfare',
    description: 'Safety net for jobless. Prevents poverty but may reduce work incentive.',
    defaultValue: 40,
    effects: {
      equality: 0.03,         // Reduces poverty
      crime: -0.03,           // Desperate people commit fewer crimes
      unemployment: 0.01,     // Slight moral hazard — less urgency to find work
      gdpGrowth: -0.01,       // Costs money
    },
    budgetCostPerPoint: 0.5,
  },
  {
    id: 'pensions', name: 'Pensions', category: 'welfare',
    description: 'State pensions for retirees. Essential for elderly but massively expensive.',
    defaultValue: 45,
    effects: {
      equality: 0.02,         // Helps elderly poor
      healthIndex: 0.01,      // Retirees can afford care
      gdpGrowth: -0.02,       // Huge drain on budget
      inflation: 0.01,        // More spending power for retirees
    },
    budgetCostPerPoint: 0.7, // Very expensive
  },

  // ===== SOCIETY =====
  {
    id: 'civil_rights', name: 'Civil Rights', category: 'society',
    description: 'Individual freedoms. Beloved by liberals but seen as permissiveness by conservatives.',
    defaultValue: 60,
    effects: {
      freedomIndex: 0.08,     // Direct freedom boost
      equality: 0.02,         // Minority protections
      crime: 0.01,            // Some see more freedom = more disorder
      nationalSecurity: -0.01, // Harder to surveil
    },
    budgetCostPerPoint: 0.15,
  },
  {
    id: 'press_freedom', name: 'Press Freedom', category: 'society',
    description: 'Media independence. Exposes corruption but also exposes government failures.',
    defaultValue: 65,
    effects: {
      freedomIndex: 0.06,     // Freedom boost
      corruption: -0.04,      // Journalists expose corruption
      nationalSecurity: -0.02, // Leaks happen
    },
    budgetCostPerPoint: 0.05,
  },
  {
    id: 'immigration', name: 'Immigration Policy', category: 'society',
    description: 'Border openness. Cheap labor and diversity vs wage pressure and cultural tension.',
    defaultValue: 50,
    effects: {
      gdpGrowth: 0.02,        // Immigrants boost economy
      crime: 0.015,            // Some increase (perception or real)
      violentCrime: 0.005,     // Perception-driven or real (small)
      freedomIndex: 0.02,      // Open society
      equality: -0.02,         // Wage competition hurts poorest
      unemployment: 0.015,     // More labor supply pressures jobs
      healthIndex: -0.005,     // Strain on public health system
    },
    budgetCostPerPoint: 0.2,
  },
  {
    id: 'drug_policy', name: 'Drug Policy', category: 'society',
    description: 'Prohibition (0) to legalization (100). Liberalization reduces crime but health risks.',
    defaultValue: 30,
    effects: {
      freedomIndex: 0.03,      // Personal freedom
      crime: -0.03,            // Legal = less black market
      propertyCrime: -0.02,    // Less desperation crime from addicts
      healthIndex: -0.02,      // More access = more health issues
      corruption: -0.01,       // Less drug money corruption
    },
    budgetCostPerPoint: 0.1,
  },
  {
    id: 'religious_freedom', name: 'Religious Freedom', category: 'society',
    description: 'Protection of religious practice. Unity for faithful, tension with secularists.',
    defaultValue: 70,
    effects: {
      freedomIndex: 0.03,      // Religious liberty
      equality: -0.01,         // Some religions restrict equality
    },
    budgetCostPerPoint: 0.05,
  },
  {
    id: 'gun_control', name: 'Gun Control', category: 'society',
    description: 'Firearms restrictions. Reduces violence but infuriates gun owners and rural folk.',
    defaultValue: 60,
    effects: {
      crime: -0.03,            // Fewer gun crimes
      violentCrime: -0.03,     // Gun control directly reduces violence
      freedomIndex: -0.03,     // Restricts liberty
      nationalSecurity: 0.01,  // Less armed populace = easier security
    },
    budgetCostPerPoint: 0.1,
  },

  // ===== ENVIRONMENT =====
  {
    id: 'env_regulations', name: 'Environmental Regulations', category: 'environment',
    description: 'Pollution rules. Saves the planet but kills jobs and raises costs for business.',
    defaultValue: 40,
    effects: {
      pollution: -0.07,        // Strong pollution reduction
      gdpGrowth: -0.03,        // Real cost to business
      unemployment: 0.015,     // Some factories close
      healthIndex: 0.02,       // Cleaner air = healthier people
    },
    budgetCostPerPoint: 0.3,
  },
  {
    id: 'renewables', name: 'Renewable Energy', category: 'environment',
    description: 'Solar, wind, clean energy. Expensive upfront, long-term benefits.',
    defaultValue: 30,
    effects: {
      pollution: -0.04,        // Cleaner energy
      gdpGrowth: -0.01,        // Short-term cost
      inflation: 0.01,         // Higher energy costs initially
    },
    budgetCostPerPoint: 0.5, // Expensive
  },
  {
    id: 'carbon_tax', name: 'Carbon Tax', category: 'environment',
    description: 'Tax on emissions. Revenue generator but raises prices for everything.',
    defaultValue: 20,
    effects: {
      pollution: -0.05,        // Discourages emissions
      gdpGrowth: -0.03,        // Raises business costs
      inflation: 0.02,         // Everything gets more expensive
      equality: -0.01,         // Regressive — poor spend more on energy
    },
    budgetCostPerPoint: -0.3, // Revenue
  },
  {
    id: 'agriculture', name: 'Agriculture Policy', category: 'environment',
    description: 'Farm subsidies and rural support. Feeds the nation but costly and can pollute.',
    defaultValue: 35,
    effects: {
      pollution: 0.02,         // Industrial farming pollutes
      gdpGrowth: 0.005,        // Small economic benefit
      equality: 0.01,          // Rural poverty reduction
      healthIndex: 0.01,       // Food security
    },
    budgetCostPerPoint: 0.3,
  },

  // ===== SECURITY =====
  {
    id: 'police', name: 'Police Funding', category: 'security',
    description: 'Law enforcement. Reduces crime but risks over-policing and civil rights erosion.',
    defaultValue: 50,
    effects: {
      crime: -0.06,            // Directly fights crime
      violentCrime: -0.04,     // Patrols reduce violence
      propertyCrime: -0.04,    // Patrols reduce theft
      freedomIndex: -0.03,     // More police = less personal freedom
      nationalSecurity: 0.02,  // Internal security
      corruption: 0.01,        // Police corruption possible at high levels
    },
    budgetCostPerPoint: 0.5,
  },
  {
    id: 'military', name: 'Military', category: 'security',
    description: 'National defense. Essential for security but massive money drain.',
    defaultValue: 40,
    effects: {
      nationalSecurity: 0.06,  // Strong defense
      gdpGrowth: -0.02,        // Guns not butter
      freedomIndex: -0.01,     // Militarism
    },
    budgetCostPerPoint: 0.8, // Very expensive
  },
  {
    id: 'intelligence', name: 'Intelligence Services', category: 'security',
    description: 'Spying and surveillance. Prevents threats but erodes privacy and freedom.',
    defaultValue: 30,
    effects: {
      nationalSecurity: 0.04,  // Counter-terrorism etc
      freedomIndex: -0.04,     // Mass surveillance
      corruption: -0.02,       // Can expose corruption
      crime: -0.01,            // Intel helps fight crime
      whiteCollarCrime: -0.03, // Intelligence exposes financial crime
    },
    budgetCostPerPoint: 0.4,
  },
  {
    id: 'border_security', name: 'Border Security', category: 'security',
    description: 'Border patrol and customs. Reduces illegal entry but costly and restricts movement.',
    defaultValue: 45,
    effects: {
      nationalSecurity: 0.03,  // Secure borders
      crime: -0.02,            // Less smuggling
      violentCrime: -0.01,     // Reduces cross-border violence
      propertyCrime: -0.01,    // Less smuggling-related theft
      freedomIndex: -0.02,     // Movement restrictions
      gdpGrowth: -0.01,        // Trade friction
    },
    budgetCostPerPoint: 0.3,
  },

  // ===== INFRASTRUCTURE =====
  {
    id: 'public_transport', name: 'Public Transport', category: 'infrastructure',
    description: 'Buses, trains, metro. Helps workers commute but costs money and takes years.',
    defaultValue: 40,
    effects: {
      pollution: -0.02,        // Less car use
      gdpGrowth: 0.01,         // Better mobility
      unemployment: -0.01,    // Workers can reach jobs
      equality: 0.02,          // Poor can commute
      healthIndex: 0.005,      // Less pollution = health
    },
    budgetCostPerPoint: 0.5,
  },
  {
    id: 'roads_rail', name: 'Roads & Rail', category: 'infrastructure',
    description: 'National road and rail network. Economic enabler but environmentally costly.',
    defaultValue: 50,
    effects: {
      gdpGrowth: 0.02,         // Economic connectivity
      pollution: 0.015,        // More traffic, construction
    },
    budgetCostPerPoint: 0.6,
  },
  {
    id: 'urban_dev', name: 'Urban Development', category: 'infrastructure',
    description: 'City planning and renewal. Modernizes cities but gentrification displaces poor.',
    defaultValue: 40,
    effects: {
      gdpGrowth: 0.01,         // Economic development
      pollution: 0.01,          // Construction pollution
      healthIndex: 0.01,        // Better living conditions
      equality: -0.01,          // Gentrification
    },
    budgetCostPerPoint: 0.4,
  },
  {
    id: 'foreign_aid', name: 'Foreign Aid', category: 'infrastructure',
    description: 'International aid. Builds goodwill abroad but voters hate "sending money away".',
    defaultValue: 25,
    effects: {
      nationalSecurity: 0.015,  // Soft power, alliances
      gdpGrowth: -0.015,        // Money leaves the country
      corruption: 0.005,        // Aid money gets skimmed
    },
    budgetCostPerPoint: 0.3,
  },
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
