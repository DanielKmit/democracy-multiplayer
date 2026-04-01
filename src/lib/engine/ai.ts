// ============================================
// AI Decision Engine — Democracy Multiplayer
// Makes decisions based on role, ideology, situation, and random variance.
// ============================================

import {
  GameState,
  Player,
  PlayerRole,
  PolicyChange,
  OppositionAction,
  OppositionActionType,
  CampaignAction,
  SimVarKey,
  MinistryId,
  CoalitionOffer,
  CoalitionPromise,
} from './types';
import { POLICIES, POLICY_MAP } from './policies';
import { VOTER_GROUPS } from './voters';
import { REGIONS } from './regions';

// ---- AI Ideology ----

export type AIIdeology = 'left' | 'center' | 'right';

export interface AIPersonality {
  ideology: AIIdeology;
  aggressiveness: number;  // 0-1, how willing to take risky actions
  adaptiveness: number;    // 0-1, how much they react to situations vs ideology
}

const IDEOLOGY_AXES: Record<AIIdeology, { economic: number; social: number }> = {
  left:   { economic: 25, social: 75 },
  center: { economic: 50, social: 55 },
  right:  { economic: 75, social: 35 },
};

// Policy preferences per ideology (ideal values)
const IDEOLOGY_POLICY_PREFS: Record<AIIdeology, Record<string, number>> = {
  left: {
    income_tax: 65, corporate_tax: 60, minimum_wage: 80, unemployment_benefits: 75,
    healthcare: 85, education: 80, housing_subsidies: 75, pensions: 70,
    env_regulations: 80, renewables: 85, carbon_tax: 70, civil_rights: 85,
    press_freedom: 80, immigration: 65, drug_policy: 60, gun_control: 75,
    foreign_aid: 65, public_transport: 75, govt_spending: 70,
    police: 35, military: 30, border_security: 30, intelligence: 35,
  },
  center: {
    income_tax: 45, corporate_tax: 40, minimum_wage: 55, unemployment_benefits: 50,
    healthcare: 60, education: 65, housing_subsidies: 50, pensions: 55,
    env_regulations: 55, renewables: 55, carbon_tax: 40, civil_rights: 65,
    press_freedom: 65, immigration: 50, drug_policy: 45, gun_control: 50,
    foreign_aid: 50, public_transport: 55, govt_spending: 50,
    police: 50, military: 50, border_security: 50, intelligence: 50,
  },
  right: {
    income_tax: 25, corporate_tax: 20, minimum_wage: 30, unemployment_benefits: 25,
    healthcare: 40, education: 45, housing_subsidies: 25, pensions: 40,
    env_regulations: 25, renewables: 30, carbon_tax: 15, civil_rights: 45,
    press_freedom: 50, immigration: 25, drug_policy: 30, gun_control: 25,
    foreign_aid: 25, public_transport: 30, govt_spending: 25,
    police: 75, military: 80, border_security: 80, intelligence: 70,
  },
};

// ---- Helpers ----

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shouldMakeSuboptimalChoice(): boolean {
  return Math.random() < 0.20; // 20% chaos factor
}

// ---- AI Party Generation ----

export interface AIPartyPreset {
  ideology: AIIdeology;
  partyName: string;
  leaderName: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'cyan' | 'pink';
  logo: 'eagle' | 'rose' | 'star' | 'tree' | 'fist' | 'dove' | 'shield' | 'flame' | 'scales' | 'gear' | 'wheat' | 'sun';
  manifesto: [string, string, string];
}

