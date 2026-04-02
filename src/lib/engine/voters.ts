import { VoterGroupDefinition } from './types';

// REALISTIC VOTER GROUP PREFERENCES
// Key principle: Every group has CLEAR likes and dislikes.
// Policy preferences are on 0-100 scale: where this group wants the policy.
// If current policy is far from their ideal, they're unhappy.
//
// Tax preferences: Low value = they want LOW taxes. High value = they accept high taxes.
// Spending preferences: High value = they want HIGH spending on this.
//
// IMPORTANT: Nobody likes taxes on THEMSELVES.
// - Workers don't want high income tax (it hits them directly)
// - Business doesn't want high corporate tax
// - Everyone wants services funded but nobody wants to pay for them
// - This tension is the core of the game

export const VOTER_GROUPS: VoterGroupDefinition[] = [
  {
    id: 'workers',
    name: 'Workers',
    populationShare: 0.18,
    concerns: {
      unemployment: -0.9,   // #1 concern: losing their job
      inflation: -0.5,      // Prices eating their wages
      equality: 0.5,        // Want fairness
      gdpGrowth: 0.2,       // Care a bit about economy
      healthIndex: 0.3,     // Need affordable healthcare
    },
    policyPreferences: {
      minimum_wage: 80,           // Want high minimum wage
      unemployment_benefits: 75,  // Strong safety net
      healthcare: 80,             // Free healthcare
      pensions: 70,               // Good retirement
      education: 60,              // Decent schools
      income_tax: 30,             // DON'T want high income tax (hits them!)
      corporate_tax: 65,          // Tax the rich/corps instead
      housing_subsidies: 70,      // Affordable housing
      trade_openness: 35,         // Wary of cheap imports killing jobs
      env_regulations: 35,        // Worried regulations kill factory jobs
    },
  },
  {
    id: 'business',
    name: 'Business Owners',
    populationShare: 0.12,
    concerns: {
      gdpGrowth: 0.9,       // Economy is everything
      inflation: -0.4,      // Hurts planning
      whiteCollarCrime: -0.6, // Corporate crime hurts business trust
      corruption: -0.5,     // Want clean markets
      unemployment: -0.2,   // Need workers, but not too worried
    },
    policyPreferences: {
      corporate_tax: 15,          // HATE corporate tax
      income_tax: 20,             // Want low taxes overall
      trade_openness: 85,         // Free markets
      govt_spending: 25,          // Small government
      env_regulations: 20,        // Regulations = costs
      tech_research: 75,          // Innovation good for business
      minimum_wage: 20,           // High min wage = expensive labor
      renewables: 30,             // Expensive green energy? No thanks
      carbon_tax: 10,             // Another tax? No.
      press_freedom: 55,          // Moderately like free press
      civil_rights: 45,           // Don't care much either way
    },
  },
  {
    id: 'youth',
    name: 'Youth & Students',
    populationShare: 0.14,
    concerns: {
      freedomIndex: 0.7,     // Want personal freedom
      educationIndex: 0.8,   // #1: their future
      unemployment: -0.6,    // Need jobs after graduating
      pollution: -0.5,       // Climate matters
    },
    policyPreferences: {
      education: 90,              // Top priority
      civil_rights: 85,           // Freedom
      drug_policy: 70,            // Liberalization
      press_freedom: 80,          // Information freedom
      tech_research: 75,          // Innovation and jobs
      renewables: 80,             // Climate action
      env_regulations: 75,        // Protect the planet
      housing_subsidies: 75,      // Can't afford rent
      income_tax: 40,             // Don't earn much, don't want taxes
      military: 20,               // Rather spend on education
      immigration: 70,            // Open and diverse
      carbon_tax: 60,             // Accept for climate
    },
  },
  {
    id: 'retirees',
    name: 'Retirees & Elderly',
    populationShare: 0.15,
    concerns: {
      healthIndex: 0.9,      // Health is #1
      violentCrime: -0.7,    // Fear violent crime specifically
      inflation: -0.7,       // Fixed income destroyed by inflation
      nationalSecurity: 0.3, // Want stability
    },
    policyPreferences: {
      pensions: 90,               // ESSENTIAL
      healthcare: 90,             // ESSENTIAL
      police: 70,                 // Safety
      military: 55,               // Traditional values
      immigration: 30,            // Cautious about change
      income_tax: 35,             // Don't want taxes on savings
      drug_policy: 20,            // Conservative on drugs
      gun_control: 55,            // Moderate
      civil_rights: 40,           // Traditional values
      religious_freedom: 65,      // Faith matters
      border_security: 60,        // Security
    },
  },
  {
    id: 'urban',
    name: 'Urban Professionals',
    populationShare: 0.11,
    concerns: {
      gdpGrowth: 0.5,        // Career and income
      propertyCrime: -0.5,   // Property theft in cities
      pollution: -0.5,       // Quality of life in cities
      freedomIndex: 0.4,     // Value liberties
      educationIndex: 0.4,   // Educated themselves, value it
    },
    policyPreferences: {
      public_transport: 80,       // Need it daily
      urban_dev: 75,              // Better cities
      tech_research: 70,          // Innovation economy
      education: 70,              // Good schools for kids
      housing_subsidies: 50,      // Some earn enough, some don't
      env_regulations: 60,        // Want clean air
      income_tax: 30,             // DON'T want high taxes (they earn well)
      corporate_tax: 35,          // Work for corporations
      press_freedom: 70,          // Informed class
      civil_rights: 65,           // Liberal but moderate
      trade_openness: 65,         // Globalized jobs
    },
  },
  {
    id: 'rural',
    name: 'Rural Communities',
    populationShare: 0.10,
    concerns: {
      unemployment: -0.6,    // Rural jobs scarce
      crime: -0.4,           // Safety in small towns
      gdpGrowth: 0.3,        // Economic survival
    },
    policyPreferences: {
      agriculture: 90,            // Farming is life
      roads_rail: 80,             // Need infrastructure
      border_security: 65,        // Control borders
      gun_control: 15,            // HATE gun control
      immigration: 25,            // Wary of change
      religious_freedom: 75,      // Traditional faith
      income_tax: 25,             // Low taxes
      corporate_tax: 40,          // Don't care much
      env_regulations: 25,        // Regulations hurt farming
      public_transport: 30,       // No trains out here
      civil_rights: 35,           // Traditional values
      trade_openness: 40,         // Cheap imports hurt local farms
      minimum_wage: 35,           // Small businesses can't afford it
    },
  },
  {
    id: 'environmentalists',
    name: 'Environmentalists',
    populationShare: 0.06,
    concerns: {
      pollution: -0.95,      // THE priority
      healthIndex: 0.4,      // Health from clean air
      freedomIndex: 0.2,     // Value protest rights
    },
    policyPreferences: {
      env_regulations: 95,        // Maximum regulation
      renewables: 95,             // Green energy
      carbon_tax: 90,             // Price carbon
      public_transport: 80,       // Less cars
      agriculture: 35,            // Sustainable only
      roads_rail: 30,             // Less roads, more rail
      urban_dev: 50,              // Depends on approach
      military: 15,               // Spend on green not guns
      trade_openness: 40,         // Shipping = pollution
      corporate_tax: 60,          // Tax polluters
      tech_research: 60,          // Green tech yes
    },
  },
  {
    id: 'religious',
    name: 'Religious Communities',
    populationShare: 0.05,
    concerns: {
      crime: -0.6,           // Moral order
      freedomIndex: -0.3,    // Too much freedom = moral decay
      equality: 0.2,         // Charity and compassion
    },
    policyPreferences: {
      religious_freedom: 95,      // Non-negotiable
      drug_policy: 10,            // Prohibition
      immigration: 35,            // Cautious
      civil_rights: 30,           // Clashes with traditional values
      gun_control: 40,            // Moderate
      police: 65,                 // Order
      pensions: 65,               // Care for elderly
      healthcare: 60,             // Compassion
      education: 55,              // Religious education
      press_freedom: 40,          // Don't like mockery of faith
      minimum_wage: 55,           // Help the poor
    },
  },
  {
    id: 'liberals',
    name: 'Liberals & Progressives',
    populationShare: 0.05,
    concerns: {
      freedomIndex: 0.95,    // Freedom is everything
      equality: 0.7,         // Social justice
      corruption: -0.5,      // Accountability
    },
    policyPreferences: {
      civil_rights: 95,           // Maximum rights
      press_freedom: 90,          // Free press
      immigration: 80,            // Open borders
      drug_policy: 80,            // Legalize
      police: 25,                 // Less policing
      military: 20,               // Anti-militarist
      intelligence: 15,           // Privacy > surveillance
      gun_control: 75,            // Control guns
      border_security: 20,        // Open borders
      income_tax: 60,             // Accept taxes for services
      corporate_tax: 70,          // Tax the rich
      env_regulations: 75,        // Protect environment
      healthcare: 80,             // Universal healthcare
      education: 80,              // Free education
    },
  },
  {
    id: 'patriots',
    name: 'Patriots & Nationalists',
    populationShare: 0.04,
    concerns: {
      nationalSecurity: 0.95, // #1: protect the nation
      violentCrime: -0.6,     // All crime types matter
      propertyCrime: -0.4,
      crime: -0.3,            // General law and order
    },
    policyPreferences: {
      military: 90,               // Strong military
      border_security: 90,        // Secure borders
      intelligence: 80,           // Know your enemies
      immigration: 10,            // CLOSED borders
      foreign_aid: 10,            // Keep money home
      police: 80,                 // Law and order
      gun_control: 10,            // Armed citizens
      civil_rights: 25,           // Security > freedom
      press_freedom: 30,          // Don't expose secrets
      trade_openness: 30,         // Protect domestic industry
      corporate_tax: 30,          // Don't drive business away
      income_tax: 30,             // Low taxes
      religious_freedom: 60,      // Traditional values
    },
  },
];
