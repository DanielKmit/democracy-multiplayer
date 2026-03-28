import {
  GameState,
  SimulationState,
  SimVarKey,
  PolicyChange,
  OppositionAction,
  ActiveEffect,
  ElectionResult,
  TurnPhase,
  ActionLogEntry,
  Player,
} from './types';
import { POLICIES, POLICY_MAP } from './policies';
import { VOTER_GROUPS } from './voters';
import { rollForEvent } from './events';
import { calculateBudget } from './budget';

// ---- Helpers ----

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ---- Simulation Core ----

export function computeSimulation(policyValues: Record<string, number>, activeEffects: ActiveEffect[]): SimulationState {
  const sim: SimulationState = {
    gdpGrowth: 2,       // base 2%
    unemployment: 8,     // base 8%
    inflation: 3,        // base 3%
    crime: 40,           // base 40
    pollution: 50,       // base 50
    equality: 50,        // base 50
    healthIndex: 50,     // base 50
    educationIndex: 50,  // base 50
    freedomIndex: 50,    // base 50
    nationalSecurity: 50,// base 50
  };

  // Apply all policy effects
  for (const policy of POLICIES) {
    const value = policyValues[policy.id] ?? policy.defaultValue;
    const deviation = value - 50; // how far from midpoint

    for (const [key, effect] of Object.entries(policy.effects)) {
      sim[key as SimVarKey] += deviation * (effect as number);
    }
  }

  // Apply active event effects
  for (const effect of activeEffects) {
    if (effect.type === 'event' && effect.data.effects) {
      const eventEffects = effect.data.effects as Partial<Record<SimVarKey, number>>;
      for (const [key, val] of Object.entries(eventEffects)) {
        sim[key as SimVarKey] += val as number;
      }
    }
  }

  // Clamp all values
  sim.gdpGrowth = clamp(sim.gdpGrowth, -5, 8);
  sim.unemployment = clamp(sim.unemployment, 0, 30);
  sim.inflation = clamp(sim.inflation, 0, 20);
  sim.crime = clamp(sim.crime, 0, 100);
  sim.pollution = clamp(sim.pollution, 0, 100);
  sim.equality = clamp(sim.equality, 0, 100);
  sim.healthIndex = clamp(sim.healthIndex, 0, 100);
  sim.educationIndex = clamp(sim.educationIndex, 0, 100);
  sim.freedomIndex = clamp(sim.freedomIndex, 0, 100);
  sim.nationalSecurity = clamp(sim.nationalSecurity, 0, 100);

  return sim;
}

// ---- Voter Satisfaction ----

export function computeVoterSatisfaction(
  policyValues: Record<string, number>,
  simulation: SimulationState,
  activeEffects: ActiveEffect[]
): Record<string, number> {
  const satisfaction: Record<string, number> = {};

  for (const group of VOTER_GROUPS) {
    let score = 50; // baseline

    // Factor 1: Simulation variable concerns
    for (const [varKey, weight] of Object.entries(group.concerns)) {
      const simVal = simulation[varKey as SimVarKey];
      // Normalize: positive weight means they want high values
      // For negative concerns (unemployment, crime, pollution), lower is better
      if (weight > 0) {
        score += (simVal - 50) * weight * 0.3;
      } else {
        // They dislike high values of this variable
        score += (50 - simVal) * Math.abs(weight) * 0.3;
      }
    }

    // Factor 2: Policy preferences (how close are policies to what they want)
    let policyScore = 0;
    let policyCount = 0;
    for (const [policyId, idealValue] of Object.entries(group.policyPreferences)) {
      const currentValue = policyValues[policyId] ?? 50;
      const distance = Math.abs(currentValue - idealValue);
      policyScore += (100 - distance) / 100; // 1.0 = perfect match, 0.0 = opposite
      policyCount++;
    }
    if (policyCount > 0) {
      score += ((policyScore / policyCount) - 0.5) * 30; // -15 to +15
    }

    // Factor 3: Coalition building locks
    for (const effect of activeEffects) {
      if (effect.type === 'coalition' && effect.data.groupId === group.id) {
        // Coalition locked — opposition has locked this group
        score -= 10;
      }
    }

    // Factor 4: Campaign effects
    for (const effect of activeEffects) {
      if (effect.type === 'media_attack') {
        const targetVar = effect.data.targetSimVar as SimVarKey;
        if (group.concerns[targetVar]) {
          // Double the negative impact
          const simVal = simulation[targetVar];
          const weight = group.concerns[targetVar]!;
          if (weight < 0) {
            score -= (simVal - 50) * Math.abs(weight) * 0.15;
          }
        }
      }
    }

    satisfaction[group.id] = clamp(Math.round(score), 0, 100);
  }

  return satisfaction;
}