export const AI_PARTY_PRESETS: Record<AIIdeology, AIPartyPreset> = {
  left: {
    ideology: 'left',
    partyName: 'Progressive Alliance',
    leaderName: 'Elena Vasquez',
    color: 'red',
    logo: 'rose',
    manifesto: ['Universal healthcare', 'Social equality', 'Environmental protection'],
  },
  center: {
    ideology: 'center',
    partyName: 'Centrist Democrats',
    leaderName: 'Marcus Chen',
    color: 'orange',
    logo: 'scales',
    manifesto: ['Education reform', 'Job creation', 'Anti-corruption'],
  },
  right: {
    ideology: 'right',
    partyName: 'Conservative Party',
    leaderName: 'Viktor Haraldsen',
    color: 'blue',
    logo: 'eagle',
    manifesto: ['Lower taxes', 'Strong military', 'Tough on crime'],
  },
};

// ---- Core AI Decision Making ----

export interface AIDecision {
  action: string;
  payload: unknown;
  description: string;  // For logging/display
}

/**
 * Main entry: make an AI decision based on current game state, phase, and role.
 */
export function makeAIDecision(
  state: GameState,
  aiPlayer: Player,
  personality: AIPersonality,
): AIDecision | null {
  const role = aiPlayer.role;

  switch (state.phase) {
    case 'campaigning':
      return makeCampaignDecision(state, aiPlayer, personality);
    case 'events':
      return { action: 'acknowledgeEvent', payload: undefined, description: 'AI acknowledges event' };
    case 'dilemma':
      return makeDilemmaDecision(state, aiPlayer, personality);
    case 'ruling':
      if (role === 'ruling') return makeRulingDecision(state, aiPlayer, personality);
      return null;
    case 'opposition':
      if (role === 'opposition') return makeOppositionDecision(state, aiPlayer, personality);
      return null;
    case 'coalition_negotiation':
      return makeCoalitionDecision(state, aiPlayer, personality);
    case 'government_formation':
      return makeGovernmentFormationDecision(state, aiPlayer, personality);
    case 'polling':
    case 'election':
    case 'bill_voting':
    case 'resolution':
      return { action: 'endTurnPhase', payload: undefined, description: 'AI advances phase' };
    default:
      return null;
  }
}

// ---- Ruling Decisions ----

function makeRulingDecision(
  state: GameState,
  aiPlayer: Player,
  personality: AIPersonality,
): AIDecision {
  // Priority: spin active scandals if we have PC to spare
  if (state.gameSettings?.scandalsEnabled !== false && aiPlayer.politicalCapital >= 4) {
    const myScandals = (state.activeScandals ?? []).filter(
      s => s.targetPlayerId === aiPlayer.id && s.exposed && !s.spun && s.severity >= 5
    );
    if (myScandals.length > 0) {
      // Spin the worst scandal
      const worst = myScandals.sort((a, b) => b.severity - a.severity)[0];
      return {
        action: 'spinScandal',
        payload: worst.id,
        description: `AI spins scandal: ${worst.title}`,
      };
    }
  }

  // Resolve diplomatic incident if pending
  if (state.activeDiplomaticIncident && state.gameSettings?.internationalRelationsEnabled !== false) {
    const option = personality.aggressiveness > 0.5 ? 'b' : 'a';
    return {
      action: 'resolveDiplomaticIncident',
      payload: { option },
      description: `AI resolves diplomatic incident: option ${option}`,
    };
  }

  const prefs = IDEOLOGY_POLICY_PREFS[personality.ideology];

  // Strategy: propose a bill that moves policy toward our preference AND helps approval
  const bestBill = findBestBill(state, aiPlayer, personality, prefs);

  if (bestBill) {
    return {
      action: 'submitBill',
      payload: { policyId: bestBill.policyId, proposedValue: bestBill.proposedValue },
      description: `AI proposes ${bestBill.name} (${bestBill.currentValue} → ${bestBill.proposedValue})`,
    };
  }

  // Fallback: end turn with no changes
  return {
    action: 'endTurnPhase',
    payload: undefined,
    description: 'AI passes (no good bills to propose)',
  };
}

interface BillCandidate {
  policyId: string;
  name: string;
  currentValue: number;
  proposedValue: number;
  score: number;
}

