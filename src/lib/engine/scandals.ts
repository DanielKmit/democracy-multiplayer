// ============================================
// Scandal System — Enhanced
// Types, planting evidence, spinning, media interaction
// ============================================

import { SimulationState, SimVarKey } from './types';

export type ScandalType = 'corruption' | 'personal' | 'policy';

export interface Scandal {
  id: string;
  type: ScandalType;
  title: string;
  description: string;
  severity: number;         // 1-10
  targetPlayerId: string;   // who is affected
  sourcePlayerId?: string;  // who planted it (null if organic)
  planted: boolean;
  exposed: boolean;
  coveredUp: boolean;
  spun: boolean;            // has the affected party "spun" this?
  approvalImpact: number;   // negative number
  reputationImpact: number; // negative number
  turnsRemaining: number;
}

export interface ScandalTemplate {
  type: ScandalType;
  title: string;
  description: string;
  baseSeverity: number;
  triggerCondition?: (sim: SimulationState, policies: Record<string, number>) => boolean;
}

export const SCANDAL_TEMPLATES: ScandalTemplate[] = [
  // Corruption scandals
  {
    type: 'corruption',
    title: 'Embezzlement Scandal',
    description: 'Government funds diverted to party allies',
    baseSeverity: 7,
    triggerCondition: (sim) => sim.corruption > 40,
  },
  {
    type: 'corruption',
    title: 'Lobbyist Payments Exposed',
    description: 'Senior officials received undisclosed payments from industry lobbyists',
    baseSeverity: 6,
    triggerCondition: (sim) => sim.corruption > 30,
  },
  {
    type: 'corruption',
    title: 'Nepotism in Government Contracts',
    description: "State contracts awarded to minister's family members",
    baseSeverity: 8,
    triggerCondition: (sim) => sim.corruption > 50,
  },
  {
    type: 'corruption',
    title: 'Tax Evasion by Officials',
    description: 'Government officials found using offshore tax havens',
    baseSeverity: 5,
  },
  // Personal scandals
  {
    type: 'personal',
    title: 'Personal Affair Exposed',
    description: 'Senior party member caught in extramarital affair',
    baseSeverity: 4,
  },
  {
    type: 'personal',
    title: 'Substance Abuse Allegation',
    description: 'Photos emerge of party leader at exclusive private party',
    baseSeverity: 5,
  },
  {
    type: 'personal',
    title: 'Plagiarism in Academic Records',
    description: "Minister's university thesis found to contain plagiarized content",
    baseSeverity: 3,
  },
  {
    type: 'personal',
    title: 'Lavish Spending Controversy',
    description: 'Taxpayer-funded luxury trips and expensive tastes exposed',
    baseSeverity: 6,
  },
  // Policy scandals
  {
    type: 'policy',
    title: 'Secret Policy Negotiations',
    description: 'Leaked documents reveal hidden concessions to special interests',
    baseSeverity: 5,
    triggerCondition: (sim) => sim.freedomIndex < 50,
  },
  {
    type: 'policy',
    title: 'Falsified Statistics',
    description: 'Government accused of manipulating economic data',
    baseSeverity: 7,
    triggerCondition: (sim) => sim.gdpGrowth < 0,
  },
  {
    type: 'policy',
    title: 'Environmental Cover-Up',
    description: 'Reports suppressed showing true pollution levels',
    baseSeverity: 6,
    triggerCondition: (sim) => sim.pollution > 60,
  },
  {
    type: 'policy',
    title: 'Healthcare Data Manipulation',
    description: 'Hospital wait times and health outcomes found to be misreported',
    baseSeverity: 5,
    triggerCondition: (sim) => sim.healthIndex < 40,
  },
];

/**
 * Generate an organic scandal based on current conditions.
 * Called each turn with a base chance.
 */
