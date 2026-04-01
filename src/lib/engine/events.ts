import { GameEvent } from './types';

export const EVENT_POOL: Omit<GameEvent, 'id'>[] = [
  {
    name: 'Economic Boom',
    description: 'A surge in global markets boosts your economy!',
    effects: { gdpGrowth: 2, unemployment: -3 },
    duration: 2,
    approvalImpact: 5,
  },
  {
    name: 'Recession',
    description: 'Global downturn hits. GDP contracts and businesses struggle.',
    effects: { gdpGrowth: -3, unemployment: 4 },
    duration: 3,
    approvalImpact: -8,
  },
  {
    name: 'Pandemic Outbreak',
    description: 'A health crisis strains the healthcare system.',
    effects: { healthIndex: -20, gdpGrowth: -2, unemployment: 3 },
    duration: 3,
    approvalImpact: -10,
  },
  {
    name: 'Political Scandal',
    description: 'A corruption scandal rocks the ruling party.',
    effects: {},
    duration: 2,
    approvalImpact: -15,
  },
  {
    name: 'Natural Disaster',
    description: 'Floods/earthquakes devastate regions. Emergency spending required.',
    effects: { gdpGrowth: -1 },
    duration: 2,
    approvalImpact: -5,
  },
  {
    name: 'Tech Breakthrough',
    description: 'A major innovation boosts productivity and growth.',
    effects: { gdpGrowth: 1.5, educationIndex: 5 },
    duration: 2,
    approvalImpact: 5,
  },
  {
    name: 'Border Crisis',
    description: 'A surge in immigration pressures border resources.',
    effects: { crime: 5, nationalSecurity: -5 },
    duration: 2,
    approvalImpact: -5,
  },
  {
    name: 'Energy Crisis',
    description: 'Fuel prices spike, driving up costs across the economy.',
    effects: { inflation: 4, gdpGrowth: -1, pollution: -5 },
    duration: 2,
    approvalImpact: -7,
  },
  {
    name: 'Market Crash',
    description: 'Stock markets plunge, wiping out savings.',
    effects: { gdpGrowth: -2.5, equality: -5 },
    duration: 2,
    approvalImpact: -10,
  },
  {
    name: 'Cultural Renaissance',
    description: 'A wave of artistic and cultural achievement lifts national morale.',
    effects: { educationIndex: 5, freedomIndex: 5 },
    duration: 2,
    approvalImpact: 8,
  },
  {
    name: 'Crime Wave',
    description: 'Organized crime surges, public feels unsafe.',
    effects: { crime: 15, nationalSecurity: -5 },
    duration: 2,
    approvalImpact: -8,
  },
  {
    name: 'Trade Deal',
    description: 'A favorable trade agreement opens new markets.',
    effects: { gdpGrowth: 1.5, unemployment: -2 },
    duration: 3,
    approvalImpact: 5,
  },
  {
    name: 'Diplomatic Incident',
    description: 'International tensions rise after a diplomatic blunder.',
    effects: { nationalSecurity: -8 },
    duration: 2,
    approvalImpact: -5,
  },
  {
    name: 'Oil Discovery',
    description: 'New oil reserves found! Revenue boost but environmental concerns.',
    effects: { gdpGrowth: 2, pollution: 10 },
    duration: 3,
    approvalImpact: 3,
  },
];

let eventCounter = 0;

export function resetEventCounter(): void {
  eventCounter = 0;
}

export function rollForEvent(): GameEvent | null {
  // 30% chance each turn
  if (Math.random() > 0.3) return null;

  const template = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
  eventCounter++;

  return {
    ...template,
    id: `event_${eventCounter}`,
  };
}
