import { SimulationState, SimVarKey } from './types';

export interface RegionalEventDefinition {
  id: string;
  name: string;
  description: string;
  regionId: string;
  icon: string;
  triggerCondition: (policies: Record<string, number>, sim: SimulationState) => boolean;
  effects: Partial<Record<SimVarKey, number>>;
  satisfactionImpact: number; // affects only that region
  duration: number; // turns
}

export const REGIONAL_EVENTS: RegionalEventDefinition[] = [
  {
    id: 'tech_boom_capitalis',
    name: 'Tech Boom in Capitalis',
    description: 'A thriving tech ecosystem is driving innovation and attracting talent to the capital.',
    regionId: 'capitalis',
    icon: '💻',
    triggerCondition: (p) => (p.tech_research ?? 35) > 70 && (p.education ?? 50) > 60,
    effects: { gdpGrowth: 1, unemployment: -1 },
    satisfactionImpact: 10,
    duration: 3,
  },
  {
    id: 'factory_closures_nordmark',
    name: 'Factory Closures in Nordmark',
    description: 'Major manufacturers are shutting down operations, leaving thousands jobless.',
    regionId: 'nordmark',
    icon: '🏭',
    triggerCondition: (p, sim) => sim.unemployment > 15 || ((p.minimum_wage ?? 40) > 70 && (p.trade_openness ?? 60) > 70),
    effects: { unemployment: 2 },
    satisfactionImpact: -15,
    duration: 3,
  },
  {
    id: 'agricultural_crisis_sudfeld',
    name: 'Agricultural Crisis in Sudfeld',
    description: 'Failing crops and declining subsidies threaten the livelihoods of southern farmers.',
    regionId: 'sudfeld',
    icon: '🌾',
    triggerCondition: (p) => (p.agriculture ?? 35) < 30,
    effects: { gdpGrowth: -0.5 },
    satisfactionImpact: -15,
    duration: 2,
  },
  {
    id: 'housing_bubble_westhafen',
    name: 'Housing Bubble in Westhafen',
    description: 'Property prices soar beyond reach as speculation runs rampant in the port city.',
    regionId: 'westhafen',
    icon: '🏠',
    triggerCondition: (p) => (p.housing_subsidies ?? 50) < 25 && (p.trade_openness ?? 60) > 70,
    effects: { equality: -5 },
    satisfactionImpact: -10,
    duration: 3,
  },
  {
    id: 'mining_disaster_bergland',
    name: 'Mining Disaster in Bergland',
    description: 'A catastrophic mine collapse kills dozens. Safety regulations were inadequate.',
    regionId: 'bergland',
    icon: '⛏️',
    triggerCondition: (p) => (p.env_regulations ?? 40) < 25 && (p.police ?? 50) < 30,
    effects: { healthIndex: -5 },
    satisfactionImpact: -20,
    duration: 2,
  },
  {
    id: 'university_expansion_ostwald',
    name: 'University Expansion in Ostwald',
    description: 'New university campuses attract students and researchers from across Novaria.',
    regionId: 'ostwald',
    icon: '🎓',
    triggerCondition: (p) => (p.education ?? 50) > 70,
    effects: { educationIndex: 5 },
    satisfactionImpact: 10,
    duration: 3,
  },
  {
    id: 'port_strike_westhafen',
    name: 'Port Strike in Westhafen',
    description: 'Dock workers walk off the job, disrupting international trade routes.',
    regionId: 'westhafen',
    icon: '⚓',
    triggerCondition: (p) => (p.minimum_wage ?? 40) < 30,
    effects: { gdpGrowth: -1 },
    satisfactionImpact: -10,
    duration: 2,
  },
  {
    id: 'tourism_boom_bergland',
    name: 'Tourism Boom in Bergland',
    description: 'Pristine mountain landscapes draw record numbers of tourists.',
    regionId: 'bergland',
    icon: '🏔️',
    triggerCondition: (p, sim) => (p.env_regulations ?? 40) > 60 && sim.pollution < 40,
    effects: { gdpGrowth: 0.5 },
    satisfactionImpact: 15,
    duration: 3,
  },
  {
    id: 'cultural_festival_capitalis',
    name: 'Cultural Festival in Capitalis',
    description: 'An international arts and culture festival puts Capitalis on the world stage.',
    regionId: 'capitalis',
    icon: '🎭',
    triggerCondition: (p) => (p.education ?? 50) > 55 && (p.press_freedom ?? 65) > 60,
    effects: { freedomIndex: 3 },
    satisfactionImpact: 8,
    duration: 2,
  },
  {
    id: 'rural_depopulation_sudfeld',
    name: 'Rural Depopulation in Sudfeld',
    description: 'Young people flee to cities, leaving aging communities behind.',
    regionId: 'sudfeld',
    icon: '🏚️',
    triggerCondition: (p) => (p.urban_dev ?? 50) > 70 && (p.agriculture ?? 35) < 40,
    effects: { unemployment: 1 },
    satisfactionImpact: -12,
    duration: 3,
  },
  {
    id: 'shipyard_revival_westhafen',
    name: 'Shipyard Revival in Westhafen',
    description: 'New orders flood in as global trade booms and shipbuilding returns.',
    regionId: 'westhafen',
    icon: '🚢',
    triggerCondition: (p) => (p.trade_openness ?? 60) > 65 && (p.corporate_tax ?? 30) < 40,
    effects: { gdpGrowth: 1, unemployment: -1 },
    satisfactionImpact: 12,
    duration: 3,
  },
  {
    id: 'forest_fire_bergland',
    name: 'Forest Fire in Bergland',
    description: 'Devastating wildfires sweep through mountain forests, destroying homes and habitat.',
    regionId: 'bergland',
    icon: '🔥',
    triggerCondition: (p, sim) => (p.env_regulations ?? 40) < 30 && sim.pollution > 60,
    effects: { pollution: 5, healthIndex: -3 },
    satisfactionImpact: -15,
    duration: 2,
  },
  {
    id: 'tech_startup_hub_ostwald',
    name: 'Tech Startup Hub in Ostwald',
    description: 'A wave of tech startups transforms Ostwald into an innovation hotspot.',
    regionId: 'ostwald',
    icon: '🚀',
    triggerCondition: (p) => (p.tech_research ?? 35) > 60 && (p.corporate_tax ?? 30) < 35,
    effects: { gdpGrowth: 0.5 },
    satisfactionImpact: 8,
    duration: 3,
  },
  {
    id: 'pension_protest_nordmark',
    name: 'Pension Protest in Nordmark',
    description: 'Retirees take to the streets demanding better pensions and elderly care.',
    regionId: 'nordmark',
    icon: '✊',
    triggerCondition: (p) => (p.pensions ?? 45) < 25,
    effects: { crime: 3 },
    satisfactionImpact: -12,
    duration: 2,
  },
  {
    id: 'green_energy_capitalis',
    name: 'Green Energy Initiative in Capitalis',
    description: 'The capital leads the nation in renewable energy adoption.',
    regionId: 'capitalis',
    icon: '♻️',
    triggerCondition: (p) => (p.renewables ?? 30) > 65 && (p.carbon_tax ?? 20) > 50,
    effects: { pollution: -5 },
    satisfactionImpact: 10,
    duration: 3,
  },
];

export function checkRegionalEvents(
  policies: Record<string, number>,
  sim: SimulationState,
  activeRegionalEventIds: string[],
): string[] {
  const triggered: string[] = [];
  for (const event of REGIONAL_EVENTS) {
    if (activeRegionalEventIds.includes(event.id)) continue;
    // 20% chance per eligible event per turn
    if (Math.random() > 0.20) continue;
    try {
      if (event.triggerCondition(policies, sim)) {
        triggered.push(event.id);
      }
    } catch {
      // ignore
    }
  }
  return triggered;
}

export function getRegionalEventById(id: string): RegionalEventDefinition | undefined {
  return REGIONAL_EVENTS.find(e => e.id === id);
}
