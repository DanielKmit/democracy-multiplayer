import { SimulationState, SimVarKey } from './types';

export interface MediaEventDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  triggerCondition: (policies: Record<string, number>, sim: SimulationState) => boolean;
  effects: Partial<Record<SimVarKey, number>>;
  approvalImpact: number; // applied to ruling party
  voterGroupEffects?: Record<string, number>; // groupId -> satisfaction delta
  duration: number;
}

export const MEDIA_EVENTS: MediaEventDefinition[] = [
  {
    id: 'investigative_journalism',
    name: 'Investigative Journalism Exposes Corruption',
    description: 'Fearless reporters uncover a web of corruption in government agencies.',
    icon: '🔍',
    triggerCondition: (p, sim) => (p.press_freedom ?? 65) > 70 && sim.corruption > 40,
    effects: { corruption: -5 },
    approvalImpact: -3,
    duration: 2,
  },
  {
    id: 'state_media_propaganda',
    name: 'State Media Propaganda Criticized',
    description: 'International observers condemn state-controlled media for spreading propaganda.',
    icon: '📺',
    triggerCondition: (p) => (p.press_freedom ?? 65) < 30,
    effects: { freedomIndex: -3 },
    approvalImpact: 2, // propaganda actually helps ruling party domestically
    voterGroupEffects: { liberals: -10, youth: -8 },
    duration: 2,
  },
  {
    id: 'journalist_imprisoned',
    name: 'Journalist Imprisoned',
    description: 'A prominent journalist is jailed, sparking international outrage.',
    icon: '🔒',
    triggerCondition: (p) => (p.press_freedom ?? 65) < 20,
    effects: { freedomIndex: -5 },
    approvalImpact: -2,
    voterGroupEffects: { liberals: -20, youth: -10 },
    duration: 3,
  },
  {
    id: 'viral_social_movement',
    name: 'Viral Social Media Movement',
    description: 'A grassroots movement goes viral, mobilizing voters across the nation.',
    icon: '📱',
    triggerCondition: (p) => (p.press_freedom ?? 65) > 60,
    effects: {},
    approvalImpact: Math.random() > 0.5 ? 3 : -3, // unpredictable
    voterGroupEffects: { youth: 10, liberals: 8 },
    duration: 2,
  },
  {
    id: 'fake_news_epidemic',
    name: 'Fake News Epidemic',
    description: 'Misinformation spreads unchecked, eroding public trust in institutions.',
    icon: '🤥',
    triggerCondition: (p, sim) => (p.press_freedom ?? 65) > 50 && sim.educationIndex < 40,
    effects: { corruption: 3, crime: 2 },
    approvalImpact: -3,
    duration: 2,
  },
  {
    id: 'press_conference_gaffe',
    name: 'Press Conference Gaffe',
    description: 'A government spokesperson makes an embarrassing blunder on live TV.',
    icon: '🎤',
    triggerCondition: () => Math.random() < 0.15, // random
    effects: {},
    approvalImpact: -5,
    duration: 1,
  },
  {
    id: 'documentary_exposé',
    name: 'Environmental Documentary Exposé',
    description: 'A powerful documentary reveals the true extent of environmental damage.',
    icon: '🎬',
    triggerCondition: (p, sim) => (p.press_freedom ?? 65) > 65 && sim.pollution > 60,
    effects: {},
    approvalImpact: -3,
    voterGroupEffects: { environmentalists: 15 },
    duration: 2,
  },
  {
    id: 'media_mogul_endorsement',
    name: 'Media Mogul Endorsement',
    description: 'A powerful media owner publicly endorses the government agenda.',
    icon: '📰',
    triggerCondition: (p) => (p.press_freedom ?? 65) > 40,
    effects: {},
    approvalImpact: 5,
    duration: 2,
  },
  {
    id: 'censorship_backlash',
    name: 'Censorship Backlash',
    description: 'Attempts to censor online content spark widespread protest.',
    icon: '🚫',
    triggerCondition: (p) => (p.press_freedom ?? 65) < 35,
    effects: { freedomIndex: -3 },
    approvalImpact: -4,
    voterGroupEffects: { liberals: -15, youth: -10 },
    duration: 2,
  },
  {
    id: 'citizen_journalism_rise',
    name: 'Rise of Citizen Journalism',
    description: 'Armed with smartphones, ordinary citizens are holding power to account.',
    icon: '📸',
    triggerCondition: (p) => (p.press_freedom ?? 65) > 55 && (p.tech_research ?? 35) > 50,
    effects: { corruption: -3 },
    approvalImpact: -1,
    duration: 2,
  },
  {
    id: 'tabloid_scandal',
    name: 'Tabloid Scandal',
    description: 'Tabloids publish damaging stories about senior government figures.',
    icon: '🗞️',
    triggerCondition: () => Math.random() < 0.12,
    effects: {},
    approvalImpact: -4,
    duration: 1,
  },
  {
    id: 'public_broadcasting_award',
    name: 'Public Broadcasting Excellence Award',
    description: 'Novaria\'s public broadcaster wins international recognition.',
    icon: '🏆',
    triggerCondition: (p, sim) => (p.press_freedom ?? 65) > 70 && sim.educationIndex > 60,
    effects: { educationIndex: 3 },
    approvalImpact: 3,
    duration: 2,
  },
];

const usedMediaEvents = new Set<string>();

export function checkMediaEvents(
  policies: Record<string, number>,
  sim: SimulationState,
): MediaEventDefinition | null {
  // Higher press freedom = more unpredictable events (higher chance)
  const pressFreedom = policies.press_freedom ?? 65;
  const baseChance = 0.15 + (pressFreedom / 500); // 15-35% chance

  if (Math.random() > baseChance) return null;

  const available = MEDIA_EVENTS.filter(e => !usedMediaEvents.has(e.id));
  if (available.length === 0) {
    usedMediaEvents.clear();
    return null;
  }

  // Filter by trigger condition
  const eligible = available.filter(e => {
    try {
      return e.triggerCondition(policies, sim);
    } catch {
      return false;
    }
  });

  if (eligible.length === 0) return null;

  const picked = eligible[Math.floor(Math.random() * eligible.length)];
  usedMediaEvents.add(picked.id);
  return picked;
}