// ---- Approval Rating ----

export function computeApprovalRating(
  voterSatisfaction: Record<string, number>,
  activeEffects: ActiveEffect[]
): number {
  let approval = 0;
  for (const group of VOTER_GROUPS) {
    approval += (voterSatisfaction[group.id] ?? 50) * group.populationShare;
  }

  // Campaign bonuses for opposition reduce approval
  for (const effect of activeEffects) {
    if (effect.type === 'event' && effect.data.approvalImpact) {
      approval += effect.data.approvalImpact as number;
    }
  }

  return clamp(Math.round(approval), 0, 100);
}

// ---- Political Capital ----

export function computePoliticalCapital(player: Player, approvalRating: number, oppositionVoteShare: number): number {
  if (player.role === 'ruling') {
    let pc = 6;
    if (approvalRating > 60) pc += 1;
    if (approvalRating < 30) pc -= 1;
    return Math.max(1, pc);
  } else {
    let pc = 4;
    if (approvalRating < 40) pc += 1;
    if (oppositionVoteShare > 35) pc += 1;
    return Math.max(1, pc);
  }
}

// ---- Election ----

export function runElection(
  voterSatisfaction: Record<string, number>,
  activeEffects: ActiveEffect[],
  turn: number,
  oppositionCampaignBonus: Record<string, number>
): ElectionResult {
  const groupResults: Record<string, { ruling: number; opposition: number }> = {};
  let totalRuling = 0;
  let totalOpposition = 0;

  for (const group of VOTER_GROUPS) {
    const satisfaction = voterSatisfaction[group.id] ?? 50;
    let rulingShare = satisfaction;
    let oppositionShare = 100 - satisfaction;

    // Campaign bonus
    const campaignBonus = oppositionCampaignBonus[group.id] ?? 0;
    oppositionShare += campaignBonus;
    rulingShare -= campaignBonus;

    // Coalition lock
    const isLocked = activeEffects.some(
      e => e.type === 'coalition' && e.data.groupId === group.id
    );
    if (isLocked) {
      oppositionShare += 15;
      rulingShare -= 15;
    }

    rulingShare = clamp(rulingShare, 5, 95);
    oppositionShare = clamp(oppositionShare, 5, 95);

    // Normalize
    const total = rulingShare + oppositionShare;
    rulingShare = (rulingShare / total) * 100;
    oppositionShare = (oppositionShare / total) * 100;

    groupResults[group.id] = {
      ruling: Math.round(rulingShare * 10) / 10,
      opposition: Math.round(oppositionShare * 10) / 10,
    };

    totalRuling += rulingShare * group.populationShare;
    totalOpposition += oppositionShare * group.populationShare;
  }

  const totalVotes = totalRuling + totalOpposition;
  const rulingVoteShare = Math.round((totalRuling / totalVotes) * 1000) / 10;
  const oppositionVoteShare = Math.round((totalOpposition / totalVotes) * 1000) / 10;

  const winner = rulingVoteShare >= 50 ? 'ruling' : 'opposition';

  return {
    turn,
    rulingVoteShare,
    oppositionVoteShare,
    groupResults,
    winner,
    swapped: winner === 'opposition',
  };
}

