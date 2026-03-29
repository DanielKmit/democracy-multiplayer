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
  Pledge,
  VoterCynicism,
  DEFAULT_GAME_SETTINGS,
  Scandal,
} from './types';
import { POLICIES, POLICY_MAP } from './policies';
import { VOTER_GROUPS } from './voters';
import { REGIONS, REGION_MAP } from './regions';
import { rollForEvent } from './events';
import { calculateBudget } from './budget';
import { getInitialPoliticianPool, getPoliticianById } from './politicians';
import { createInitialParliament } from './parliament';
import { createInitialExtremism, updateExtremism } from './extremism';
import { checkSituations, shouldResolveSituation } from './situations';
import { checkRegionalEvents, getRegionalEventById } from './regionalEvents';
import { checkMediaEvents } from './mediaEvents';
import { checkVoterGroupEvents } from './voterGroupEvents';
import { rollForScandal, plantEvidence, spinScandal, tickScandals } from './scandals';
import { createInitialReputation, updateReputation, getReputationEffects } from './reputation';
import { updateVictoryTrackers, checkVictory, createVictoryTracker } from './victoryConditions';
import { checkActiveSynergies, applySynergyEffects } from './policySynergies';
import { createInitialRelations, updateRelations, rollForDiplomaticIncident, applyTradeEffects, signTradeDeal, sendForeignAid } from './internationalRelations';

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
  voterCynicism?: VoterCynicism,
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

    // D4: Cynicism reduces voter turnout — fewer total votes from this group
    const cynicism = voterCynicism?.[group.id] ?? 0;
    const turnoutMultiplier = 1 - (cynicism / 200); // 0 cynicism = 100%, 100 cynicism = 50%

    // Convert to proportional share for this group, weighted by population and turnout
    if (totalSat > 0) {
      for (const pid of partyIds) {
        voteShares[pid] += (partySats[pid] / totalSat) * group.populationShare * 100 * turnoutMultiplier;
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
 * D'Hondt method for proportional seat allocation.
 * Avoids fractional seats — each seat is awarded to the party with the highest quotient.
 */
function allocateSeatsProportional(
  voteShares: Record<string, number>,
  totalSeats: number,
): Record<string, number> {
  const seats: Record<string, number> = {};
  const partyIds = Object.keys(voteShares);

  // Initialize seats to 0
  for (const pid of partyIds) {
    seats[pid] = 0;
  }

  // Award seats one at a time using D'Hondt quotients
  for (let i = 0; i < totalSeats; i++) {
    let bestId = '';
    let bestQuotient = -1;

    for (const pid of partyIds) {
      const quotient = (voteShares[pid] ?? 0) / ((seats[pid] ?? 0) + 1);
      if (quotient > bestQuotient) {
        bestQuotient = quotient;
        bestId = pid;
      }
    }

    if (bestId) {
      seats[bestId] = (seats[bestId] ?? 0) + 1;
    }
  }

  return seats;
}

/**
 * Run election with ALL parties (human + bot) competing for seats.
 * Uses campaign bonuses, regional satisfaction, ideology alignment, and random swing.
 * Seats allocated per-region using D'Hondt proportional method.
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
      // Base: regional satisfaction (weighted average of voter group satisfaction in region)
      let share = regionalSatisfaction[region.id]?.[player.id] ?? 50;

      // Campaign bonuses — region-specific rallies (strong effect)
      const playerBonuses = campaignBonuses[player.id] ?? {};
      share += (playerBonuses[region.id] ?? 0) * 0.8;

      // Campaign bonuses — targeting dominant voter groups in this region
      for (const groupId of region.dominantGroups) {
        share += (playerBonuses[groupId] ?? 0) * 0.5;
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

      // Random swing: ±5% polling error per party per region
      const swing = (Math.random() - 0.5) * 10;
      share += swing;

      shares[player.id] = Math.max(5, share);
    }

    // Bot parties — ideology alignment + voter satisfaction + random swing
    for (const bot of (botParties ?? [])) {
      let share = 0;
      const botSat = allVoterSatisfaction?.[bot.id] ?? {};

      // Base from voter group satisfaction in this region
      for (const groupId of region.dominantGroups) {
        share += (botSat[groupId] ?? 30) * 0.3;
      }

      // Ideology alignment with region (stronger effect)
      const econDiff = Math.abs(region.economicLean - bot.economicAxis);
      const socialDiff = Math.abs(region.socialLean - bot.socialAxis);
      // Max alignment bonus: ~15 points when perfectly aligned
      share += (200 - econDiff - socialDiff) * 0.075;

      // Random swing: ±2% for bots (less volatile than player parties)
      share += (Math.random() - 0.5) * 4;

      shares[bot.id] = Math.max(3, share);
    }

    // Normalize to 100%
    const totalShares = Object.values(shares).reduce((a, b) => a + b, 0);
    const normalizedShares: Record<string, number> = {};
    for (const [pid, s] of Object.entries(shares)) {
      normalizedShares[pid] = (s / totalShares) * 100;
    }
    voteShares[region.id] = normalizedShares;

    // Allocate seats using D'Hondt proportional method
    const regionSeatAlloc = allocateSeatsProportional(normalizedShares, region.seats);

    for (const [pid, seatCount] of Object.entries(regionSeatAlloc)) {
      if (seatCount > 0) {
        seatResults[region.id][pid] = seatCount;
        totalSeats[pid] = (totalSeats[pid] ?? 0) + seatCount;
      }
    }

    // Region winner = party with most seats in this region
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

  // Overall vote share (population-weighted)
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
    campaignActedThisTurn: {},
    // D4 Features
    pledges: [],
    voterCynicism: {},
    appliedEvents: [],
    consecutiveLowApprovalTurns: 0,
    consecutiveRulingPartyElections: 0,
    activeRegionalEvents: [],
    autoPilotOpposition: false,
    // AI opponent
    isAIGame: false,
    aiPlayerId: null,
    aiIdeology: null,
    aiThinking: false,
    // === NEW FEATURES ===
    activeScandals: [],
    reputation: createInitialReputation([]),
    gameSettings: { ...DEFAULT_GAME_SETTINGS },
    victoryTrackers: {},
    activeSynergies: [],
    diplomaticRelations: createInitialRelations(),
    activeDiplomaticIncident: null,
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

    // Cost = 1 PC per policy level step (Off/Low/Medium/High/Maximum = 25pts each)
    const steps = Math.round(Math.abs(change.newValue - change.oldValue) / 25);
    const cost = Math.max(1, steps); // minimum 1 PC for any change
    if (totalCost + cost > ruling.politicalCapital) {
      log.push(`Not enough PC to change ${policy.name}`);
      continue;
    }

    totalCost += cost;
    // D4: Policy changes don't take effect immediately — delayed by 2 turns
    state.delayedPolicies.push({
      policyId: change.policyId,
      originalValue: change.oldValue,
      newValue: clamp(change.newValue, 0, 100),
      turnsRemaining: 2,
      source: 'bill',
    });
    log.push(`${policy.name}: ${change.oldValue} → ${change.newValue} (${cost} PC, takes effect in 2 turns)`);
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
      case 'plant_evidence': {
        // Opposition plants evidence to create a scandal (40% backfire)
        if (action.scandalType && state.gameSettings?.scandalsEnabled !== false) {
          const ruling = state.players.find(p => p.role === 'ruling');
          if (ruling) {
            const { scandal, backfired } = plantEvidence(ruling.id, opposition.id, action.scandalType);
            if (!state.activeScandals) state.activeScandals = [];
            state.activeScandals.push(scandal);

            if (backfired) {
              log.push(`🔥 PLANTED EVIDENCE BACKFIRED! Scandal hits opposition instead!`);
              addNewsItem(state, `🔥 Opposition scandal planting exposed! ${scandal.title}`, 'event');
              // Impact opposition approval
              if (state.approvalRating[opposition.id] !== undefined) {
                state.approvalRating[opposition.id] = clamp(
                  state.approvalRating[opposition.id] + scandal.approvalImpact, 0, 100
                );
              }
              // Reputation hit
              if (state.reputation?.scores) {
                state.reputation.scores[opposition.id] = Math.max(0,
                  (state.reputation.scores[opposition.id] ?? 60) - 15
                );
              }
            } else {
              log.push(`🔍 Evidence planted! ${scandal.title} hits ruling party`);
              modifyRulingApproval(state, scandal.approvalImpact);
            }
          }
        }
        break;
      }
      case 'spin_scandal': {
        // Ruling party spins a scandal (costs 2 PC, reduces impact 50%)
        // This is handled as a ruling action but can also be triggered here
        if (action.scandalId) {
          const scandal = (state.activeScandals ?? []).find(s => s.id === action.scandalId);
          if (scandal && !scandal.spun) {
            const spun = spinScandal(scandal);
            state.activeScandals = state.activeScandals.map(s =>
              s.id === action.scandalId ? spun : s
            );
            log.push(`🔄 Scandal "${scandal.title}" spun — impact reduced 50%`);
          }
        }
        break;
      }
      case 'sign_trade_deal': {
        if (action.targetNationId && state.gameSettings?.internationalRelationsEnabled !== false) {
          const deal = signTradeDeal(state.diplomaticRelations, action.targetNationId);
          if (deal) {
            log.push(`📊 Trade deal signed with ${action.targetNationId}! GDP +${deal.gdpBonus.toFixed(1)}%`);
            addNewsItem(state, `🤝 Trade agreement reached with ${action.targetNationId}`, 'general');
          } else {
            log.push(`❌ Trade deal with ${action.targetNationId} failed — relations too low or already active`);
          }
        }
        break;
      }
      case 'send_foreign_aid': {
        if (action.targetNationId && action.aidAmount && state.gameSettings?.internationalRelationsEnabled !== false) {
          const result = sendForeignAid(state.diplomaticRelations, action.targetNationId, action.aidAmount);
          if (result.success) {
            log.push(`🌐 Sent $${action.aidAmount}B aid to ${action.targetNationId} — relations +${result.relationGain}`);
            addNewsItem(state, `🌐 Foreign aid package sent to ${action.targetNationId}`, 'general');
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

// ---- Bot Party Bill Proposals ----

/**
 * Each bot party has a 20% chance to propose a bill aligned with their ideology.
 * Called after opposition phase, before polling.
 */
export function proposeBotBills(state: GameState): void {
  for (const bot of (state.botParties ?? [])) {
    if (Math.random() > 0.20) continue; // 20% chance

    // Pick a policy they care about — find one where current value differs from preference
    const policyEntries = Object.entries(bot.policyPreferences);
    if (policyEntries.length === 0) continue;

    // Sort by how far the current value is from their ideal (most upset = most likely to act)
    const ranked = policyEntries
      .map(([policyId, idealValue]) => ({
        policyId,
        idealValue,
        currentValue: state.policies[policyId] ?? 50,
        distance: Math.abs((state.policies[policyId] ?? 50) - idealValue),
      }))
      .filter(e => e.distance >= 10) // Only propose if they disagree enough
      .sort((a, b) => b.distance - a.distance);

    if (ranked.length === 0) continue;

    // Pick from top 3 most disagreed policies (some randomness)
    const pick = ranked[Math.floor(Math.random() * Math.min(3, ranked.length))];
    const policy = POLICY_MAP.get(pick.policyId);
    if (!policy) continue;

    // Propose moving partway toward their ideal (not all the way — realistic)
    const step = Math.round((pick.idealValue - pick.currentValue) * 0.4);
    const proposedValue = clamp(pick.currentValue + step, 0, 100);
    if (proposedValue === pick.currentValue) continue;

    // Generate a thematic bill title
    const direction = proposedValue > pick.currentValue ? 'Enhancement' : 'Reform';
    const title = `${bot.name} ${policy.name} ${direction} Act`;

    const bill: Bill = {
      id: `bill_bot_${bot.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      policyId: pick.policyId,
      proposedValue,
      currentValue: pick.currentValue,
      authorId: bot.id,
      status: 'voting',
      votesFor: 0,
      votesAgainst: 0,
      isEmergency: false,
    };

    // Import voteBill from parliament — we'll call it from gameHost where it's available
    // For now, just add the bill to activeBills and mark it for voting
    state.activeBills.push(bill);

    addNewsItem(state, `📋 ${bot.name} proposes "${title}" — ${policy.name}: ${pick.currentValue} → ${proposedValue}`, 'bill');
    addLogEntry(state, `${bot.name} proposes ${title}`, 'info');
  }
}

/**
 * Recalculate all derived state after a policy change.
 * Returns a summary of changes for notification purposes.
 */
export function recalculateAfterPolicyChange(
  state: GameState,
  policyId: string,
  oldValue: number,
  newValue: number,
): string {
  const policy = POLICY_MAP.get(policyId);
  const policyName = policy?.name ?? policyId;

  // Snapshot before
  const oldBudgetRevenue = state.budget.revenue;
  const oldBudgetSpending = state.budget.spending;

  // Recalculate
  state.simulation = computeSimulation(state.policies, state.activeEffects);
  state.budget = calculateBudget(state.policies, state.simulation, state.budget.debtTotal ?? 200);

  if (state.players.length >= 1) {
    const oldSatisfaction = { ...state.voterSatisfaction };
    state.voterSatisfaction = computeAllVoterSatisfaction(
      state.players, state.policies, state.simulation,
      state.activeEffects, state.ngoAlliances ?? [], state.botParties,
    );
    state.approvalRating = computeAllApprovalRatings(state.voterSatisfaction, state.activeEffects);
    state.voteShares = computeVoteShares(state.voterSatisfaction, state.voterCynicism);

    const ruling = state.players.find(p => p.role === 'ruling');
    if (ruling) {
      state.rulingApproval = state.approvalRating[ruling.id] ?? 50;
    }
  }

  // Build notification
  const revenueDelta = Math.round(state.budget.revenue - oldBudgetRevenue);
  const spendingDelta = Math.round(state.budget.spending - oldBudgetSpending);
  const parts: string[] = [`${policyName} changed to ${newValue}`];
  if (revenueDelta !== 0) parts.push(`Revenue ${revenueDelta > 0 ? '+' : ''}${revenueDelta}B`);
  if (spendingDelta !== 0) parts.push(`Spending ${spendingDelta > 0 ? '+' : ''}${spendingDelta}B`);

  return parts.join(' → ');
}

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
      const newSits = checkSituations(state.policies, state.simulation, activeSitIds, state.consecutiveLowEnvRegulations, state.budget);
      for (const sitId of newSits) {
        state.activeSituations.push({ id: sitId, turnsActive: 0, acknowledged: false });
      }
      state.activeSituations = state.activeSituations.filter(s => {
        if (shouldResolveSituation(s.id, state.policies, state.simulation, state.consecutiveLowEnvRegulations, state.budget)) {
          if (s.turnsActive >= 2) return false;
        }
        s.turnsActive++;
        return true;
      });

      // Update extremism
      state.extremism = updateExtremism(state.extremism, state.policies, state.simulation);

      // === ASSASSINATION MECHANICS ===
      const intelligenceBudget = state.policies.intelligence ?? 30;
      const extremistGroups: { key: 'far_left' | 'far_right' | 'religious' | 'eco'; name: string }[] = [
        { key: 'far_left', name: 'Far-Left Extremists' },
        { key: 'far_right', name: 'Far-Right Extremists' },
        { key: 'religious', name: 'Religious Extremists' },
        { key: 'eco', name: 'Eco-Terrorists' },
      ];
      for (const group of extremistGroups) {
        const threat = state.extremism[group.key];
        if (threat > 80) {
          const successChance = ((threat - 80) / 100) * (1 - intelligenceBudget / 100);
          if (Math.random() < successChance) {
            // Assassination succeeds
            state.extremism.assassinationSucceeded = true;
            state.extremism.assassinationAttempted = true;
            const rulingPlayer = state.players.find(p => p.role === 'ruling');
            const rulingName = rulingPlayer?.party.partyName ?? 'the government';
            addNewsItem(state, `💀 Assassination Attempt Succeeds — Leader of ${rulingName} eliminated by ${group.name}!`, 'event');
            addLogEntry(state, `💀 ASSASSINATION! ${group.name} have assassinated the leader!`, 'event');
            state.turnsUntilElection = 0; // Force snap election
            break; // Only one attempt per turn
          } else {
            // Assassination foiled
            state.extremism.assassinationAttempted = true;
            state.extremism[group.key] = Math.max(0, state.extremism[group.key] - 30);
            addNewsItem(state, `🚨 Assassination Plot Foiled by Intelligence Services — ${group.name} threat reduced`, 'event');
            addLogEntry(state, `🚨 Assassination attempt by ${group.name} FOILED!`, 'event');
          }
        }
      }

      // === REGIONAL EVENTS ===
      if (!state.activeRegionalEvents) state.activeRegionalEvents = [];
      // Tick existing regional events
      state.activeRegionalEvents = state.activeRegionalEvents.filter(re => {
        re.turnsRemaining--;
        return re.turnsRemaining > 0;
      });
      // Check for new regional events
      const activeRegIds = state.activeRegionalEvents.map(re => re.id);
      const newRegEvents = checkRegionalEvents(state.policies, state.simulation, activeRegIds);
      for (const eventId of newRegEvents) {
        const eventDef = getRegionalEventById(eventId);
        if (eventDef) {
          state.activeRegionalEvents.push({
            id: eventDef.id,
            regionId: eventDef.regionId,
            name: eventDef.name,
            description: eventDef.description,
            icon: eventDef.icon,
            turnsRemaining: eventDef.duration,
          });
          // Apply sim effects
          for (const [key, val] of Object.entries(eventDef.effects)) {
            (state.simulation as unknown as Record<string, number>)[key] =
              ((state.simulation as unknown as Record<string, number>)[key] ?? 0) + (val as number);
          }
          // Apply regional satisfaction impact
          if (state.regionalSatisfaction[eventDef.regionId]) {
            for (const playerId of Object.keys(state.regionalSatisfaction[eventDef.regionId])) {
              state.regionalSatisfaction[eventDef.regionId][playerId] = clamp(
                (state.regionalSatisfaction[eventDef.regionId][playerId] ?? 50) + eventDef.satisfactionImpact,
                0, 100
              );
            }
          }
          const regionName = eventDef.regionId.charAt(0).toUpperCase() + eventDef.regionId.slice(1);
          addNewsItem(state, `${eventDef.icon} [${regionName}] ${eventDef.name}: ${eventDef.description}`, 'event');
          addLogEntry(state, `${eventDef.icon} Regional: ${eventDef.name} in ${regionName}`, 'event');
        }
      }

      // === MEDIA EVENTS ===
      const mediaEvent = checkMediaEvents(state.policies, state.simulation);
      if (mediaEvent) {
        state.activeEffects.push({
          type: 'media_event',
          id: `media_${mediaEvent.id}_${Date.now()}`,
          turnsRemaining: mediaEvent.duration,
          data: {
            effects: mediaEvent.effects,
            approvalImpact: mediaEvent.approvalImpact,
            voterGroupEffects: mediaEvent.voterGroupEffects ?? {},
          },
        });
        // Apply approval impact to ruling party
        const rulingP = state.players.find(p => p.role === 'ruling');
        if (rulingP && state.approvalRating[rulingP.id] !== undefined) {
          state.approvalRating[rulingP.id] = clamp(
            state.approvalRating[rulingP.id] + mediaEvent.approvalImpact, 0, 100
          );
          state.rulingApproval = state.approvalRating[rulingP.id];
        }
        // Apply voter group effects
        if (mediaEvent.voterGroupEffects && rulingP) {
          for (const [groupId, delta] of Object.entries(mediaEvent.voterGroupEffects)) {
            if (state.voterSatisfaction[rulingP.id]?.[groupId] !== undefined) {
              state.voterSatisfaction[rulingP.id][groupId] = clamp(
                state.voterSatisfaction[rulingP.id][groupId] + delta, 0, 100
              );
            }
          }
        }
        addNewsItem(state, `${mediaEvent.icon} ${mediaEvent.name}: ${mediaEvent.description}`, 'event');
        addLogEntry(state, `${mediaEvent.icon} Media: ${mediaEvent.name}`, 'event');
      }

      // === VOTER GROUP EVENTS ===
      const voterGroupEvts = checkVoterGroupEvents(state.policies, state.simulation);
      for (const evt of voterGroupEvts) {
        // Apply satisfaction delta to this group for ALL parties
        for (const [partyId, groupSats] of Object.entries(state.voterSatisfaction)) {
          if (groupSats[evt.groupId] !== undefined) {
            state.voterSatisfaction[partyId][evt.groupId] = clamp(
              groupSats[evt.groupId] + evt.satisfactionDelta, 0, 100
            );
          }
        }
        state.activeEffects.push({
          type: 'voter_group_event',
          id: `vge_${evt.id}_${Date.now()}`,
          turnsRemaining: 2,
          data: { groupId: evt.groupId, delta: evt.satisfactionDelta, name: evt.name },
        });
        const sentiment = evt.satisfactionDelta > 0 ? '📈' : '📉';
        addNewsItem(state, `${evt.icon} ${evt.name}: ${evt.description} ${sentiment}`, 'event');
        addLogEntry(state, `${evt.icon} ${evt.name} (${evt.groupId} ${evt.satisfactionDelta > 0 ? '+' : ''}${evt.satisfactionDelta}%)`, 'event');
      }

      // Process delayed policies (D4: policies take 2 turns to implement)
      let policyChanged = false;
      state.delayedPolicies = (state.delayedPolicies ?? []).filter(dp => {
        dp.turnsRemaining--;
        if (dp.turnsRemaining <= 0) {
          state.policies[dp.policyId] = dp.newValue;
          const policyName = POLICY_MAP.get(dp.policyId)?.name ?? dp.policyId;
          addNewsItem(state, `📋 ${policyName} reform now takes effect (${dp.originalValue} → ${dp.newValue})`, 'bill');
          policyChanged = true;
          return false;
        }
        return true;
      });

      // D4: Check minister resignations when policies actually change
      if (policyChanged) {
        checkMinisterResignations(state);
      }

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

      // D4: Update voter cynicism
      if (!state.voterCynicism) state.voterCynicism = {};
      const rulingPlayer = state.players.find(p => p.role === 'ruling');
      const currentRulingApproval = rulingPlayer ? (state.approvalRating[rulingPlayer.id] ?? 50) : 50;

      // Increase cynicism when approval very low for extended periods
      if (currentRulingApproval < 30) {
        state.consecutiveLowApprovalTurns = (state.consecutiveLowApprovalTurns ?? 0) + 1;
        if (state.consecutiveLowApprovalTurns >= 3) {
          for (const group of VOTER_GROUPS) {
            state.voterCynicism[group.id] = Math.min(100, (state.voterCynicism[group.id] ?? 0) + 3);
          }
        }
      } else {
        state.consecutiveLowApprovalTurns = 0;
        // Slowly decay cynicism when things are going well
        for (const group of VOTER_GROUPS) {
          if ((state.voterCynicism[group.id] ?? 0) > 0) {
            state.voterCynicism[group.id] = Math.max(0, (state.voterCynicism[group.id] ?? 0) - 1);
          }
        }
      }

      // D4: Check broken pledges (8 turn deadline)
      if (!state.pledges) state.pledges = [];
      const brokenPledges = state.pledges.filter(pledge => {
        if (state.turn - pledge.madeOnTurn > 8) {
          // Check if the pledge was fulfilled
          const currentVal = state.policies[pledge.policyId] ?? 50;
          const policy = POLICY_MAP.get(pledge.policyId);
          // Find the value when the pledge was made (approximate via originalValue in delayed or just baseline)
          const fulfilled = pledge.direction === 'increase'
            ? currentVal > 50 // rough check — did it go up from default
            : currentVal < 50;
          return !fulfilled;
        }
        return false;
      });

      if (brokenPledges.length > 0) {
        for (const pledge of brokenPledges) {
          const policy = POLICY_MAP.get(pledge.policyId);
          const policyName = policy?.name ?? pledge.policyId;
          // Increase cynicism for affected voter groups
          for (const group of VOTER_GROUPS) {
            if (group.policyPreferences[pledge.policyId] !== undefined) {
              state.voterCynicism[group.id] = Math.min(100, (state.voterCynicism[group.id] ?? 0) + 10);
            }
          }
          addNewsItem(state, `💔 Broken Promise: ${policyName} was never ${pledge.direction}d as promised`, 'general');
          // Opposition can call out broken pledges
          const rulingP = state.players.find(p => p.role === 'ruling');
          if (rulingP) {
            modifyRulingApproval(state, -5);
          }
        }
        // Remove fulfilled/expired pledges
        state.pledges = state.pledges.filter(p => state.turn - p.madeOnTurn <= 8);
      }

      // === SCANDAL SYSTEM ===
      if (state.gameSettings?.scandalsEnabled !== false) {
        // Tick existing scandals
        if (!state.activeScandals) state.activeScandals = [];
        state.activeScandals = tickScandals(state.activeScandals);

        // Roll for new organic scandals on ruling party
        const rulingForScandal = state.players.find(p => p.role === 'ruling');
        if (rulingForScandal) {
          const pressFreedom = state.policies.press_freedom ?? 65;
          const repScore = state.reputation?.scores?.[rulingForScandal.id] ?? 60;
          const newScandal = rollForScandal(
            rulingForScandal.id, state.simulation, state.policies, pressFreedom, repScore
          );
          if (newScandal) {
            state.activeScandals.push(newScandal);
            modifyRulingApproval(state, newScandal.approvalImpact);
            addNewsItem(state, `🔥 SCANDAL: ${newScandal.title} — ${newScandal.description}`, 'event');
            addLogEntry(state, `🔥 Scandal: ${newScandal.title} (severity: ${newScandal.severity})`, 'event');
          }
        }

        // Apply scandal approval effects
        for (const scandal of state.activeScandals) {
          if (scandal.exposed && !scandal.coveredUp) {
            const target = state.players.find(p => p.id === scandal.targetPlayerId);
            if (target) {
              const impact = scandal.spun ? Math.round(scandal.approvalImpact * 0.3) : Math.round(scandal.approvalImpact * 0.5);
              if (state.approvalRating[target.id] !== undefined) {
                state.approvalRating[target.id] = clamp(state.approvalRating[target.id] + impact, 0, 100);
              }
            }
          }
        }
      }

      // === REPUTATION SYSTEM ===
      if (state.gameSettings?.reputationEnabled !== false) {
        if (!state.reputation) state.reputation = createInitialReputation(state.players.map(p => p.id));
        for (const player of state.players) {
          if (!state.reputation.scores[player.id]) {
            state.reputation.scores[player.id] = 60;
          }
          const playerScandals = (state.activeScandals ?? []).filter(
            s => s.targetPlayerId === player.id && s.exposed
          );
          const cabinetComp = player.role === 'ruling' ? getAverageCabinetCompetence(state) : 0;
          updateReputation(state.reputation, player.id, {
            activeScandals: playerScandals.length,
            brokenPromiseThisTurn: false, // tracked separately in pledge system
            keptPromiseThisTurn: false,
            approval: state.approvalRating[player.id] ?? 50,
            cabinetCompetence: cabinetComp,
            isRuling: player.role === 'ruling',
          });

          // Apply reputation effects
          const repEffects = getReputationEffects(state.reputation.scores[player.id]);
          if (state.approvalRating[player.id] !== undefined) {
            state.approvalRating[player.id] = clamp(
              state.approvalRating[player.id] + repEffects.approvalModifier, 0, 100
            );
          }
        }
      }

      // === POLICY SYNERGIES ===
      if (state.gameSettings?.policySynergiesEnabled !== false) {
        state.activeSynergies = checkActiveSynergies(state.policies);
        if (state.activeSynergies.length > 0) {
          applySynergyEffects(state.simulation, state.activeSynergies);
          // Apply approval bonuses from synergies
          const rulingP2 = state.players.find(p => p.role === 'ruling');
          if (rulingP2) {
            const totalApprovalBonus = state.activeSynergies.reduce((sum, s) => sum + s.approvalBonus, 0);
            if (totalApprovalBonus !== 0 && state.approvalRating[rulingP2.id] !== undefined) {
              state.approvalRating[rulingP2.id] = clamp(
                state.approvalRating[rulingP2.id] + totalApprovalBonus, 0, 100
              );
            }
          }
        }
      }

      // === INTERNATIONAL RELATIONS ===
      if (state.gameSettings?.internationalRelationsEnabled !== false) {
        if (!state.diplomaticRelations || state.diplomaticRelations.length === 0) {
          state.diplomaticRelations = createInitialRelations();
        }
        updateRelations(state.diplomaticRelations, state.policies, state.simulation);

        // Apply trade effects
        const tradeEffects = applyTradeEffects(state.diplomaticRelations);
        for (const [key, val] of Object.entries(tradeEffects)) {
          (state.simulation as unknown as Record<string, number>)[key] =
            ((state.simulation as unknown as Record<string, number>)[key] ?? 0) + (val as number);
        }

        // Roll for diplomatic incident
        if (!state.activeDiplomaticIncident) {
          const incident = rollForDiplomaticIncident(state.diplomaticRelations);
          if (incident) {
            state.activeDiplomaticIncident = incident;
            const nation = state.diplomaticRelations.find(r => r.nationId === incident.nationId);
            addNewsItem(state, `🌐 ${incident.title}: ${incident.description}`, 'event');
            addLogEntry(state, `🌐 Diplomatic incident: ${incident.title}`, 'event');
          }
        }

        // War threat warnings
        for (const rel of state.diplomaticRelations) {
          if (rel.warThreat) {
            addNewsItem(state, `⚠️ WAR THREAT: Relations with ${rel.nationId} critically low!`, 'event');
          }
        }
      }

      // === VICTORY CONDITION TRACKING ===
      if (!state.victoryTrackers) state.victoryTrackers = {};
      for (const player of state.players) {
        if (!state.victoryTrackers[player.id]) {
          state.victoryTrackers[player.id] = createVictoryTracker();
        }
      }
      updateVictoryTrackers(state);

      // Check for alternative victory (if not default electoral)
      const victoryType = state.gameSettings?.victoryCondition ?? 'electoral';
      if (victoryType !== 'electoral') {
        const { winner: altWinner, condition: altCond } = checkVictory(state, victoryType);
        if (altWinner && altCond) {
          addNewsItem(state, `🏆 ${altCond.icon} ${state.players.find(p => p.id === altWinner)?.party.partyName} achieves ${altCond.name}!`, 'election');
          addLogEntry(state, `🏆 VICTORY: ${altCond.name} achieved!`, 'election');
          state.phase = 'game_over';
          return;
        }
      }

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
      state.voteShares = computeVoteShares(state.voterSatisfaction, state.voterCynicism);

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
        state.campaignActedThisTurn = {};
      } else {
        state.phase = 'events';
      }
    }
    return;
  }

  if (state.phase === 'election') {
    // Check electoral victory (default: 3 elections)
    const victoryMode = state.gameSettings?.victoryCondition ?? 'electoral';
    const electoralLimit = victoryMode === 'electoral' ? 3 : 5; // More elections if alternative victory
    if (state.electionHistory.length >= electoralLimit) {
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

  // After ruling phase: go to bill_voting if there are drafting bills, else skip to resolution
  if (state.phase === 'ruling') {
    if (state.activeBills.some(b => b.status === 'drafting')) {
      state.phase = 'bill_voting';
    } else {
      state.phase = 'resolution';
    }
    return;
  }

  if (currentIndex >= 0 && currentIndex < phaseOrder.length - 1) {
    state.phase = phaseOrder[currentIndex + 1];
  }
}

// D4: Check if ministers resign over policy changes
export function checkMinisterResignations(state: GameState): void {
  if (!state.cabinet) return;
  const { ministers, availablePool } = state.cabinet;

  // Map ministry to relevant policy domains
  const MINISTRY_POLICY_MAP: Record<string, string[]> = {
    health: ['healthcare', 'drug_policy'],
    education: ['education', 'tech_research'],
    finance: ['income_tax', 'corporate_tax', 'govt_spending', 'trade_openness'],
    defense: ['military', 'border_security', 'intelligence'],
    interior: ['police', 'immigration', 'civil_rights'],
    environment: ['env_regulations', 'renewables', 'carbon_tax'],
    justice: ['civil_rights', 'press_freedom', 'drug_policy', 'gun_control'],
    foreign: ['foreign_aid', 'trade_openness', 'immigration'],
  };

  for (const [ministryId, polId] of Object.entries(ministers)) {
    if (!polId) continue;
    const politician = availablePool.find(p => p.id === polId);
    if (!politician) continue;

    const relevantPolicies = MINISTRY_POLICY_MAP[ministryId] ?? [];
    let ideologicalConflict = 0;

    for (const policyId of relevantPolicies) {
      const policyVal = state.policies[policyId] ?? 50;
      // Check if policy value clashes with politician's ideology
      // Economic policies: high value = left-wing (more spending/tax), low = right-wing
      const isEconPolicy = ['income_tax', 'corporate_tax', 'govt_spending', 'minimum_wage', 'trade_openness'].includes(policyId);
      const isSocialPolicy = ['civil_rights', 'press_freedom', 'immigration', 'drug_policy'].includes(policyId);

      if (isEconPolicy) {
        // High policy value vs low economicLean = conflict (left policy, right politician)
        const diff = Math.abs(policyVal - politician.economicLean);
        ideologicalConflict += diff * 0.3;
      }
      if (isSocialPolicy) {
        const diff = Math.abs(policyVal - politician.socialLean);
        ideologicalConflict += diff * 0.3;
      }
    }

    // High conflict + low loyalty = resignation risk
    if (ideologicalConflict > 25) {
      // Reduce loyalty
      politician.loyalty = Math.max(0, politician.loyalty - Math.floor(ideologicalConflict / 15));

      if (politician.loyalty < 3) {
        // Minister resigns!
        ministers[ministryId as keyof typeof ministers] = null;
        const policyName = relevantPolicies[0] ? (POLICY_MAP.get(relevantPolicies[0])?.name ?? ministryId) : ministryId;
        addNewsItem(state, `🚪 ${politician.name} resigns as Minister of ${ministryId} over ${policyName} policy!`, 'cabinet');
        addLogEntry(state, `Minister ${politician.name} resigns from ${ministryId}!`, 'cabinet');
        modifyRulingApproval(state, -3);
      }
    }
  }
}

// Helper: get average cabinet competence
function getAverageCabinetCompetence(state: GameState): number {
  if (!state.cabinet) return 5;
  let total = 0;
  let count = 0;
  for (const polId of Object.values(state.cabinet.ministers)) {
    if (polId) {
      const pol = state.cabinet.availablePool.find(p => p.id === polId);
      if (pol) { total += pol.competence; count++; }
    }
  }
  return count > 0 ? total / count : 5;
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
