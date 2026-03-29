// ============================================
// International Relations
// Trade deals, foreign aid, diplomatic incidents
// ============================================

import { SimulationState, SimVarKey } from './types';

export interface ForeignNation {
  id: string;
  name: string;
  description: string;
  flag: string;
  economicPower: number;    // 0-100
  militaryPower: number;    // 0-100
  defaultRelation: number;  // starting relation 0-100
  tradeWeight: number;      // how much trade affects GDP
}

export interface DiplomaticRelation {
  nationId: string;
  relation: number;  // 0-100
  hasTradeAgreement: boolean;
  hasForeignAid: boolean;
  aidAmount: number;
  warThreat: boolean;
  activeDeal: TradeDeal | null;
}

export interface TradeDeal {
  nationId: string;
  gdpBonus: number;
  unemploymentEffect: number;
  turnsRemaining: number;
}

export interface DiplomaticIncident {
  id: string;
  nationId: string;
  title: string;
  description: string;
  optionA: { label: string; relationDelta: number; effects: Partial<Record<SimVarKey, number>> };
  optionB: { label: string; relationDelta: number; effects: Partial<Record<SimVarKey, number>> };
}

export const FOREIGN_NATIONS: ForeignNation[] = [
  {
    id: 'westland',
    name: 'Westland',
    description: 'A wealthy liberal democracy with strong trade ties',
    flag: '🇪🇺',
    economicPower: 85,
    militaryPower: 60,
    defaultRelation: 65,
    tradeWeight: 0.4,
  },
  {
    id: 'eastland',
    name: 'Eastland',
    description: 'An authoritarian power with a massive military',
    flag: '🏴',
    economicPower: 60,
    militaryPower: 90,
    defaultRelation: 40,
    tradeWeight: 0.3,
  },
  {
    id: 'southland',
    name: 'Southland',
    description: 'A developing nation with abundant natural resources',
    flag: '🌍',
    economicPower: 35,
    militaryPower: 30,
    defaultRelation: 55,
    tradeWeight: 0.2,
  },
];

export const DIPLOMATIC_INCIDENTS: DiplomaticIncident[] = [
  {
    id: 'westland_trade_dispute',
    nationId: 'westland',
    title: 'Westland Trade Tariffs',
    description: 'Westland threatens tariffs on your exports over a trade imbalance',
    optionA: { label: 'Negotiate compromise', relationDelta: 5, effects: { gdpGrowth: -0.5 } },
    optionB: { label: 'Retaliate with tariffs', relationDelta: -15, effects: { gdpGrowth: -1 } },
  },
  {
    id: 'eastland_border_tension',
    nationId: 'eastland',
    title: 'Eastland Border Provocations',
    description: 'Eastland military conducts exercises near your border',
    optionA: { label: 'Diplomatic protest', relationDelta: -5, effects: { nationalSecurity: -3 } },
    optionB: { label: 'Military mobilization', relationDelta: -20, effects: { nationalSecurity: 5, gdpGrowth: -1 } },
  },
  {
    id: 'southland_aid_crisis',
    nationId: 'southland',
    title: 'Southland Humanitarian Crisis',
    description: 'Southland faces a natural disaster and requests emergency aid',
    optionA: { label: 'Send aid ($2B)', relationDelta: 20, effects: { gdpGrowth: -0.3 } },
    optionB: { label: 'Express sympathy only', relationDelta: -10, effects: {} },
  },
  {
    id: 'westland_alliance_request',
    nationId: 'westland',
    title: 'Westland Defense Pact',
    description: 'Westland proposes a mutual defense agreement',
    optionA: { label: 'Accept alliance', relationDelta: 15, effects: { nationalSecurity: 5, freedomIndex: -2 } },
    optionB: { label: 'Remain neutral', relationDelta: -5, effects: {} },
  },
  {
    id: 'eastland_spy_scandal',
    nationId: 'eastland',
    title: 'Eastland Spy Ring Discovered',
    description: 'Your intelligence services uncover Eastland spies in your government',
    optionA: { label: 'Expel diplomats', relationDelta: -25, effects: { nationalSecurity: 3, corruption: -2 } },
    optionB: { label: 'Quiet diplomatic channel', relationDelta: -5, effects: { corruption: 2 } },
  },
  {
    id: 'southland_resource_deal',
    nationId: 'southland',
    title: 'Southland Resource Agreement',
    description: 'Southland offers exclusive access to rare minerals at a discount',
    optionA: { label: 'Accept the deal', relationDelta: 10, effects: { gdpGrowth: 1 } },
    optionB: { label: 'Demand better terms', relationDelta: -5, effects: { gdpGrowth: 0.5 } },
  },
];

/**
 * Create initial diplomatic relations.
 */
export function createInitialRelations(): DiplomaticRelation[] {
  return FOREIGN_NATIONS.map(nation => ({
    nationId: nation.id,
    relation: nation.defaultRelation,
    hasTradeAgreement: false,
    hasForeignAid: false,
    aidAmount: 0,
    warThreat: false,
    activeDeal: null,
  }));
}

