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
  DelayedPolicy,
  PendingMotion,
  NGOAlliance,
  BOT_PARTIES,
  BotParty,
  CoalitionPartner,
  CoalitionOffer,
  CoalitionDemand,
  CoalitionPromise,
  CampaignAction,
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

// ---- Voter Satisfaction (PER-PARTY) ----

/**
 * Compute voter satisfaction for a SINGLE party.
 * Factors:
 * 1. How well current policies align with this group's preferences
 *    → Only matters for RULING party (they set the policies)
 *    → For opposition: based on party ideology alignment + campaign bonuses
 * 2. Simulation variable concerns (shared — everyone sees the economy)
 * 3. Active effects (campaigns, coalition locks, media attacks)
 * 4. Ideological alignment between party and voter group
 */
function computeSinglePartySatisfaction(
  partyId: string,
  party: { economicAxis: number; socialAxis: number },
  isRuling: boolean,
  policyValues: Record<string, number>,
  simulation: SimulationState,
  activeEffects: ActiveEffect[],
  ngoAlliances: NGOAlliance[],
): Record<string, number> {
  const satisfaction: Record<string, number> = {};

  for (const group of VOTER_GROUPS) {
    let score = 50;

    // 1. Simulation variable concerns (everyone affected by reality)
    for (const [varKey, weight] of Object.entries(group.concerns)) {
      const simVal = simulation[varKey as SimVarKey];
      if (weight! > 0) {
        // Positive concern: higher is better (e.g., gdpGrowth, healthIndex)
        score += (simVal - 50) * weight! * 0.25;
      } else {
        // Negative concern: lower is better (e.g., unemployment, crime)
        score += (50 - simVal) * Math.abs(weight!) * 0.25;
      }
    }

    // 2. Policy alignment — stronger for ruling party (they own the policies)
    let policyScore = 0;
    let policyCount = 0;
    for (const [policyId, idealValue] of Object.entries(group.policyPreferences)) {
      const currentValue = policyValues[policyId] ?? 50;
      const distance = Math.abs(currentValue - idealValue);
      policyScore += (100 - distance) / 100;
      policyCount++;
    }
    if (policyCount > 0) {
      const alignment = ((policyScore / policyCount) - 0.5) * 2; // -1 to +1
      // Ruling party gets full blame/credit for policy alignment
      // Opposition gets partial — voters know who's in charge
      const weight = isRuling ? 20 : 5;
      score += alignment * weight;
    }

    // 3. Ideological alignment between party and voter group
    // Infer group's ideology from their policy preferences
    const econPolicies = ['income_tax', 'corporate_tax', 'minimum_wage', 'govt_spending'];
    const socialPolicies = ['civil_rights', 'press_freedom', 'immigration', 'drug_policy'];
    let groupEcon = 50;
    let groupSocial = 50;
    let econCount = 0;
    let socialCount = 0;
    for (const [pid, val] of Object.entries(group.policyPreferences)) {
      if (econPolicies.includes(pid)) {
        // High tax preference = left-wing (low econ axis)
        if (pid === 'income_tax' || pid === 'corporate_tax') {
          groupEcon += (val - 50) * -0.02; // High tax pref → low econ
        } else {
          groupEcon += (val - 50) * 0.02;
        }
        econCount++;
      }
      if (socialPolicies.includes(pid)) {
        groupSocial += (val - 50) * 0.02; // High pref → more liberal
        socialCount++;
      }
    }
    if (econCount > 0) groupEcon = clamp(groupEcon, 0, 100);
    if (socialCount > 0) groupSocial = clamp(groupSocial, 0, 100);

    const econDiff = Math.abs(party.economicAxis - groupEcon);
    const socialDiff = Math.abs(party.socialAxis - groupSocial);
    // Ideology match: max +25, mismatch: down to -25 (strong differentiation)
    const ideoScore = ((200 - econDiff - socialDiff) / 200) * 50 - 25;
    score += ideoScore;

    // 4. Active effects (targeted at this party)
    for (const effect of activeEffects) {
      // Campaign targeting this group FOR this party
      if (effect.data.type === 'campaign' && effect.data.groupId === group.id) {
        // Effect.id contains party info or we just give bonus to opposition
        score += (effect.data.bonus as number ?? 5) * (isRuling ? 0.2 : 0.8);
      }
      // Rally in region where this group is dominant
      if (effect.data.type === 'rally' && !isRuling) {
        score += (effect.data.bonus as number ?? 3) * 0.3;
      }
      // Coalition lock — opposition locked this group
      if (effect.type === 'coalition' && effect.data.groupId === group.id) {
        if (!isRuling) score += 5;
        else score -= 5;
      }
      // Media attack — amplifies negative stat perception against ruling party
      if (effect.type === 'media_attack' && effect.data.targetSimVar && isRuling) {
        const targetVar = effect.data.targetSimVar as SimVarKey;
        if (group.concerns[targetVar]) {
          const simVal = simulation[targetVar];
          const weight = group.concerns[targetVar]!;
          if (weight < 0) {
            // Media amplifies negative perception
            score -= Math.abs((simVal - 50) * weight * 0.15);
          }
        }
      }
    }

    // 5. NGO alliances (opposition only)
    if (!isRuling) {
      for (const alliance of ngoAlliances) {
        if (alliance.groupId === group.id) {
          score += alliance.bonus;
        }
      }
    }

    satisfaction[group.id] = clamp(Math.round(score), 0, 100);
  }

  return satisfaction;
}

