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
  PartyConfig,
  CabinetState,
  MinistryId,
  TurnSnapshot,
  NewsItem,
  Bill,
} from './types';
import { POLICIES, POLICY_MAP } from './policies';
import { VOTER_GROUPS } from './voters';
import { REGIONS, REGION_MAP } from './regions';
import { rollForEvent } from './events';
import { calculateBudget } from './budget';
import { getInitialPoliticianPool } from './politicians';
import { createInitialParliament, allocateSeats } from './parliament';
import { createInitialExtremism, updateExtremism } from './extremism';
import { checkSituations, shouldResolveSituation } from './situations';

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
    gdpGrowth: 2,
    unemployment: 8,
    inflation: 3,
    crime: 40,
    pollution: 50,
    equality: 50,
    healthIndex: 50,
    educationIndex: 50,
    freedomIndex: 50,
    nationalSecurity: 50,
    corruption: 30,
  };

  for (const policy of POLICIES) {
    const value = policyValues[policy.id] ?? policy.defaultValue;
    const deviation = value - 50;
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
    if (effect.type === 'dilemma' && effect.data.effects) {
      const dilemmaEffects = effect.data.effects as Partial<Record<SimVarKey, number>>;
      for (const [key, val] of Object.entries(dilemmaEffects)) {
        sim[key as SimVarKey] += val as number;
      }
    }
  }

  // Clamp
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
  sim.corruption = clamp(sim.corruption, 0, 100);

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
    let score = 50;

    // Simulation variable concerns
    for (const [varKey, weight] of Object.entries(group.concerns)) {
      const simVal = simulation[varKey as SimVarKey];
      if (weight > 0) {
        score += (simVal - 50) * weight * 0.3;
      } else {
        score += (50 - simVal) * Math.abs(weight) * 0.3;
      }
    }

    // Policy preferences
    let policyScore = 0;
    let policyCount = 0;
    for (const [policyId, idealValue] of Object.entries(group.policyPreferences)) {
      const currentValue = policyValues[policyId] ?? 50;
      const distance = Math.abs(currentValue - idealValue);
      policyScore += (100 - distance) / 100;
      policyCount++;
    }
    if (policyCount > 0) {
      score += ((policyScore / policyCount) - 0.5) * 30;
    }

    // Effects
    for (const effect of activeEffects) {
      if (effect.type === 'coalition' && effect.data.groupId === group.id) {
        score -= 10;
      }
      if (effect.type === 'media_attack') {
        const targetVar = effect.data.targetSimVar as SimVarKey;
        if (group.concerns[targetVar]) {
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

// ---- Regional Satisfaction ----

export function computeRegionalSatisfaction(
  policyValues: Record<string, number>,
  voterSatisfaction: Record<string, number>,
  players: Player[]
): Record<string, Record<string, number>> {
  const regional: Record<string, Record<string, number>> = {};

  for (const region of REGIONS) {
    regional[region.id] = {};

    for (const player of players) {
      let regionScore = 0;
      let totalWeight = 0;

      // Base from voter groups present in region
      for (const groupId of region.dominantGroups) {
        const groupSat = voterSatisfaction[groupId] ?? 50;
        regionScore += groupSat;
        totalWeight += 1;
      }

      if (totalWeight > 0) {
        regionScore /= totalWeight;
      } else {
        regionScore = 50;
      }

      // Ideological alignment bonus/penalty
      const econDiff = Math.abs(region.economicLean - player.party.economicAxis);
      const socialDiff = Math.abs(region.socialLean - player.party.socialAxis);
      regionScore += (100 - econDiff) * 0.1;
      regionScore += (100 - socialDiff) * 0.1;

      // Policy weight modifiers for this region
      for (const [policyId, weight] of Object.entries(region.policyWeights)) {
        const group = VOTER_GROUPS.find(g =>
          g.policyPreferences[policyId] !== undefined &&
          region.dominantGroups.includes(g.id)
        );
        if (group) {
          const ideal = group.policyPreferences[policyId];
          const current = policyValues[policyId] ?? 50;
          const alignment = 1 - Math.abs(current - ideal) / 100;
          regionScore += alignment * (weight - 1) * 5;
        }
      }

      regional[region.id][player.id] = clamp(Math.round(regionScore), 0, 100);
    }
  }

  return regional;
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

  for (const effect of activeEffects) {
    if (effect.type === 'event' && effect.data.approvalImpact) {
      approval += effect.data.approvalImpact as number;
    }
  }

  return clamp(Math.round(approval), 0, 100);
}

// ---- Political Capital ----

export function computePoliticalCapital(
  player: Player,
  approvalRating: number,
  oppositionVoteShare: number,
  cabinet?: CabinetState
): number {
  if (player.role === 'ruling') {
    let pc = 6;
    if (approvalRating > 60) pc += 1;
    if (approvalRating < 30) pc -= 1;

    // Cabinet competence bonus
    if (cabinet) {
      let totalCompetence = 0;
      let filledCount = 0;
      for (const polId of Object.values(cabinet.ministers)) {
        if (polId) {
          const pol = cabinet.availablePool.find(p => p.id === polId);
          if (pol) {
            totalCompetence += pol.competence;
            filledCount++;
          }
        }
      }
      if (filledCount > 0) {
        const avgComp = totalCompetence / filledCount;
        if (avgComp > 7) pc += 1;
        if (avgComp < 4) pc -= 1;
      }
    }

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
  regionalSatisfaction: Record<string, Record<string, number>>,
  players: Player[],
  turn: number,
  activeEffects: ActiveEffect[],
  oppositionCampaignBonus: Record<string, number>
): ElectionResult {
  const seatResults: Record<string, Record<string, number>> = {};
  const voteShares: Record<string, Record<string, number>> = {};
  const regionWinners: Record<string, string> = {};
  const totalSeats: Record<string, number> = {};

  for (const player of players) {
    totalSeats[player.id] = 0;
  }

  for (const region of REGIONS) {
    const shares: Record<string, number> = {};
    seatResults[region.id] = {};

    for (const player of players) {
      let share = regionalSatisfaction[region.id]?.[player.id] ?? 50;

      // Campaign bonus from opposition
      if (player.role === 'opposition') {
        for (const groupId of region.dominantGroups) {
          share += (oppositionCampaignBonus[groupId] ?? 0) * 0.5;
        }
      }

      // Coalition lock effects
      for (const effect of activeEffects) {
        if (effect.type === 'coalition') {
          const lockedGroup = effect.data.groupId as string;
          if (region.dominantGroups.includes(lockedGroup) && player.role === 'opposition') {
            share += 5;
          }
        }
      }

      shares[player.id] = Math.max(5, share);
    }

    // Normalize shares to 100%
    const totalShares = Object.values(shares).reduce((a, b) => a + b, 0);
    const normalizedShares: Record<string, number> = {};
    for (const [pid, s] of Object.entries(shares)) {
      normalizedShares[pid] = (s / totalShares) * 100;
    }
    voteShares[region.id] = normalizedShares;

    // Allocate seats proportionally
    const regionSeats = allocateSeats(
      { [region.id]: normalizedShares },
      players
    );

    for (const seat of regionSeats.seats) {
      seatResults[region.id][seat.partyId] = (seatResults[region.id][seat.partyId] ?? 0) + 1;
      totalSeats[seat.partyId] = (totalSeats[seat.partyId] ?? 0) + 1;
    }

    // Region winner
    let maxSeats = 0;
    let winner = players[0]?.id ?? '';
    for (const [pid, seats] of Object.entries(seatResults[region.id])) {
      if (seats > maxSeats) {
        maxSeats = seats;
        winner = pid;
      }
    }
    regionWinners[region.id] = winner;
  }

  // Overall vote share
  const overallVoteShare: Record<string, number> = {};
  for (const player of players) {
    let totalWeightedShare = 0;
    for (const region of REGIONS) {
      totalWeightedShare += (voteShares[region.id]?.[player.id] ?? 0) * region.populationShare;
    }
    overallVoteShare[player.id] = Math.round(totalWeightedShare * 10) / 10;
  }

  // Winner by seats
  let winnerPid = players[0]?.id ?? '';
  let maxSeatsTotal = 0;
  for (const [pid, seats] of Object.entries(totalSeats)) {
    if (seats > maxSeatsTotal) {
      maxSeatsTotal = seats;
      winnerPid = pid;
    }
  }

  const currentRuling = players.find(p => p.role === 'ruling');
  const swapped = currentRuling ? currentRuling.id !== winnerPid : false;

  return {
    turn,
    seatResults,
    totalSeats,
    voteShares,
    overallVoteShare,
    winner: winnerPid,
    swapped,
    regionWinners,
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
    date: { month: 1, year: 2025 },
    policies,
    simulation,
    budget,
    voterSatisfaction,
    regionalSatisfaction: {},
    approvalRating,
    oppositionVoteShare: 100 - approvalRating,
    parliament: { seats: [], seatsByParty: {}, coalitionPartner: null, speakerId: null },
    cabinet: { ministers: { finance: null, interior: null, defense: null, health: null, education: null, foreign: null, environment: null, justice: null }, availablePool: getInitialPoliticianPool() },
    activeBills: [],
    activeSituations: [],
    activeDilemma: null,
    extremism: createInitialExtremism(),
    activeEffects: [],
    currentEvent: null,
    actionLog: [],
    newsTicker: [],
    pendingPolicyChanges: [],
    pendingOppositionActions: [],
    filibusteredPolicies: [],
    electionHistory: [],
    turnHistory: [],
    turnsUntilElection: 8,
    consecutiveLowEnvRegulations: 0,
    consecutiveHighSpending: 0,
  };
}

export { generateRoomId };

// ---- Apply Policy Changes (via Bills) ----

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
            type: 'media_attack',
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
          state.activeEffects.push({
            type: 'media_attack',
            id: `vonc_fail_${Date.now()}`,
            turnsRemaining: 3,
            data: { type: 'vonc_penalty' },
          });
        }
        break;
      }
      case 'lobby_votes': {
        // Reduce loyalty of ruling seats for next bill vote
        log.push('Lobbying parliament members to rebel on next vote.');
        break;
      }
      case 'propose_amendment': {
        if (action.targetBillId) {
          log.push(`Amendment proposed for bill ${action.targetBillId}`);
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

// ---- Advance Date ----

function advanceDate(state: GameState): void {
  state.date.month++;
  if (state.date.month > 12) {
    state.date.month = 1;
    state.date.year++;
  }
}

// ---- Add News ----

export function addNewsItem(state: GameState, text: string, type: NewsItem['type']): void {
  state.newsTicker.unshift({
    id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    turn: state.turn,
    text,
    type,
    timestamp: Date.now(),
  });
  if (state.newsTicker.length > 30) {
    state.newsTicker = state.newsTicker.slice(0, 30);
  }
}

// ---- Record Turn Snapshot ----

function recordSnapshot(state: GameState): void {
  state.turnHistory.push({
    turn: state.turn,
    approval: state.approvalRating,
    gdp: state.simulation.gdpGrowth,
    unemployment: state.simulation.unemployment,
    debtToGdp: state.budget.debtToGdp,
  });
}

// ---- Advance Phase ----

export function advancePhase(state: GameState): void {
  const phaseOrder: TurnPhase[] = ['events', 'dilemma', 'ruling', 'bill_voting', 'resolution', 'opposition', 'polling', 'election'];
  const currentIndex = phaseOrder.indexOf(state.phase);

  if (state.phase === 'waiting') {
    state.phase = 'party_creation';
    return;
  }

  if (state.phase === 'party_creation') {
    state.phase = 'events';
    return;
  }

  if (state.phase === 'government_formation') {
    state.phase = 'events';
    return;
  }

  if (state.phase === 'polling') {
    recordSnapshot(state);

    if (state.turnsUntilElection <= 0) {
      state.phase = 'election';
    } else {
      // Start new turn
      state.turn++;
      state.turnsUntilElection--;
      advanceDate(state);
      state.filibusteredPolicies = [];
      state.pendingPolicyChanges = [];
      state.pendingOppositionActions = [];
      state.activeBills = [];

      tickActiveEffects(state);

      // Track situation counters
      if ((state.policies.env_regulations ?? 40) < 25) {
        state.consecutiveLowEnvRegulations++;
      } else {
        state.consecutiveLowEnvRegulations = 0;
      }

      // Check/resolve situations
      const activeSitIds = state.activeSituations.map(s => s.id);
      const newSits = checkSituations(state.policies, state.simulation, activeSitIds, state.consecutiveLowEnvRegulations);
      for (const sitId of newSits) {
        state.activeSituations.push({ id: sitId, turnsActive: 0, acknowledged: false });
      }
      // Resolve situations whose conditions are no longer met
      state.activeSituations = state.activeSituations.filter(s => {
        if (shouldResolveSituation(s.id, state.policies, state.simulation, state.consecutiveLowEnvRegulations)) {
          if (s.turnsActive >= 2) return false; // Must be active at least 2 turns to resolve
        }
        s.turnsActive++;
        return true;
      });

      // Update extremism
      state.extremism = updateExtremism(state.extremism, state.policies, state.simulation);

      // Give PC
      for (const player of state.players) {
        player.politicalCapital += computePoliticalCapital(
          player, state.approvalRating, state.oppositionVoteShare, state.cabinet
        );
      }

      state.phase = 'events';
    }
    return;
  }

  if (state.phase === 'election') {
    if (state.electionHistory.length >= 3) {
      state.phase = 'game_over';
    } else {
      state.turn++;
      state.turnsUntilElection = 8;
      state.filibusteredPolicies = [];
      advanceDate(state);
      state.phase = 'government_formation';
    }
    return;
  }

  // Skip dilemma if none active
  if (state.phase === 'events' && !state.activeDilemma) {
    state.phase = 'ruling';
    return;
  }

  // Skip bill voting if no bills
  if (state.phase === 'ruling') {
    state.phase = 'resolution';
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
  if (state.actionLog.length > 50) {
    state.actionLog = state.actionLog.slice(-50);
  }
}
