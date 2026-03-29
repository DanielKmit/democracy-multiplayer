import { SimulationState } from './types';

export interface VoterGroupEventDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  groupId: string;
  triggerCondition: (policies: Record<string, number>, sim: SimulationState) => boolean;
  satisfactionDelta: number; // ±10-20%
}

export const VOTER_GROUP_EVENTS: VoterGroupEventDefinition[] = [
  // Workers
  {
    id: 'strike_wave',
    name: 'Strike Wave',
    description: 'Workers across multiple industries walk off the job demanding better pay.',
    icon: '✊',
    groupId: 'workers',
    triggerCondition: (p) => (p.minimum_wage ?? 40) < 25,
    satisfactionDelta: -15,
  },
  {
    id: 'union_victory',
    name: 'Union Victory',
    description: 'Major labor unions secure landmark collective bargaining agreements.',
    icon: '🏆',
    groupId: 'workers',
    triggerCondition: (p) => (p.minimum_wage ?? 40) > 70,
    satisfactionDelta: 15,
  },
  // Business
  {
    id: 'stock_market_crash_event',
    name: 'Stock Market Crash',
    description: 'Markets plunge as investor confidence evaporates.',
    icon: '📉',
    groupId: 'business',
    triggerCondition: (_p, sim) => sim.gdpGrowth < -2,
    satisfactionDelta: -15,
  },
  {
    id: 'investment_boom',
    name: 'Investment Boom',
    description: 'Foreign and domestic investment floods in, boosting business confidence.',
    icon: '📈',
    groupId: 'business',
    triggerCondition: (p, sim) => sim.gdpGrowth > 4 && (p.corporate_tax ?? 30) < 35,
    satisfactionDelta: 15,
  },
  // Youth
  {
    id: 'student_protests',
    name: 'Student Protests',
    description: 'Students take to the streets demanding better education funding.',
    icon: '🎓',
    groupId: 'youth',
    triggerCondition: (p) => (p.education ?? 50) < 30,
    satisfactionDelta: -15,
  },
  {
    id: 'youth_innovation_prize',
    name: 'Youth Innovation Prize',
    description: 'Young Novarian inventors win prestigious international awards.',
    icon: '💡',
    groupId: 'youth',
    triggerCondition: (p) => (p.tech_research ?? 35) > 70,
    satisfactionDelta: 15,
  },
  // Retirees
  {
    id: 'pension_crisis_event',
    name: 'Pension Crisis',
    description: 'Pension funds face insolvency, threatening retirement security for millions.',
    icon: '👴',
    groupId: 'retirees',
    triggerCondition: (p) => (p.pensions ?? 45) < 25,
    satisfactionDelta: -15,
  },
  {
    id: 'senior_care_excellence',
    name: 'Senior Care Excellence',
    description: 'Novaria\'s elderly care system is ranked among the world\'s best.',
    icon: '🏥',
    groupId: 'retirees',
    triggerCondition: (p) => (p.healthcare ?? 50) > 75,
    satisfactionDelta: 15,
  },
  // Rural
  {
    id: 'farm_bankruptcy_wave',
    name: 'Farm Bankruptcy Wave',
    description: 'Small farms collapse under debt as agricultural support dwindles.',
    icon: '🚜',
    groupId: 'rural',
    triggerCondition: (p) => (p.agriculture ?? 35) < 25,
    satisfactionDelta: -15,
  },
  {
    id: 'harvest_festival',
    name: 'Harvest Festival Celebration',
    description: 'A bountiful harvest brings joy and prosperity to rural communities.',
    icon: '🌻',
    groupId: 'rural',
    triggerCondition: (p) => (p.agriculture ?? 35) > 65,
    satisfactionDelta: 15,
  },
  // Urban
  {
    id: 'public_transit_strike',
    name: 'Public Transit Strike',
    description: 'Public transport grinds to a halt as workers demand better conditions.',
    icon: '🚇',
    groupId: 'urban',
    triggerCondition: (p) => (p.urban_dev ?? 50) < 30 || (p.public_transport ?? 50) < 25,
    satisfactionDelta: -15,
  },
  {
    id: 'city_renaissance',
    name: 'City Renaissance',
    description: 'Urban renewal projects transform cities into vibrant, livable spaces.',
    icon: '🌆',
    groupId: 'urban',
    triggerCondition: (p) => (p.urban_dev ?? 50) > 70,
    satisfactionDelta: 15,
  },
  // Religious
  {
    id: 'religious_tensions_flare',
    name: 'Religious Tensions Flare',
    description: 'Interfaith conflicts erupt as religious freedoms are pushed to extremes.',
    icon: '⛪',
    groupId: 'religious',
    triggerCondition: (p) => (p.religious_freedom ?? 70) < 20 || (p.religious_freedom ?? 70) > 90,
    satisfactionDelta: -15,
  },
  {
    id: 'interfaith_harmony',
    name: 'Interfaith Harmony',
    description: 'Religious communities unite for peace, showing the world a model of coexistence.',
    icon: '🕊️',
    groupId: 'religious',
    triggerCondition: (p) => (p.religious_freedom ?? 70) > 40 && (p.religious_freedom ?? 70) < 70,
    satisfactionDelta: 15,
  },
  // Patriots
  {
    id: 'national_day_celebration',
    name: 'National Day Celebration',
    description: 'A grand military parade and national celebrations boost patriotic pride.',
    icon: '🎖️',
    groupId: 'patriots',
    triggerCondition: (p) => (p.military ?? 40) > 65,
    satisfactionDelta: 15,
  },
  {
    id: 'sovereignty_protests',
    name: 'Sovereignty Protests',
    description: 'Patriots protest what they see as excessive foreign influence on national policy.',
    icon: '🏴',
    groupId: 'patriots',
    triggerCondition: (p) => (p.trade_openness ?? 60) > 80,
    satisfactionDelta: -15,
  },
  // Environmentalists
  {
    id: 'climate_rally',
    name: 'Climate Rally',
    description: 'Thousands march demanding urgent action on climate change.',
    icon: '🌍',
    groupId: 'environmentalists',
    triggerCondition: (p) => (p.env_regulations ?? 40) < 30,
    satisfactionDelta: -15,
  },
  {
    id: 'green_award',
    name: 'Green Award',
    description: 'Novaria wins international recognition for environmental stewardship.',
    icon: '🌿',
    groupId: 'environmentalists',
    triggerCondition: (p) => (p.env_regulations ?? 40) > 70 && (p.renewables ?? 30) > 60,
    satisfactionDelta: 15,
  },
  // Liberals
  {
    id: 'civil_rights_march',
    name: 'Civil Rights March',
    description: 'Thousands march for civil liberties and equal rights.',
    icon: '✌️',
    groupId: 'liberals',
    triggerCondition: (_p, sim) => sim.freedomIndex < 35,
    satisfactionDelta: -15,
  },
  {
    id: 'liberty_festival',
    name: 'Liberty Festival',
    description: 'A nationwide celebration of freedom, diversity, and civil rights.',
    icon: '🗽',
    groupId: 'liberals',
    triggerCondition: (_p, sim) => sim.freedomIndex > 70,
    satisfactionDelta: 15,
  },
];

const usedGroupEvents = new Set<string>();

export function checkVoterGroupEvents(
  policies: Record<string, number>,
  sim: SimulationState,
): VoterGroupEventDefinition[] {
  const triggered: VoterGroupEventDefinition[] = [];

  for (const event of VOTER_GROUP_EVENTS) {
    if (usedGroupEvents.has(event.id)) continue;
    // 15% chance per eligible event
    if (Math.random() > 0.15) continue;
    try {
      if (event.triggerCondition(policies, sim)) {
        triggered.push(event);
        usedGroupEvents.add(event.id);
      }
    } catch {
      // ignore
    }
  }

  // Reset used set if all have been used
  if (usedGroupEvents.size >= VOTER_GROUP_EVENTS.length) {
    usedGroupEvents.clear();
  }

  return triggered;
}
