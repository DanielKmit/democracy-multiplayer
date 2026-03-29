// ============================================
// Party Reputation System
// Separate from approval — tracks trust, competence, integrity
// ============================================

import { SimulationState, Pledge, Scandal } from './types';

export interface ReputationState {
  // Per-party reputation 0-100
  scores: Record<string, number>;
  // Track promise-keeping per party
  promisesKept: Record<string, number>;
  promisesBroken: Record<string, number>;
  // Scandal count per party
  scandalCount: Record<string, number>;
}

/**
 * Create initial reputation state for all parties.
 */
export function createInitialReputation(partyIds: string[]): ReputationState {
  const scores: Record<string, number> = {};
  const promisesKept: Record<string, number> = {};
  const promisesBroken: Record<string, number> = {};
  const scandalCount: Record<string, number> = {};

  for (const id of partyIds) {
    scores[id] = 60; // Start at decent reputation
    promisesKept[id] = 0;
    promisesBroken[id] = 0;
    scandalCount[id] = 0;
  }

  return { scores, promisesKept, promisesBroken, scandalCount };
}

/**
 * Update reputation each turn based on:
 * - Scandals (reduce)
 * - Broken promises (reduce)
 * - Kept promises (increase)
 * - Good governance (slow increase)
 * - Competent cabinet (small increase)
 */
export function updateReputation(
  rep: ReputationState,
  partyId: string,
  factors: {
    activeScandals: number;
    brokenPromiseThisTurn: boolean;
    keptPromiseThisTurn: boolean;
    approval: number;
    cabinetCompetence: number; // average 0-10
    isRuling: boolean;
  },
): void {
  let score = rep.scores[partyId] ?? 60;

  // Active scandals drag reputation down
  score -= factors.activeScandals * 3;

  // Broken promises are devastating
  if (factors.brokenPromiseThisTurn) {
    score -= 8;
    rep.promisesBroken[partyId] = (rep.promisesBroken[partyId] ?? 0) + 1;
  }

  // Kept promises slowly build trust
  if (factors.keptPromiseThisTurn) {
    score += 5;
    rep.promisesKept[partyId] = (rep.promisesKept[partyId] ?? 0) + 1;
  }

  // Good governance bonus for ruling party
  if (factors.isRuling) {
    if (factors.approval > 60) score += 1;  // Competent governance
    if (factors.approval > 75) score += 1;  // Excellent governance
    if (factors.approval < 30) score -= 2;  // Incompetence penalty
  }

  // Cabinet competence (ruling only)
  if (factors.isRuling && factors.cabinetCompetence > 7) {
    score += 1; // Great cabinet boosts reputation
  }

  // Natural drift toward 50 (regression to mean)
  if (score > 60) score -= 0.5;
  if (score < 40) score += 0.5;

  rep.scores[partyId] = Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get reputation effects on gameplay.
 */
export function getReputationEffects(reputation: number): {
  voterTrustMultiplier: number;  // 0.5-1.5 — how much voters believe promises
  ministerRecruitPenalty: number; // 0-3 — reduction in available minister competence
  scandalExposureModifier: number; // 0.5-1.5 — how likely media exposes scandals
  approvalModifier: number; // -5 to +5 — direct approval effect
} {
  return {
    voterTrustMultiplier: 0.5 + (reputation / 100),
    ministerRecruitPenalty: reputation < 30 ? 3 : reputation < 50 ? 1 : 0,
    scandalExposureModifier: reputation < 30 ? 1.5 : reputation > 70 ? 0.7 : 1.0,
    approvalModifier: Math.round((reputation - 50) / 10),
  };
}