/**
 * Compute voter satisfaction for ALL parties (both human + bot).
 */
export function computeAllVoterSatisfaction(
  players: Player[],
  policyValues: Record<string, number>,
  simulation: SimulationState,
  activeEffects: ActiveEffect[],
  ngoAlliances: NGOAlliance[],
  botParties?: BotParty[],
): Record<string, Record<string, number>> {
  const allSatisfaction: Record<string, Record<string, number>> = {};

  for (const player of players) {
    allSatisfaction[player.id] = computeSinglePartySatisfaction(
      player.id,
      { economicAxis: player.party.economicAxis, socialAxis: player.party.socialAxis },
      player.role === 'ruling',
      policyValues,
      simulation,
      activeEffects,
      player.role === 'ruling' ? [] : ngoAlliances,
    );
  }

  // Bot parties
  for (const bot of (botParties ?? [])) {
    allSatisfaction[bot.id] = computeSinglePartySatisfaction(
      bot.id,
      { economicAxis: bot.economicAxis, socialAxis: bot.socialAxis },
      false, // bots are never ruling
      policyValues,
      simulation,
      [],
      [],
    );
  }

  return allSatisfaction;
}

/**
 * Legacy compat wrapper — returns ruling party's satisfaction only.
 * Used by old code that expects single Record<string, number>.
 */
export function computeVoterSatisfaction(
  policyValues: Record<string, number>,
  simulation: SimulationState,
  activeEffects: ActiveEffect[]
): Record<string, number> {
  // Fallback for initial creation (no players yet)
  const fakeSat: Record<string, number> = {};
  for (const group of VOTER_GROUPS) {
    let score = 50;
    for (const [varKey, weight] of Object.entries(group.concerns)) {
      const simVal = simulation[varKey as SimVarKey];
      if (weight! > 0) score += (simVal - 50) * weight! * 0.25;
      else score += (50 - simVal) * Math.abs(weight!) * 0.25;
    }
    let policyScore = 0;
    let policyCount = 0;
    for (const [policyId, idealValue] of Object.entries(group.policyPreferences)) {
      const currentValue = policyValues[policyId] ?? 50;
      const distance = Math.abs(currentValue - idealValue);
      policyScore += (100 - distance) / 100;
      policyCount++;
    }
    if (policyCount > 0) {
      score += ((policyScore / policyCount) - 0.5) * 20;
    }
    fakeSat[group.id] = clamp(Math.round(score), 0, 100);
  }
  return fakeSat;
}

// ---- Regional Satisfaction (per-party) ----

/**
 * Compute regional satisfaction using PER-PARTY voter satisfaction.
 */