function findBestBill(
  state: GameState,
  aiPlayer: Player,
  personality: AIPersonality,
  prefs: Record<string, number>,
): BillCandidate | null {
  const candidates: BillCandidate[] = [];

  for (const policy of POLICIES) {
    const currentValue = state.policies[policy.id] ?? policy.defaultValue;
    const idealValue = prefs[policy.id] ?? 50;
    const diff = idealValue - currentValue;

    if (Math.abs(diff) < 10) continue; // Close enough, skip

    // Propose moving 25 points toward ideal (one step)
    const step = diff > 0 ? 25 : -25;
    const proposedValue = clamp(currentValue + step, 0, 100);

    if (proposedValue === currentValue) continue;

    // Check PC cost
    const steps = Math.max(1, Math.round(Math.abs(proposedValue - currentValue) / 25));
    if (steps > aiPlayer.politicalCapital) continue;

    // Score: how much this helps
    let score = 0;

    // Ideology alignment
    score += (100 - Math.abs(proposedValue - idealValue)) * 0.3;

    // Situation response: boost score if this addresses a crisis
    score += getSituationBonus(state, policy.id, proposedValue, currentValue) * personality.adaptiveness;

    // Voter group benefit
    for (const group of VOTER_GROUPS) {
      const groupIdeal = group.policyPreferences[policy.id];
      if (groupIdeal !== undefined) {
        const currentDist = Math.abs(currentValue - groupIdeal);
        const proposedDist = Math.abs(proposedValue - groupIdeal);
        if (proposedDist < currentDist) {
          score += group.populationShare * 30; // Weighted by group size
        } else {
          score -= group.populationShare * 15;
        }
      }
    }

    // Random variance
    if (shouldMakeSuboptimalChoice()) {
      score += (Math.random() - 0.5) * 40;
    }

    candidates.push({
      policyId: policy.id,
      name: policy.name,
      currentValue,
      proposedValue,
      score,
    });
  }

  if (candidates.length === 0) return null;

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // 20% chance to pick a suboptimal choice from top 3
  if (shouldMakeSuboptimalChoice() && candidates.length > 1) {
    return pickRandom(candidates.slice(0, Math.min(3, candidates.length)));
  }

  return candidates[0];
}

function getSituationBonus(
  state: GameState,
  policyId: string,
  proposedValue: number,
  currentValue: number,
): number {
  let bonus = 0;
  const sim = state.simulation;

  // High unemployment → favor job-creating policies
  if (sim.unemployment > 12) {
    if (['minimum_wage', 'corporate_tax', 'govt_spending', 'tech_research'].includes(policyId)) {
      if (policyId === 'corporate_tax' && proposedValue < currentValue) bonus += 20;
      if (policyId === 'govt_spending' && proposedValue > currentValue) bonus += 15;
      if (policyId === 'tech_research' && proposedValue > currentValue) bonus += 10;
    }
  }

  // High crime → favor security
  if (sim.crime > 60) {
    if (['police', 'intelligence', 'gun_control'].includes(policyId)) {
      if (proposedValue > currentValue) bonus += 20;
    }
  }

  // Low health → boost healthcare
  if (sim.healthIndex < 40) {
    if (policyId === 'healthcare' && proposedValue > currentValue) bonus += 25;
  }

  // High pollution → boost environment
  if (sim.pollution > 65) {
    if (['env_regulations', 'renewables', 'carbon_tax'].includes(policyId)) {
      if (proposedValue > currentValue) bonus += 15;
    }
  }

  // Low approval → populist moves (boost spending, cut taxes)
  const aiApproval = state.approvalRating[state.players.find(p => p.role === 'ruling')?.id ?? ''] ?? 50;
  if (aiApproval < 35) {
    if (['income_tax', 'corporate_tax'].includes(policyId) && proposedValue < currentValue) bonus += 20;
    if (['healthcare', 'education', 'pensions'].includes(policyId) && proposedValue > currentValue) bonus += 15;
  }

  return bonus;
}