// ---- Create Initial Game State ----

export function createInitialGameState(roomId: string): GameState {
  const policies: Record<string, number> = {};
  for (const p of POLICIES) {
    policies[p.id] = p.defaultValue;
  }

  const simulation = computeSimulation(policies, []);
  const voterSatisfaction = computeVoterSatisfaction(policies, simulation, []);
  const approvalRating = computeApprovalRating(voterSatisfaction, []);
  const budget = calculateBudget(policies, simulation, 60);

  return {
    roomId,
    players: [],
    turn: 1,
    phase: 'waiting',
    policies,
    simulation,
    budget,
    voterSatisfaction,
    approvalRating,
    oppositionVoteShare: 100 - approvalRating,
    activeEffects: [],
    currentEvent: null,
    actionLog: [],
    pendingPolicyChanges: [],
    pendingOppositionActions: [],
    filibusteredPolicies: [],
    electionHistory: [],
    turnsUntilElection: 8,
  };
}

export { generateRoomId };

// ---- Apply Policy Changes ----

export function applyPolicyChanges(state: GameState, changes: PolicyChange[]): string[] {
  const log: string[] = [];
  const ruling = state.players.find(p => p.role === 'ruling');
  if (!ruling) return ['No ruling party player found'];

  let totalCost = 0;
  for (const change of changes) {
    if (state.filibusteredPolicies.includes(change.policyId)) {
      log.push(`${POLICY_MAP.get(change.policyId)?.name} was filibustered!`);
      continue;
    }

    const policy = POLICY_MAP.get(change.policyId);
    if (!policy) continue;

    const diff = Math.abs(change.newValue - change.oldValue);
    const cost = Math.ceil(diff / 10);
    if (totalCost + cost > ruling.politicalCapital) {
      log.push(`Not enough PC to change ${policy.name}`);
      continue;
    }

    totalCost += cost;
    state.policies[change.policyId] = clamp(change.newValue, 0, 100);
    log.push(`${policy.name}: ${change.oldValue} → ${change.newValue} (${cost} PC)`);
  }

  ruling.politicalCapital -= totalCost;
  return log;
}

// ---- Apply Opposition Actions ----