export function computeRegionalSatisfaction(
  policyValues: Record<string, number>,
  allVoterSatisfaction: Record<string, Record<string, number>>,
  players: Player[]
): Record<string, Record<string, number>> {
  const regional: Record<string, Record<string, number>> = {};

  for (const region of REGIONS) {
    regional[region.id] = {};

    for (const player of players) {
      const partySat = allVoterSatisfaction[player.id] ?? {};
      let regionScore = 0;
      let totalWeight = 0;

      // Base from voter groups in this region — using THIS PARTY's satisfaction
      for (const groupId of region.dominantGroups) {
        const groupSat = partySat[groupId] ?? 50;
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

// ---- Approval Rating (per-party) ----

/**
 * Compute approval for ALL parties from their per-party voter satisfaction.
 */
export function computeAllApprovalRatings(
  allVoterSatisfaction: Record<string, Record<string, number>>,
  activeEffects: ActiveEffect[]
): Record<string, number> {
  const ratings: Record<string, number> = {};

  for (const [partyId, groupSats] of Object.entries(allVoterSatisfaction)) {
    let approval = 0;
    for (const group of VOTER_GROUPS) {
      approval += (groupSats[group.id] ?? 50) * group.populationShare;
    }
    // Event impacts only affect ruling party
    // (handled at caller level — we don't know ruling party here)
    ratings[partyId] = clamp(Math.round(approval), 0, 100);
  }

  return ratings;
}

/**
 * Compute vote shares that sum to 100% across ALL parties (human + bot).
 * For each voter group, each party gets a share proportional to their satisfaction.
 * Then weighted by voter group population share.
 */
export function computeVoteShares(
  allVoterSatisfaction: Record<string, Record<string, number>>,
): Record<string, number> {
  const voteShares: Record<string, number> = {};
  const partyIds = Object.keys(allVoterSatisfaction);
  if (partyIds.length === 0) return voteShares;

  // Initialize
  for (const pid of partyIds) {
    voteShares[pid] = 0;
  }

  for (const group of VOTER_GROUPS) {
    // Get each party's satisfaction with this group
    const partySats: Record<string, number> = {};
    let totalSat = 0;
    for (const pid of partyIds) {
      // Use max(1, sat) to avoid zero-division and give everyone at least a sliver
      const sat = Math.max(1, allVoterSatisfaction[pid]?.[group.id] ?? 1);
      partySats[pid] = sat;
      totalSat += sat;
    }

    // Convert to proportional share for this group, weighted by population
    if (totalSat > 0) {
      for (const pid of partyIds) {
        voteShares[pid] += (partySats[pid] / totalSat) * group.populationShare * 100;
      }
    }
  }

  // Normalize to exactly 100% (population shares should sum to 1.0 but just in case)
  const total = Object.values(voteShares).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const pid of partyIds) {
      voteShares[pid] = Math.round((voteShares[pid] / total) * 1000) / 10; // one decimal
    }
  }

  return voteShares;
}

/**
 * Legacy wrapper — single-party approval from flat satisfaction map.
 */
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
  partyApproval: number,
  rulingApproval: number,
  cabinet?: CabinetState
): number {
  if (player.role === 'ruling') {
    let pc = 6;
    if (partyApproval > 60) pc += 1;
    if (partyApproval < 30) pc -= 1;

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
    // Opposition gets more PC when ruling party is unpopular
    if (rulingApproval < 40) pc += 1;
    // And when their own support is strong
    if (partyApproval > 35) pc += 1;
    return Math.max(1, pc);
  }
}

// ---- Election ----

/**
 * Run election with ALL parties (human + bot) competing for seats.
 * Bot parties get votes based on their voter satisfaction scores.
 */
export function runElection(
  regionalSatisfaction: Record<string, Record<string, number>>,
  players: Player[],
  turn: number,
  activeEffects: ActiveEffect[],
  campaignBonuses: Record<string, Record<string, number>>,
  allVoterSatisfaction?: Record<string, Record<string, number>>,
  botParties?: BotParty[],
): ElectionResult {
  const seatResults: Record<string, Record<string, number>> = {};
  const voteShares: Record<string, Record<string, number>> = {};
  const regionWinners: Record<string, string> = {};
  const totalSeats: Record<string, number> = {};

  // All party IDs (human + bot)
  const allPartyIds = [
    ...players.map(p => p.id),
    ...(botParties ?? []).map(b => b.id),
  ];
  for (const pid of allPartyIds) {
    totalSeats[pid] = 0;
  }

  for (const region of REGIONS) {
    const shares: Record<string, number> = {};
    seatResults[region.id] = {};

    // Human players
    for (const player of players) {
      let share = regionalSatisfaction[region.id]?.[player.id] ?? 50;

      // Campaign bonuses for this player
      const playerBonuses = campaignBonuses[player.id] ?? {};
      share += (playerBonuses[region.id] ?? 0) * 0.5;
      for (const groupId of region.dominantGroups) {
        share += (playerBonuses[groupId] ?? 0) * 0.3;
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

    // Bot parties — derive regional support from voter satisfaction
    for (const bot of (botParties ?? [])) {
      let share = 0;
      const botSat = allVoterSatisfaction?.[bot.id] ?? {};

      // Weighted by which voter groups are in this region
      for (const groupId of region.dominantGroups) {
        share += (botSat[groupId] ?? 30) * 0.25;
      }

      // Ideology alignment with region
      const econDiff = Math.abs(region.economicLean - bot.economicAxis);
      const socialDiff = Math.abs(region.socialLean - bot.socialAxis);
      share += (200 - econDiff - socialDiff) * 0.05;

      shares[bot.id] = Math.max(3, share);
    }

    // Normalize to 100%
    const totalShares = Object.values(shares).reduce((a, b) => a + b, 0);
    const normalizedShares: Record<string, number> = {};
    for (const [pid, s] of Object.entries(shares)) {
      normalizedShares[pid] = (s / totalShares) * 100;
    }
    voteShares[region.id] = normalizedShares;

    // Allocate seats proportionally
    const regionSeats = allocateSeats(
      { [region.id]: normalizedShares },
      players,
      botParties,
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
  for (const pid of allPartyIds) {
    let totalWeightedShare = 0;
    for (const region of REGIONS) {
      totalWeightedShare += (voteShares[region.id]?.[pid] ?? 0) * region.populationShare;
    }
    overallVoteShare[pid] = Math.round(totalWeightedShare * 10) / 10;
  }

  // Winner by seats (only human players can "win" and form government)
  let winnerPid = players[0]?.id ?? '';
  let maxSeatsHuman = 0;
  for (const player of players) {
    const seats = totalSeats[player.id] ?? 0;
    if (seats > maxSeatsHuman) {
      maxSeatsHuman = seats;
      winnerPid = player.id;
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
  // Per-party versions will be initialized when players join
  const perPartyVoterSat: Record<string, Record<string, number>> = {};
  const perPartyApproval: Record<string, number> = {};
  // Starting debt: 45% of GDP → ~200B (reasonable starting point)
  const startingDebt = 450 * 0.45;
  const budget = calculateBudget(policies, simulation, startingDebt);

  return {
    roomId,
    players: [],
    turn: 1,
    phase: 'waiting',
    date: { month: 1, year: 2025 },
    policies,
    simulation,
    budget,
    voterSatisfaction: perPartyVoterSat,
    regionalSatisfaction: {},
    approvalRating: perPartyApproval,
    rulingApproval: approvalRating,
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
    turnsUntilElection: 5, // First 5 turns are campaign, turn 6 = first election
    consecutiveLowEnvRegulations: 0,
    consecutiveHighSpending: 0,
    shadowCabinet: { finance: null, interior: null, defense: null, health: null, education: null, foreign: null, environment: null, justice: null },
    oppositionCredibility: 80,
    delayedPolicies: [],
    ngoAlliances: [],
    motionsPending: [],
    campaignPhase: false,
    questionTimeUsed: false,
    lastTurnPolicyChanges: [],
    selectedNodeId: null,
    botParties: BOT_PARTIES.map(bp => ({ ...bp })),
    coalitionPartners: [],
    coalitionOffers: [],
    coalitionDemands: [],
    pendingCampaignActions: [],
    campaignBonuses: {},
    isPreElection: true,
    voteShares: {},
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
  state.lastTurnPolicyChanges = changes.filter(c => !state.filibusteredPolicies.includes(c.policyId));
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
              modifyRulingApproval(state, -3);
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
        if (getRulingApproval(state) < 25) {
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
        log.push('Lobbying parliament members to rebel on next vote.');
        break;
      }
      case 'propose_amendment': {
        if (action.targetBillId) {
          log.push(`Amendment proposed for bill ${action.targetBillId}`);
        }
        break;
      }
      case 'table_motion': {
        if (action.targetSimVar && action.topic) {
          state.motionsPending.push({
            topic: action.topic,
            targetSimVar: action.targetSimVar,
            turnsRemaining: 1,
          });
          log.push(`📋 Motion tabled: "${action.topic}" — Government must respond or lose approval`);
        }
        break;
      }
      case 'question_time': {
        if (action.targetSimVar && !state.questionTimeUsed) {
          state.questionTimeUsed = true;
          const simVal = state.simulation[action.targetSimVar];
          const varName = action.targetSimVar.replace(/([A-Z])/g, ' $1').toLowerCase();
          if (simVal < 40 || (action.targetSimVar === 'crime' && simVal > 60) ||
              (action.targetSimVar === 'unemployment' && simVal > 10) ||
              (action.targetSimVar === 'pollution' && simVal > 60) ||
              (action.targetSimVar === 'corruption' && simVal > 50)) {
            const impact = 2 + Math.floor(Math.random() * 4);
            modifyRulingApproval(state, -impact);
            log.push(`🎤 Question Time: Grilled PM on ${varName} — Ruling approval -${impact}%!`);
          } else {
            log.push(`🎤 Question Time: PM handled questions on ${varName} well. No impact.`);
          }
        }
        break;
      }
      case 'propose_counter_bill': {
        if (action.proposedPolicyId && action.proposedValue !== undefined) {
          const policy = POLICY_MAP.get(action.proposedPolicyId);
          if (policy) {
            let oppSupport = 0;
            let rulSupport = 0;
            for (const group of VOTER_GROUPS) {
              const ideal = group.policyPreferences[action.proposedPolicyId];
              if (ideal !== undefined) {
                const currentDist = Math.abs(state.policies[action.proposedPolicyId] - ideal);
                const proposedDist = Math.abs(action.proposedValue - ideal);
                if (proposedDist < currentDist) oppSupport++;
                else rulSupport++;
              }
            }
            if (oppSupport > rulSupport) {
              modifyRulingApproval(state, -5);
              log.push(`📜 Counter-Bill for ${policy.name} wins public support! Ruling approval -5%`);
            } else {
              log.push(`📜 Counter-Bill for ${policy.name} rejected — government's position preferred.`);
            }
          }
        }
        break;
      }
      case 'rally_protest': {
        if (action.targetRegionId) {
          const policeFunding = state.policies.police ?? 50;
          const region = REGIONS.find(r => r.id === action.targetRegionId);
          if (policeFunding > 65) {
            state.oppositionCredibility = Math.max(0, state.oppositionCredibility - 5);
            log.push(`✊ Rally in ${region?.name ?? action.targetRegionId} SUPPRESSED by police! -5 credibility`);
            // Small bonus still
            state.activeEffects.push({
              type: 'media_attack',
              id: `rally_${Date.now()}`,
              turnsRemaining: 2,
              data: { type: 'rally', regionId: action.targetRegionId, bonus: 3 },
            });
          } else {
            state.activeEffects.push({
              type: 'media_attack',
              id: `rally_${Date.now()}`,
              turnsRemaining: 2,
              data: { type: 'rally', regionId: action.targetRegionId, bonus: 10 },
            });
            log.push(`✊ Rally in ${region?.name ?? action.targetRegionId}! +10% opposition support for 2 turns`);
          }
        }
        break;
      }
      case 'leak_scandal': {
        const corruption = state.simulation.corruption;
        const intel = state.policies.intelligence ?? 30;
        const pressFreedom = state.policies.press_freedom ?? 65;
        if (corruption > 30 || intel < 30) {
          modifyRulingApproval(state, -8);
          log.push(`🔍 SCANDAL LEAKED! Ruling approval -8%`);
          // Chance of getting caught — higher press freedom = lower chance
          const catchChance = Math.max(0.1, 0.6 - (pressFreedom / 200));
          if (Math.random() < catchChance) {
            state.oppositionCredibility = Math.max(0, state.oppositionCredibility - 20);
            log.push(`🚨 Opposition caught leaking! -20 credibility`);
          }
        } else {
          log.push(`🔍 Leak attempt failed — no dirt to find.`);
        }
        break;
      }
      case 'form_ngo_alliance': {
        if (action.targetGroupId) {
          const alliances = state.ngoAlliances ?? [];
          if (alliances.length < 3) {
            const existing = alliances.find(a => a.groupId === action.targetGroupId);
            if (!existing) {
              state.ngoAlliances.push({ groupId: action.targetGroupId!, bonus: 3 });
              const group = VOTER_GROUPS.find(g => g.id === action.targetGroupId);
              log.push(`🤝 NGO Alliance formed with ${group?.name ?? action.targetGroupId}! Permanent +3% support`);
            } else {
              log.push(`Already allied with this group.`);
            }
          } else {
            log.push(`Maximum 3 NGO alliances reached.`);
          }
        }
        break;
      }
      case 'senate_veto': {
        const oppSeats = state.parliament.seatsByParty[opposition.id] ?? 0;
        if (oppSeats > 40 && action.targetPolicyId) {
          state.filibusteredPolicies.push(action.targetPolicyId);
          const name = POLICY_MAP.get(action.targetPolicyId)?.name ?? action.targetPolicyId;
          log.push(`🏛️ Senate VETO: Blocked ${name}!`);
        } else if (oppSeats <= 40) {
          log.push(`🏛️ Senate Veto failed — need >40 seats (have ${oppSeats})`);
        }
        break;
      }
      case 'constitutional_challenge': {
        if (action.targetPolicyId && state.lastTurnPolicyChanges) {
          const lastChange = state.lastTurnPolicyChanges.find(c => c.policyId === action.targetPolicyId);
          if (lastChange && state.simulation.freedomIndex < 50) {
            state.policies[action.targetPolicyId] = lastChange.oldValue;
            const name = POLICY_MAP.get(action.targetPolicyId)?.name ?? action.targetPolicyId;
            log.push(`⚖️ Constitutional Challenge SUCCEEDS! ${name} reverted!`);
          } else if (lastChange) {
            state.oppositionCredibility = Math.max(0, state.oppositionCredibility - 10);
            log.push(`⚖️ Constitutional Challenge FAILS. Freedom too high. -10 credibility`);
          } else {
            log.push(`⚖️ No recent changes to challenge.`);
          }
        }
        break;
      }
      case 'delay_tactics': {
        if (action.targetPolicyId && state.lastTurnPolicyChanges) {
          const lastChange = state.lastTurnPolicyChanges.find(c => c.policyId === action.targetPolicyId);
          if (lastChange) {
            // Revert and add to delayed queue
            state.policies[action.targetPolicyId] = lastChange.oldValue;
            state.delayedPolicies.push({
              policyId: action.targetPolicyId,
              originalValue: lastChange.oldValue,
              newValue: lastChange.newValue,
              turnsRemaining: 2,
            });
            const name = POLICY_MAP.get(action.targetPolicyId)?.name ?? action.targetPolicyId;
            log.push(`⏳ Delay Tactics: ${name} delayed by 2 turns`);
          }
        }
        break;
      }
      case 'campaign_visit': {
        if (action.targetRegionId && state.campaignPhase) {
          state.activeEffects.push({
            type: 'media_attack',
            id: `campvisit_${Date.now()}`,
            turnsRemaining: 99,
            data: { type: 'campaign_visit', regionId: action.targetRegionId, bonus: 5 },
          });
          const region = REGIONS.find(r => r.id === action.targetRegionId);
          log.push(`🎪 Campaign visit to ${region?.name ?? action.targetRegionId}! +5% permanent support`);
        }
        break;
      }
      case 'run_ads': {
        if (action.targetGroupId && state.campaignPhase) {
          state.activeEffects.push({
            type: 'media_attack',
            id: `ads_${Date.now()}`,
            turnsRemaining: 99,
            data: { type: 'campaign', groupId: action.targetGroupId, bonus: 5 },
          });
          const group = VOTER_GROUPS.find(g => g.id === action.targetGroupId);
          log.push(`📺 Campaign ads targeting ${group?.name ?? action.targetGroupId}! +5% support`);
        }
        break;
      }
    }
  }

  opposition.politicalCapital -= totalCost;
  return log;
}

// ---- Helper: modify ruling party approval ----

function modifyRulingApproval(state: GameState, delta: number): void {
  const ruling = state.players.find(p => p.role === 'ruling');
  if (ruling && state.approvalRating[ruling.id] !== undefined) {
    state.approvalRating[ruling.id] = clamp(state.approvalRating[ruling.id] + delta, 0, 100);
    state.rulingApproval = state.approvalRating[ruling.id];
  } else {
    state.rulingApproval = clamp((state.rulingApproval ?? 50) + delta, 0, 100);
  }
}

function getRulingApproval(state: GameState): number {
  const ruling = state.players.find(p => p.role === 'ruling');
  if (ruling && state.approvalRating[ruling.id] !== undefined) {
    return state.approvalRating[ruling.id];
  }
  return state.rulingApproval ?? 50;
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
    approval: getRulingApproval(state),
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
    // After party creation, start campaign phase (pre-election)
    if (state.isPreElection) {
      state.phase = 'campaigning';
    } else {
      state.phase = 'events';
    }
    return;
  }

  // Campaign phase: both players take campaign actions, then polling → next turn or election
  if (state.phase === 'campaigning') {
    state.phase = 'polling';
    return;
  }

  if (state.phase === 'government_formation') {
    state.phase = 'events';
    return;
  }

  // Coalition negotiation → government formation
  if (state.phase === 'coalition_negotiation') {
    state.phase = 'government_formation';
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
      state.activeSituations = state.activeSituations.filter(s => {
        if (shouldResolveSituation(s.id, state.policies, state.simulation, state.consecutiveLowEnvRegulations)) {
          if (s.turnsActive >= 2) return false;
        }
        s.turnsActive++;
        return true;
      });

      // Update extremism
      state.extremism = updateExtremism(state.extremism, state.policies, state.simulation);

      // Process delayed policies
      state.delayedPolicies = (state.delayedPolicies ?? []).filter(dp => {
        dp.turnsRemaining--;
        if (dp.turnsRemaining <= 0) {
          state.policies[dp.policyId] = dp.newValue;
          addNewsItem(state, `Delayed policy ${POLICY_MAP.get(dp.policyId)?.name} now takes effect`, 'bill');
          return false;
        }
        return true;
      });

      // Process pending motions
      state.motionsPending = (state.motionsPending ?? []).filter(m => {
        m.turnsRemaining--;
        if (m.turnsRemaining <= 0) {
          const simVal = state.simulation[m.targetSimVar];
          const isBad = simVal < 40 || (m.targetSimVar === 'crime' && simVal > 60) ||
            (m.targetSimVar === 'unemployment' && simVal > 10);
          if (isBad) {
            modifyRulingApproval(state, -3);
            addNewsItem(state, `Government failed to address motion on "${m.topic}" — approval -3%`, 'general');
          }
          return false;
        }
        return true;
      });

      // Reset question time
      state.questionTimeUsed = false;

      // Campaign phase check (last 3 turns before election)
      state.campaignPhase = state.turnsUntilElection <= 3;

      // Shadow cabinet PC bonus
      const opp = state.players.find(p => p.role === 'opposition');
      if (opp && state.shadowCabinet) {
        const MINISTRY_SIM_VARS: Partial<Record<string, SimVarKey>> = {
          finance: 'gdpGrowth', interior: 'crime', defense: 'nationalSecurity',
          health: 'healthIndex', education: 'educationIndex', environment: 'pollution',
          justice: 'freedomIndex', foreign: 'nationalSecurity',
        };
        for (const [mId, polId] of Object.entries(state.shadowCabinet)) {
          if (polId) {
            const simVar = MINISTRY_SIM_VARS[mId];
            if (simVar) {
              const val = state.simulation[simVar];
              const isBad = (simVar === 'crime' || simVar === 'pollution') ? val > 60 : val < 40;
              if (isBad) opp.politicalCapital += 1;
            }
          }
        }
      }

      // Recalculate voter satisfaction and vote shares every turn
      state.voterSatisfaction = computeAllVoterSatisfaction(
        state.players, state.policies, state.simulation,
        state.activeEffects, state.ngoAlliances ?? [], state.botParties
      );
      state.approvalRating = computeAllApprovalRatings(state.voterSatisfaction, state.activeEffects);
      state.voteShares = computeVoteShares(state.voterSatisfaction);

      // Give PC
      const rulingApprovalVal = getRulingApproval(state);
      for (const player of state.players) {
        const partyApproval = state.approvalRating[player.id] ?? 50;
        let pc = computePoliticalCapital(
          player, partyApproval, rulingApprovalVal, state.cabinet
        );
        if (state.campaignPhase) pc += 2;
        // During pre-election campaign, all players get equal PC
        if (state.isPreElection) pc = 5;
        player.politicalCapital += pc;
      }

      // If still in pre-election campaign phase, go back to campaigning
      if (state.isPreElection) {
        state.phase = 'campaigning';
      } else {
        state.phase = 'events';
      }
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
      // After election, go to coalition negotiation
      state.phase = 'coalition_negotiation';
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