// ---- Opposition Decisions ----

function makeOppositionDecision(
  state: GameState,
  aiPlayer: Player,
  personality: AIPersonality,
): AIDecision {
  const actions: OppositionAction[] = [];
  let pcBudget = aiPlayer.politicalCapital;
  const rulingApproval = state.rulingApproval ?? 50;

  // Priority 1: If ruling is very weak, try vote of no confidence
  if (rulingApproval < 25 && pcBudget >= 4 && personality.aggressiveness > 0.5) {
    actions.push({ type: 'vote_of_no_confidence', cost: 4 });
    pcBudget -= 4;
  }

  // Priority 2: Leak scandal if ruling approval < 40 and corruption is findable
  if (rulingApproval < 40 && pcBudget >= 2 && state.simulation.corruption > 30) {
    if (!shouldMakeSuboptimalChoice()) {
      actions.push({ type: 'leak_scandal', cost: 2 });
      pcBudget -= 2;
    }
  }

  // Priority 3: Question time on weak sim vars
  if (pcBudget >= 1 && !state.questionTimeUsed) {
    const weakVar = findWeakestSimVar(state);
    if (weakVar) {
      actions.push({
        type: 'question_time',
        cost: 1,
        targetSimVar: weakVar,
      });
      pcBudget -= 1;
    }
  }

  // Priority 4: Media attack on problem areas
  if (pcBudget >= 2) {
    const attackVar = findBestMediaAttackTarget(state);
    if (attackVar) {
      actions.push({
        type: 'media_attack',
        cost: 2,
        targetSimVar: attackVar,
      });
      pcBudget -= 2;
    }
  }

  // Priority 5: Propose counter-bill on misaligned policy
  if (pcBudget >= 2) {
    const prefs = IDEOLOGY_POLICY_PREFS[personality.ideology];
    const counterBill = findBestCounterBill(state, prefs);
    if (counterBill) {
      actions.push({
        type: 'propose_counter_bill',
        cost: 2,
        proposedPolicyId: counterBill.policyId,
        proposedValue: counterBill.value,
      });
      pcBudget -= 2;
    }
  }

  // Priority 6: Campaign with remaining PC — keep spending on multiple groups
  while (pcBudget >= 1) {
    const targetGroup = findBestCampaignTarget(state, aiPlayer);
    if (targetGroup) {
      // Don't target same group twice in one turn
      const alreadyTargeted = actions.some(a => a.type === 'campaign' && a.targetGroupId === targetGroup);
      if (alreadyTargeted) break;
      actions.push({
        type: 'campaign',
        cost: 1,
        targetGroupId: targetGroup,
      });
      pcBudget -= 1;
    } else {
      break;
    }
    // Also rally in a region if we have PC left
    if (pcBudget >= 2) {
      const region = pickRandom(REGIONS);
      const alreadyRallied = actions.some(a => a.type === 'rally_protest' && a.targetRegionId === region.id);
      if (!alreadyRallied) {
        actions.push({
          type: 'rally_protest',
          cost: 2,
          targetRegionId: region.id,
        });
        pcBudget -= 2;
      }
    }
  }

  // Priority 7: Plant Evidence — aggressive move (only if scandals enabled)
  if (pcBudget >= 3 && personality.aggressiveness > 0.6 && state.gameSettings?.scandalsEnabled !== false) {
    const types: ('corruption' | 'personal' | 'policy')[] = ['corruption', 'personal', 'policy'];
    actions.push({
      type: 'plant_evidence' as OppositionActionType,
      cost: 3,
      scandalType: types[Math.floor(Math.random() * types.length)],
    });
    pcBudget -= 3;
  }

  if (actions.length > 0) {
    return {
      action: 'submitOppositionActions',
      payload: actions,
      description: `AI plays ${actions.length} opposition action(s): ${actions.map(a => a.type).join(', ')}`,
    };
  }

  return {
    action: 'endTurnPhase',
    payload: undefined,
    description: 'AI passes opposition turn',
  };
}