export function rollForScandal(
  targetPlayerId: string,
  sim: SimulationState,
  policies: Record<string, number>,
  pressFreedom: number,
  reputation: number,
): Scandal | null {
  // Base 15% chance per turn, modified by press freedom and corruption
  let chance = 0.15;
  chance += (pressFreedom - 50) * 0.003;  // Higher press freedom = more exposed
  chance += (sim.corruption - 30) * 0.003; // Higher corruption = more scandals
  chance -= (reputation - 50) * 0.002;     // High reputation = less scandal-prone

  if (Math.random() > chance) return null;

  // Pick a template — prefer ones whose conditions are met
  const eligible = SCANDAL_TEMPLATES.filter(t =>
    !t.triggerCondition || t.triggerCondition(sim, policies)
  );
  // Weight eligible templates higher
  const pool = [...eligible, ...eligible, ...SCANDAL_TEMPLATES];
  const template = pool[Math.floor(Math.random() * pool.length)];

  const severity = template.baseSeverity + Math.floor(Math.random() * 3) - 1;
  const clampedSev = Math.max(1, Math.min(10, severity));

  return {
    id: `scandal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: template.type,
    title: template.title,
    description: template.description,
    severity: clampedSev,
    targetPlayerId,
    planted: false,
    exposed: true,
    coveredUp: false,
    spun: false,
    approvalImpact: -clampedSev,
    reputationImpact: -(clampedSev + 2),
    turnsRemaining: 2 + Math.floor(clampedSev / 3),
  };
}

/**
 * Plant evidence — opposition tries to create a scandal.
 * 40% chance it backfires onto the planter.
 */
export function plantEvidence(
  targetPlayerId: string,
  sourcePlayerId: string,
  scandalType: ScandalType,
): { scandal: Scandal; backfired: boolean } {
  const backfired = Math.random() < 0.4;

  // Pick a template of the requested type
  const typeTemplates = SCANDAL_TEMPLATES.filter(t => t.type === scandalType);
  const template = typeTemplates[Math.floor(Math.random() * typeTemplates.length)] ?? SCANDAL_TEMPLATES[0];

  const severity = backfired
    ? template.baseSeverity + 2  // Backfire is worse
    : template.baseSeverity;

  const actualTarget = backfired ? sourcePlayerId : targetPlayerId;

  return {
    scandal: {
      id: `scandal_plant_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: scandalType,
      title: backfired ? `${template.title} — BACKFIRED!` : template.title,
      description: backfired
        ? `Evidence planting exposed! ${template.description}`
        : template.description,
      severity,
      targetPlayerId: actualTarget,
      sourcePlayerId,
      planted: true,
      exposed: true,
      coveredUp: false,
      spun: false,
      approvalImpact: -severity,
      reputationImpact: backfired ? -(severity + 5) : -(severity + 2),
      turnsRemaining: 3,
    },
    backfired,
  };
}

/**
 * Spin a scandal — costs 2 PC, reduces impact by 50%.
 */
export function spinScandal(scandal: Scandal): Scandal {
  return {
    ...scandal,
    spun: true,
    approvalImpact: Math.round(scandal.approvalImpact * 0.5),
    reputationImpact: Math.round(scandal.reputationImpact * 0.5),
    turnsRemaining: Math.max(1, scandal.turnsRemaining - 1),
  };
}

/**
 * Media can expose or cover up based on press freedom.
 * High press freedom → scandals more likely exposed, cover-ups less effective.
 * Low press freedom → easier to suppress.
 */
export function mediaInteraction(
  scandal: Scandal,
  pressFreedom: number,
): { exposed: boolean; message: string } {
  if (scandal.exposed) {
    return { exposed: true, message: `${scandal.title} continues to dominate headlines` };
  }

  // Cover-up success depends on press freedom
  const exposeChance = pressFreedom / 100;
  const exposed = Math.random() < exposeChance;

  if (exposed) {
    return {
      exposed: true,
      message: `Investigative journalists uncover: ${scandal.title}`,
    };
  }

  return {
    exposed: false,
    message: `Media fails to investigate — scandal remains hidden`,
  };
}

/**
 * Tick scandals — reduce turns, remove expired ones.
 */
export function tickScandals(scandals: Scandal[]): Scandal[] {
  return scandals
    .map(s => ({ ...s, turnsRemaining: s.turnsRemaining - 1 }))
    .filter(s => s.turnsRemaining > 0);
}