export function applyOppositionActions(state: GameState, actions: OppositionAction[]): string[] {
  const log: string[] = [];
  const opposition = state.players.find(p => p.role === 'opposition');
  if (!opposition) return ['No opposition player found'];

  let totalCost = 0;
  for (const action of actions) {
    if (totalCost + action.cost > opposition.politicalCapital) {
      log.push(`Not enough PC for ${action.type}`);
      continue;
    }
    totalCost += action.cost;

    switch (action.type) {
      case 'filibuster': {
        if (action.targetPolicyId) {
          state.filibusteredPolicies.push(action.targetPolicyId);
          const name = POLICY_MAP.get(action.targetPolicyId)?.name ?? action.targetPolicyId;
          log.push(`Filibuster: Blocked changes to ${name} next turn`);
        }
        break;
      }
      case 'campaign': {
        if (action.targetGroupId) {
          state.activeEffects.push({
            type: 'media_attack', // reuse for campaign tracking
            id: `campaign_${Date.now()}`,
            turnsRemaining: 1,
            data: { type: 'campaign', groupId: action.targetGroupId, bonus: 5 },
          });
          const group = VOTER_GROUPS.find(g => g.id === action.targetGroupId);
          log.push(`Campaign: Targeting ${group?.name ?? action.targetGroupId}`);
        }
        break;
      }
      case 'propose_alternative': {
        if (action.proposedPolicyId && action.proposedValue !== undefined) {
          const policy = POLICY_MAP.get(action.proposedPolicyId);
          if (policy) {
            // Check if popular
            let approvalCount = 0;
            for (const group of VOTER_GROUPS) {
              const ideal = group.policyPreferences[action.proposedPolicyId];
              if (ideal !== undefined) {
                const currentDist = Math.abs(state.policies[action.proposedPolicyId] - ideal);
                const proposedDist = Math.abs(action.proposedValue - ideal);
                if (proposedDist < currentDist) approvalCount++;
              }
            }
            if (approvalCount > VOTER_GROUPS.length / 2) {
              state.approvalRating = Math.max(0, state.approvalRating - 3);
              log.push(`Proposed alternative for ${policy.name} is popular! Ruling approval -3%`);
            } else {
              log.push(`Proposed alternative for ${policy.name} fell flat.`);
            }
          }
        }
        break;
      }
      case 'media_attack': {
        if (action.targetSimVar) {
          state.activeEffects.push({
            type: 'media_attack',
            id: `media_${Date.now()}`,
            turnsRemaining: 2,
            data: { targetSimVar: action.targetSimVar },
          });
          log.push(`Media Attack: Amplifying negative ${action.targetSimVar} coverage`);
        }
        break;
      }
      case 'coalition_building': {
        if (action.targetGroupId) {
          state.activeEffects.push({
            type: 'coalition',
            id: `coalition_${Date.now()}`,
            turnsRemaining: 4,
            data: { groupId: action.targetGroupId },
          });
          const group = VOTER_GROUPS.find(g => g.id === action.targetGroupId);
          log.push(`Coalition: Locked ${group?.name ?? action.targetGroupId} for 4 turns`);
        }
        break;
      }
      case 'vote_of_no_confidence': {
        if (state.approvalRating < 25) {
          log.push('Vote of No Confidence PASSED! Emergency election triggered!');
          state.turnsUntilElection = 0;
        } else {
          log.push('Vote of No Confidence FAILED. Opposition loses credibility.');
          // Penalty — reduce opposition effectiveness
          state.activeEffects.push({
            type: 'media_attack',
            id: `vonc_fail_${Date.now()}`,
            turnsRemaining: 3,
            data: { type: 'vonc_penalty' },
          });
        }
        break;
      }
    }
  }

  opposition.politicalCapital -= totalCost;
  return log;
}

// ---- Tick Active Effects ----

export function tickActiveEffects(state: GameState): void {
  state.activeEffects = state.activeEffects
    .map(e => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
    .filter(e => e.turnsRemaining > 0);
}

// ---- Advance Turn ----

export function advancePhase(state: GameState): void {
  const phaseOrder: TurnPhase[] = ['events', 'ruling', 'resolution', 'opposition', 'polling', 'election'];
  const currentIndex = phaseOrder.indexOf(state.phase);

  if (state.phase === 'waiting') {
    state.phase = 'events';
    return;
  }

  if (state.phase === 'polling') {
    if (state.turnsUntilElection <= 0) {
      state.phase = 'election';
    } else {
      // Start new turn
      state.turn++;
      state.turnsUntilElection--;
      state.filibusteredPolicies = [];
      state.pendingPolicyChanges = [];
      state.pendingOppositionActions = [];

      // Tick effects
      tickActiveEffects(state);

      // Give PC
      for (const player of state.players) {
        player.politicalCapital += computePoliticalCapital(player, state.approvalRating, state.oppositionVoteShare);
      }

      state.phase = 'events';
    }
    return;
  }

  if (state.phase === 'election') {
    // After election, check game over
    if (state.electionHistory.length >= 3) {
      state.phase = 'game_over';
    } else {
      state.turn++;
      state.turnsUntilElection = 8;
      state.filibusteredPolicies = [];
      state.phase = 'events';
    }
    return;
  }

  if (currentIndex >= 0 && currentIndex < phaseOrder.length - 1) {
    state.phase = phaseOrder[currentIndex + 1];
  }
}

export function addLogEntry(state: GameState, message: string, type: ActionLogEntry['type']): void {
  state.actionLog.push({
    turn: state.turn,
    phase: state.phase,
    message,
    type,
    timestamp: Date.now(),
  });
  // Keep only last 50 entries
  if (state.actionLog.length > 50) {
    state.actionLog = state.actionLog.slice(-50);
  }
}