function findWeakestSimVar(state: GameState): SimVarKey | null {
  const sim = state.simulation;
  const candidates: { key: SimVarKey; badness: number }[] = [
    { key: 'unemployment', badness: sim.unemployment > 10 ? sim.unemployment : 0 },
    { key: 'crime', badness: sim.crime > 50 ? sim.crime - 50 : 0 },
    { key: 'pollution', badness: sim.pollution > 55 ? sim.pollution - 50 : 0 },
    { key: 'corruption', badness: sim.corruption > 40 ? sim.corruption - 35 : 0 },
    { key: 'inflation', badness: sim.inflation > 6 ? sim.inflation * 3 : 0 },
    { key: 'healthIndex', badness: sim.healthIndex < 45 ? 50 - sim.healthIndex : 0 },
    { key: 'educationIndex', badness: sim.educationIndex < 45 ? 50 - sim.educationIndex : 0 },
  ];

  const bad = candidates.filter(c => c.badness > 0);
  if (bad.length === 0) return null;
  bad.sort((a, b) => b.badness - a.badness);
  return bad[0].key;
}

function findBestMediaAttackTarget(state: GameState): SimVarKey | null {
  return findWeakestSimVar(state); // Same logic — attack where it hurts most
}

function findBestCounterBill(
  state: GameState,
  prefs: Record<string, number>,
): { policyId: string; value: number } | null {
  let bestDiff = 0;
  let bestPolicy: { policyId: string; value: number } | null = null;

  for (const policy of POLICIES) {
    const current = state.policies[policy.id] ?? policy.defaultValue;
    const ideal = prefs[policy.id] ?? 50;
    const diff = Math.abs(current - ideal);

    if (diff > bestDiff && diff >= 20) {
      bestDiff = diff;
      const target = clamp(current + (ideal > current ? 25 : -25), 0, 100);
      bestPolicy = { policyId: policy.id, value: target };
    }
  }

  return bestPolicy;
}

function findBestCampaignTarget(state: GameState, aiPlayer: Player): string | null {
  // Target the voter group with lowest satisfaction for this party
  const mySat = state.voterSatisfaction[aiPlayer.id];
  if (!mySat) return pickRandom(VOTER_GROUPS).id;

  let lowestSat = 100;
  let targetGroup: string | null = null;
  // Prioritize large groups with low satisfaction
  for (const group of VOTER_GROUPS) {
    const sat = mySat[group.id] ?? 50;
    const weighted = sat - group.populationShare * 50; // Prefer larger groups
    if (weighted < lowestSat) {
      lowestSat = weighted;
      targetGroup = group.id;
    }
  }

  return targetGroup;
}

// ---- Campaign Decisions ----

function makeCampaignDecision(
  state: GameState,
  aiPlayer: Player,
  personality: AIPersonality,
): AIDecision {
  const actions: CampaignAction[] = [];
  let pcBudget = aiPlayer.politicalCapital;

  // Strategy: mix of rallies and media blitz
  // Rally in swing regions
  if (pcBudget >= 2) {
    const targetRegion = findBestCampaignRegion(state, aiPlayer);
    if (targetRegion) {
      actions.push({
        type: 'campaign_rally',
        cost: 2,
        targetRegionId: targetRegion,
      });
      pcBudget -= 2;
    }
  }

  // Media blitz targeting largest voter groups
  if (pcBudget >= 1) {
    const targetGroup = findBestCampaignTarget(state, aiPlayer);
    if (targetGroup) {
      actions.push({
        type: 'media_blitz',
        cost: 1,
        targetGroupId: targetGroup,
      });
      pcBudget -= 1;
    }
  }

  // Make a campaign promise
  if (pcBudget >= 1) {
    const promise = findBestPromise(state, personality);
    if (promise) {
      actions.push({
        type: 'voter_promise',
        cost: 1,
        promisePolicyId: promise.policyId,
        promiseDirection: promise.direction,
      });
      pcBudget -= 1;
    }
  }

  // Extra rally if we have budget
  if (pcBudget >= 2) {
    const regions = REGIONS.filter(r =>
      !actions.some(a => a.targetRegionId === r.id && a.type === 'campaign_rally')
    );
    if (regions.length > 0) {
      const region = pickRandom(regions);
      actions.push({
        type: 'campaign_rally',
        cost: 2,
        targetRegionId: region.id,
      });
      pcBudget -= 2;
    }
  }

  return {
    action: 'submitCampaignActions',
    payload: actions,
    description: `AI campaigns: ${actions.map(a => a.type).join(', ')}`,
  };
}