/**
 * Update relations based on policies each turn.
 */
export function updateRelations(
  relations: DiplomaticRelation[],
  policies: Record<string, number>,
  sim: SimulationState,
): void {
  for (const rel of relations) {
    const nation = FOREIGN_NATIONS.find(n => n.id === rel.nationId);
    if (!nation) continue;

    // Foreign aid improves relations
    const foreignAid = policies.foreign_aid ?? 25;
    if (foreignAid > 50) {
      rel.relation = Math.min(100, rel.relation + 1);
    }

    // Trade openness helps with trade-oriented nations
    const tradeOpenness = policies.trade_openness ?? 60;
    if (tradeOpenness > 60) {
      rel.relation = Math.min(100, rel.relation + 0.5);
    }

    // Military posture affects relations differently
    const military = policies.military ?? 40;
    if (rel.nationId === 'eastland' && military > 60) {
      rel.relation = Math.min(100, rel.relation + 0.5); // Eastland respects strength
    }
    if (rel.nationId === 'westland' && military > 75) {
      rel.relation = Math.max(0, rel.relation - 0.5); // Westland worries about militarism
    }

    // Active trade deals improve relations
    if (rel.activeDeal) {
      rel.relation = Math.min(100, rel.relation + 0.5);
      rel.activeDeal.turnsRemaining--;
      if (rel.activeDeal.turnsRemaining <= 0) {
        rel.activeDeal = null;
        rel.hasTradeAgreement = false;
      }
    }

    // War threat check
    rel.warThreat = rel.relation < 20 && nation.militaryPower > 50;

    // Natural drift toward default
    if (rel.relation > nation.defaultRelation + 10) {
      rel.relation -= 0.3;
    } else if (rel.relation < nation.defaultRelation - 10) {
      rel.relation += 0.3;
    }

    rel.relation = Math.round(Math.max(0, Math.min(100, rel.relation)));
  }
}

/**
 * Sign a trade deal with a nation.
 * Returns the trade deal or null if relations too low.
 */
export function signTradeDeal(
  relations: DiplomaticRelation[],
  nationId: string,
): TradeDeal | null {
  const rel = relations.find(r => r.nationId === nationId);
  const nation = FOREIGN_NATIONS.find(n => n.id === nationId);
  if (!rel || !nation) return null;

  // Need at least 40 relations
  if (rel.relation < 40) return null;
  if (rel.hasTradeAgreement) return null;

  const deal: TradeDeal = {
    nationId,
    gdpBonus: nation.tradeWeight * (rel.relation / 100) * 2,
    unemploymentEffect: nation.economicPower > 60 ? 0.5 : -0.3,
    turnsRemaining: 8,
  };

  rel.hasTradeAgreement = true;
  rel.activeDeal = deal;
  rel.relation = Math.min(100, rel.relation + 5);

  return deal;
}

/**
 * Send foreign aid to a nation.
 * Costs money but improves relations.
 */
export function sendForeignAid(
  relations: DiplomaticRelation[],
  nationId: string,
  amount: number, // 1-3 (billions)
): { success: boolean; relationGain: number } {
  const rel = relations.find(r => r.nationId === nationId);
  if (!rel) return { success: false, relationGain: 0 };

  const gain = amount * 5;
  rel.relation = Math.min(100, rel.relation + gain);
  rel.hasForeignAid = true;
  rel.aidAmount += amount;

  return { success: true, relationGain: gain };
}

/**
 * Roll for a diplomatic incident (15% chance per turn).
 */
export function rollForDiplomaticIncident(
  relations: DiplomaticRelation[],
): DiplomaticIncident | null {
  if (Math.random() > 0.15) return null;

  // Pick a random incident
  const eligible = DIPLOMATIC_INCIDENTS.filter(inc => {
    const rel = relations.find(r => r.nationId === inc.nationId);
    return rel !== undefined;
  });

  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

/**
 * Apply effects of trade deals to simulation.
 */
export function applyTradeEffects(
  relations: DiplomaticRelation[],
): Partial<Record<SimVarKey, number>> {
  const effects: Partial<Record<SimVarKey, number>> = {};

  for (const rel of relations) {
    if (rel.activeDeal) {
      effects.gdpGrowth = (effects.gdpGrowth ?? 0) + rel.activeDeal.gdpBonus;
      effects.unemployment = (effects.unemployment ?? 0) + rel.activeDeal.unemploymentEffect;
    }

    // War threat increases military spending pressure
    if (rel.warThreat) {
      effects.nationalSecurity = (effects.nationalSecurity ?? 0) - 5;
    }
  }

  return effects;
}

export function getNationById(id: string): ForeignNation | undefined {
  return FOREIGN_NATIONS.find(n => n.id === id);
}