function findBestCampaignRegion(state: GameState, aiPlayer: Player): string | null {
  // Target regions where we're competitive but not dominant
  const regSat = state.regionalSatisfaction;
  let bestRegion: string | null = null;
  let bestSwing = -Infinity;

  for (const region of REGIONS) {
    const mySat = regSat[region.id]?.[aiPlayer.id] ?? 50;
    // Swing regions (40-60 satisfaction) are best targets
    const swingScore = region.seats * (1 - Math.abs(mySat - 50) / 50);
    if (swingScore > bestSwing) {
      bestSwing = swingScore;
      bestRegion = region.id;
    }
  }

  return bestRegion;
}

function findBestPromise(
  state: GameState,
  personality: AIPersonality,
): { policyId: string; direction: 'increase' | 'decrease' } | null {
  const prefs = IDEOLOGY_POLICY_PREFS[personality.ideology];
  let bestDiff = 0;
  let bestPromise: { policyId: string; direction: 'increase' | 'decrease' } | null = null;

  for (const policy of POLICIES) {
    const current = state.policies[policy.id] ?? policy.defaultValue;
    const ideal = prefs[policy.id] ?? 50;
    const diff = Math.abs(current - ideal);

    if (diff > bestDiff) {
      bestDiff = diff;
      bestPromise = {
        policyId: policy.id,
        direction: ideal > current ? 'increase' : 'decrease',
      };
    }
  }

  return bestPromise;
}

// ---- Dilemma Decisions ----

function makeDilemmaDecision(
  state: GameState,
  aiPlayer: Player,
  personality: AIPersonality,
): AIDecision | null {
  if (!state.activeDilemma || aiPlayer.role !== 'ruling') return null;

  // Weight toward ideology
  // Option A tends to be "progressive", Option B tends to be "conservative"
  // But we'll evaluate based on effects

  let optionAScore = 0;
  let optionBScore = 0;

  // Check for dilemma definition — we'd need to import it
  // For simplicity, we'll use ideology heuristic
  if (personality.ideology === 'left') {
    optionAScore += 30; // Lean progressive
  } else if (personality.ideology === 'right') {
    optionBScore += 30; // Lean conservative
  }

  // Random variance
  if (shouldMakeSuboptimalChoice()) {
    optionAScore += Math.random() * 40;
    optionBScore += Math.random() * 40;
  }

  const choice = optionAScore >= optionBScore ? 'a' : 'b';

  return {
    action: 'resolveDilemma',
    payload: choice,
    description: `AI chooses dilemma option ${choice.toUpperCase()}`,
  };
}

// ---- Coalition Decisions ----

function makeCoalitionDecision(
  state: GameState,
  aiPlayer: Player,
  personality: AIPersonality,
): AIDecision {
  // Find bot parties to approach for coalition
  const mySeats = state.parliament.seatsByParty[aiPlayer.id] ?? 0;

  // Check if we already have enough seats
  let coalitionSeats = mySeats;
  for (const partner of state.coalitionPartners) {
    const offer = state.coalitionOffers.find(
      o => o.fromPlayerId === aiPlayer.id && o.toBotPartyId === partner.botPartyId && o.accepted
    );
    if (offer) coalitionSeats += partner.seats;
  }

  if (coalitionSeats > 50) {
    // We have a majority, done negotiating
    return {
      action: 'endTurnPhase',
      payload: undefined,
      description: `AI done negotiating (has ${coalitionSeats} seats)`,
    };
  }

  // Find ideologically closest bot party we haven't approached
  const approachedIds = state.coalitionOffers
    .filter(o => o.fromPlayerId === aiPlayer.id)
    .map(o => o.toBotPartyId);

  const available = state.botParties.filter(bp => !approachedIds.includes(bp.id));

  if (available.length === 0) {
    return {
      action: 'endTurnPhase',
      payload: undefined,
      description: 'AI done negotiating (no more parties to approach)',
    };
  }

  // Sort by ideology closeness
  const axes = IDEOLOGY_AXES[personality.ideology];
  available.sort((a, b) => {
    const distA = Math.abs(a.economicAxis - axes.economic) + Math.abs(a.socialAxis - axes.social);
    const distB = Math.abs(b.economicAxis - axes.economic) + Math.abs(b.socialAxis - axes.social);
    return distA - distB;
  });

  const target = available[0];

  // Create promises aligned with the target's preferences
  const promises: CoalitionPromise[] = [];
  const topPrefs = Object.entries(target.policyPreferences)
    .sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))
    .slice(0, 2);

  for (const [policyId, idealValue] of topPrefs) {
    const current = state.policies[policyId] ?? 50;
    if (Math.abs(current - idealValue) > 15) {
      const policy = POLICY_MAP.get(policyId);
      promises.push({
        type: 'policy_change',
        policyId,
        direction: idealValue > current ? 'increase' : 'decrease',
        targetLevel: idealValue,
        description: `${idealValue > current ? 'Increase' : 'Decrease'} ${policy?.name ?? policyId}`,
      });
    }
  }

  const offer: CoalitionOffer = {
    fromPlayerId: aiPlayer.id,
    toBotPartyId: target.id,
    promises,
    accepted: false,
    rejected: false,
  };

  return {
    action: 'submitCoalitionOffer',
    payload: offer,
    description: `AI offers coalition to ${target.name}`,
  };
}

// ---- Government Formation ----

function makeGovernmentFormationDecision(
  state: GameState,
  aiPlayer: Player,
  personality: AIPersonality,
): AIDecision {
  if (aiPlayer.role !== 'ruling') {
    return {
      action: 'endTurnPhase',
      payload: undefined,
      description: 'AI (opposition) skips government formation',
    };
  }

  // Appoint ministers based on competence (with ideology specialty bonus)
  const pool = state.cabinet.availablePool;
  const emptyMinistries = (Object.entries(state.cabinet.ministers) as [MinistryId, string | null][])
    .filter(([, politicianId]) => !politicianId)
    .map(([ministryId]) => ministryId);

  if (emptyMinistries.length > 0) {
    const ministry = emptyMinistries[0];
    // Find best politician for this ministry
    const assigned = new Set(Object.values(state.cabinet.ministers).filter(Boolean));
    const available = pool.filter(p => !assigned.has(p.id));

    if (available.length > 0) {
      // Score: competence + specialty bonus + loyalty
      const scored = available.map(p => ({
        politician: p,
        score: p.competence + (p.specialty === ministry ? 3 : 0) + p.loyalty * 0.3,
      }));
      scored.sort((a, b) => b.score - a.score);

      return {
        action: 'appointMinister',
        payload: { ministryId: ministry, politicianId: scored[0].politician.id },
        description: `AI appoints ${scored[0].politician.name} as ${ministry}`,
      };
    }
  }

  return {
    action: 'endTurnPhase',
    payload: undefined,
    description: 'AI finishes government formation',
  };
}
