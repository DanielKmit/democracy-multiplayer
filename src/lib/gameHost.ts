'use client';

import {
  GameState,
  PolicyChange,
  OppositionAction,
  Player,
  PartyConfig,
  MinistryId,
  Bill,
  ManifestoOption,
  PARTY_COLORS,
} from './engine/types';
import {
  makeAIDecision,
  AIPersonality,
  AIIdeology,
  AI_PARTY_PRESETS,
} from './engine/ai';
import {
  createInitialGameState,
  computeSimulation,
  computeVoterSatisfaction,
  computeApprovalRating,
  computeAllVoterSatisfaction,
  computeAllApprovalRatings,
  computeVoteShares,
  computePoliticalCapital,
  computeRegionalSatisfaction,
  applyPolicyChanges,
  applyOppositionActions,
  advancePhase,
  addLogEntry,
  addNewsItem,
  runElection,
  tickActiveEffects,
  proposeBotBills,
  recalculateAfterPolicyChange,
} from './engine/simulation';
import { spinScandal } from './engine/scandals';
import { updateReputation, getReputationEffects } from './engine/reputation';
import { updateSupermajorityTracker, checkVictory } from './engine/victoryConditions';
import { POLICY_MAP } from './engine/policies';
import { VOTER_GROUPS } from './engine/voters';
import { rollForEvent, resetEventCounter } from './engine/events';
import { calculateBudget } from './engine/budget';
import { createInitialParliament, allocateSeats, voteBill } from './engine/parliament';
import { checkAssassination, updateExtremism } from './engine/extremism';
import { rollForDilemma, getDilemmaById, resetDilemmaTracker } from './engine/dilemmas';
import { getSituationById } from './engine/situations';
import { getEffectiveCompetence } from './engine/politicians';
import { getBillTemplate, BILL_LIBRARY } from './engine/billLibrary';
import { sendMessage, isConnected } from './peer';

let gameState: GameState | null = null;
let onStateChange: ((state: GameState) => void) | null = null;

const STORAGE_KEY = 'democracy_game_state';

function persistState() {
  if (typeof window === 'undefined') return;
  if (gameState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch {
      // Storage full or unavailable — ignore
    }
  }
}

export function loadPersistedState(): GameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GameState;
  } catch {
    // Corrupted data — ignore
  }
  return null;
}

export function clearPersistedState() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function restoreGame(savedState: GameState): GameState {
  gameState = savedState;

  // Ensure phaseReady exists (backward compat with old saves)
  if (!gameState.phaseReady) gameState.phaseReady = {};
  if (gameState.liveVote && !gameState.liveVote.playerVotes) gameState.liveVote.playerVotes = {};

  // Phase recovery: if stuck in party_creation but both players have parties, advance
  if (gameState.phase === 'party_creation' && gameState.players.length >= 2) {
    const allReady = gameState.players.every(
      p => p.party.partyName !== 'Default Party' && p.party.partyName !== 'Opposition'
    );
    if (allReady) {
      gameState.parliament = createInitialParliament(gameState.players, gameState.botParties);
      gameState.regionalSatisfaction = computeRegionalSatisfaction(
        gameState.policies, gameState.voterSatisfaction, gameState.players
      );
      gameState.turnsUntilElection = 5;
      gameState.isPreElection = true;
      gameState.phase = 'campaigning';
      for (const p of gameState.players) {
        p.role = 'opposition';
        p.politicalCapital = Math.max(p.politicalCapital, 5);
      }
      addLogEntry(gameState, '📢 Campaign season begins! (recovered from stuck state)', 'info');
    }
  }

  broadcastState();
  return gameState;
}

/**
 * Apply cabinet minister specialty bonuses to simulation.
 * Ministers with matching specialty + high competence boost their domain.
 * Low-loyalty ministers (<3) provide penalties instead.
 */
function applyCabinetBonuses(state: GameState) {
  const { ministers, availablePool } = state.cabinet;
  if (!ministers || !availablePool) return;

  // Map ministry → simulation variable(s) affected
  const MINISTRY_SIM_MAP: Record<string, { vars: Array<{ key: keyof typeof state.simulation; weight: number }>; }> = {
    finance:     { vars: [{ key: 'gdpGrowth', weight: 0.10 }] },
    interior:    { vars: [{ key: 'crime', weight: -0.15 }] },
    defense:     { vars: [{ key: 'nationalSecurity', weight: 0.10 }] },
    health:      { vars: [{ key: 'healthIndex', weight: 0.10 }] },
    education:   { vars: [{ key: 'educationIndex', weight: 0.10 }] },
    foreign:     { vars: [{ key: 'nationalSecurity', weight: 0.05 }] },
    environment: { vars: [{ key: 'pollution', weight: -0.10 }] },
    justice:     { vars: [{ key: 'freedomIndex', weight: 0.08 }, { key: 'corruption', weight: -0.08 }] },
  };

  for (const [ministryId, politicianId] of Object.entries(ministers)) {
    if (!politicianId) continue;
    const politician = availablePool.find(p => p.id === politicianId);
    if (!politician) continue;

    const mapping = MINISTRY_SIM_MAP[ministryId];
    if (!mapping) continue;

    const effComp = getEffectiveCompetence(politician, ministryId as import('./engine/types').MinistryId);
    // Bonus scales with competence: comp 5 = neutral, comp 10 = full bonus
    // Low loyalty (<3) inverts the bonus (penalty)
    const loyaltyMultiplier = politician.loyalty < 3 ? -0.5 : (politician.loyalty >= 7 ? 1.2 : 1.0);
    const compFactor = (effComp - 5) / 5; // -1 to +1 range

    for (const v of mapping.vars) {
      const bonus = v.weight * compFactor * loyaltyMultiplier * 100;
      (state.simulation as unknown as Record<string, number>)[v.key] += bonus;
    }
  }

  // Intelligence minister bonus: affects threat detection
  const intelMinId = ministers.defense;
  if (intelMinId) {
    const intelMin = availablePool.find(p => p.id === intelMinId);
    if (intelMin && intelMin.specialty === 'defense') {
      // High-competence defense minister reduces extremism threat slightly
      const compBonus = (getEffectiveCompetence(intelMin, 'defense') - 5) * 0.5;
      state.extremism.far_left = Math.max(0, state.extremism.far_left - compBonus);
      state.extremism.far_right = Math.max(0, state.extremism.far_right - compBonus);
      state.extremism.religious = Math.max(0, state.extremism.religious - compBonus);
      state.extremism.eco = Math.max(0, state.extremism.eco - compBonus);
    }
  }
}

function recalculate(state: GameState) {
  state.simulation = computeSimulation(state.policies, state.activeEffects);

  // Apply cabinet minister bonuses to simulation
  applyCabinetBonuses(state);

  // Skip budget recalculation during campaign phase — no government is spending money yet
  if (!state.campaignPhase && !state.isPreElection) {
    state.budget = calculateBudget(state.policies, state.simulation, state.budget.debtTotal ?? 200);
  }

  // Apply situation effects to simulation
  for (const activeSit of state.activeSituations) {
    const sitDef = getSituationById(activeSit.id);
    if (sitDef) {
      for (const [key, val] of Object.entries(sitDef.effects)) {
        const k = key as keyof typeof state.simulation;
        if (state.simulation[k] !== undefined) {
          (state.simulation as unknown as Record<string, number>)[k] += val * 0.5;
        }
      }
    }
  }

  // Per-party voter satisfaction
  if (state.players.length >= 1) {
    state.voterSatisfaction = computeAllVoterSatisfaction(
      state.players,
      state.policies,
      state.simulation,
      state.activeEffects,
      state.ngoAlliances ?? [],
      state.botParties,
      state.campaignBonuses,
      state.perception,
    );

    // Per-party approval ratings
    state.approvalRating = computeAllApprovalRatings(state.voterSatisfaction, state.activeEffects);

    // Apply event approval impact to ruling party only (one-time, not stacking)
    const ruling = state.players.find(p => p.role === 'ruling');
    if (ruling) {
      if (!state.appliedEvents) state.appliedEvents = [];
      for (const effect of state.activeEffects) {
        if (effect.type === 'event' && effect.data.approvalImpact && !state.appliedEvents.includes(effect.id)) {
          state.approvalRating[ruling.id] = Math.max(0, Math.min(100,
            (state.approvalRating[ruling.id] ?? 50) + (effect.data.approvalImpact as number)
          ));
          state.appliedEvents.push(effect.id);
        }
      }
      state.rulingApproval = state.approvalRating[ruling.id] ?? 50;
    }

    // === D4: VOTER MEMORY / HONEYMOON EFFECT ===
    // New ruling party gets a honeymoon boost that decays over time
    if (ruling && state.voterMemory) {
      const prevApproval = state.voterMemory[ruling.id] ?? 50;
      const turnsSinceElection = state.turn % 8; // turns since last election
      if (turnsSinceElection <= 2 && prevApproval < 45) {
        // Honeymoon: new government gets benefit of the doubt (+5 to +10 approval)
        const honeymoonBonus = Math.max(0, (45 - prevApproval) * 0.3) * Math.max(0, 1 - turnsSinceElection * 0.3);
        state.approvalRating[ruling.id] = Math.min(100, (state.approvalRating[ruling.id] ?? 50) + honeymoonBonus);
      }
    }

    // === D4: FLIP-FLOP PENALTY ===
    // Parties that rapidly change policies lose credibility
    if (ruling && state.flipFlopPenalty) {
      const penalty = state.flipFlopPenalty[ruling.id] ?? 0;
      if (penalty > 0) {
        // Reduce approval by flip-flop penalty (max -15)
        const effectivePenalty = Math.min(15, penalty * 0.5);
        state.approvalRating[ruling.id] = Math.max(0, (state.approvalRating[ruling.id] ?? 50) - effectivePenalty);
        state.rulingApproval = state.approvalRating[ruling.id] ?? 50;
      }
    }

    // === D4: POLICY STABILITY BONUS ===
    // Stable policies (unchanged for 4+ turns) give a small approval boost
    if (ruling && state.policyStability) {
      let stableCount = 0;
      for (const turns of Object.values(state.policyStability)) {
        if ((turns as number) >= 4) stableCount++;
      }
      // Each stable policy gives +0.15 approval (up to +4.5 for all 30 stable)
      if (stableCount > 10) {
        const stabilityBonus = Math.min(5, (stableCount - 10) * 0.25);
        state.approvalRating[ruling.id] = Math.min(100, (state.approvalRating[ruling.id] ?? 50) + stabilityBonus);
        state.rulingApproval = state.approvalRating[ruling.id] ?? 50;
      }
    }

    // === D4: TERM FATIGUE ===
    // Voters get tired of the same party in power — creates natural alternation
    if (ruling && state.consecutiveRulingPartyElections >= 2) {
      const terms = state.consecutiveRulingPartyElections;
      const fatiguePenalty = terms >= 3 ? 6 : 3;
      state.approvalRating[ruling.id] = Math.max(0, (state.approvalRating[ruling.id] ?? 50) - fatiguePenalty);
      state.rulingApproval = state.approvalRating[ruling.id] ?? 50;
    }

    // === D4: CRISIS PC BONUS (Rally around the flag) ===
    if (ruling && state.activeSituations.length > 0) {
      const criticalSituations = state.activeSituations.filter(s => {
        const def = getSituationById(s.id);
        return def && def.severity === 'critical';
      });
      // Grant +1 PC for each new critical situation (first turn only)
      for (const sit of criticalSituations) {
        if (sit.turnsActive === 0) {
          ruling.politicalCapital += 1;
          addLogEntry(state, `⚡ Crisis leadership: +1 PC from responding to ${getSituationById(sit.id)?.name ?? sit.id}`, 'info');
        }
      }
    }

    // === D4: REPUTATION SYSTEM — Update and apply effects ===
    if (state.reputation) {
      for (const player of state.players) {
        // Count active scandals targeting this player
        const playerScandals = (state.activeScandals ?? []).filter(s => s.targetPlayerId === player.id).length;
        // Check if any promise was broken/kept this turn
        const brokenThisTurn = (state.pledges ?? []).some(
          p => p.playerId === player.id && p.status === 'broken'
            && (state.policyChangeHistory?.[p.policyId]?.includes(state.turn) ?? false)
        );
        const keptThisTurn = (state.pledges ?? []).some(
          p => p.playerId === player.id && p.status === 'kept'
        );
        // Average cabinet competence
        let avgComp = 5;
        if (state.cabinet?.ministers && state.cabinet?.availablePool) {
          let total = 0; let count = 0;
          for (const polId of Object.values(state.cabinet.ministers)) {
            if (polId) {
              const pol = state.cabinet.availablePool.find(pp => pp.id === polId);
              if (pol) { total += pol.competence; count++; }
            }
          }
          if (count > 0) avgComp = total / count;
        }

        updateReputation(state.reputation, player.id, {
          activeScandals: playerScandals,
          brokenPromiseThisTurn: brokenThisTurn,
          keptPromiseThisTurn: keptThisTurn,
          approval: state.approvalRating[player.id] ?? 50,
          cabinetCompetence: avgComp,
          isRuling: player.role === 'ruling',
        });

        // Apply reputation effects to approval
        const repScore = state.reputation.scores[player.id] ?? 60;
        const effects = getReputationEffects(repScore);
        state.approvalRating[player.id] = Math.max(0, Math.min(100,
          (state.approvalRating[player.id] ?? 50) + effects.approvalModifier
        ));
      }
      if (ruling) {
        state.rulingApproval = state.approvalRating[ruling.id] ?? 50;
      }
    }

    // Regional satisfaction using per-party voter sat
    if (state.players.length >= 2) {
      state.regionalSatisfaction = computeRegionalSatisfaction(
        state.policies, state.voterSatisfaction, state.players
      );
    }
  }

  // Compute vote shares (adds up to 100% across all parties)
  if (state.voterSatisfaction && Object.keys(state.voterSatisfaction).length > 0) {
    state.voteShares = computeVoteShares(state.voterSatisfaction, state.voterCynicism);
  }

  if (state.budget.debtToGdp > 200) {
    addLogEntry(state, '⚠️ ECONOMIC CRISIS: Debt exceeds 200% GDP!', 'event');
  } else if (state.budget.creditDowngrade) {
    addLogEntry(state, '⚠️ Credit downgrade: Debt exceeds 150% GDP', 'event');
  }
}

function broadcastState() {
  if (!gameState) return;
  persistState();
  // Force-send to bypass debounce — every action-triggered broadcast must reach the client
  sendMessage({ type: 'state', state: gameState }, true);
  if (onStateChange) onStateChange({ ...gameState });
  // Schedule AI turn after state broadcast (async to avoid recursion)
  if (gameState.isAIGame) {
    setTimeout(() => checkAITurn(), 100);
  }
}

export function setOnStateChange(handler: (state: GameState) => void) {
  onStateChange = handler;
}

const DEFAULT_PARTY: PartyConfig = {
  partyName: 'Default Party',
  partyColor: 'blue',
  leaderName: 'Leader',
  economicAxis: 50,
  socialAxis: 50,
  logo: 'star',
  manifesto: ['Job creation', 'Education reform', 'Green energy'],
};

// ---- AI Game Support ----

let aiPersonality: AIPersonality | null = null;
let aiTurnTimer: ReturnType<typeof setTimeout> | null = null;

function getAIPersonality(): AIPersonality {
  if (!aiPersonality && gameState) {
    const ideology = (gameState.aiIdeology ?? 'center') as AIIdeology;
    aiPersonality = {
      ideology,
      aggressiveness: 0.5,
      adaptiveness: 0.7,
    };
  }
  return aiPersonality ?? { ideology: 'center', aggressiveness: 0.5, adaptiveness: 0.7 };
}

/**
 * Initialize a game against AI. Creates both players, auto-generates AI party,
 * skips lobby, and starts immediately.
 */
export function initAIGame(
  roomCode: string,
  hostPlayerName: string,
  hostPartyConfig: PartyConfig,
  aiIdeology: AIIdeology,
): GameState {
  gameState = createInitialGameState(roomCode);
  gameState.isAIGame = true;
  gameState.aiIdeology = aiIdeology;

  // Create human player
  const humanPlayer: Player = {
    id: 'host',
    name: hostPlayerName,
    role: 'ruling', // Will be set properly after party creation
    politicalCapital: 5,
    termsWon: 0,
    party: hostPartyConfig,
  };
  gameState.players.push(humanPlayer);

  // Create AI player
  const preset = AI_PARTY_PRESETS[aiIdeology];
  const aiPartyConfig: PartyConfig = {
    partyName: preset.partyName,
    partyColor: preset.color,
    leaderName: preset.leaderName,
    economicAxis: aiIdeology === 'left' ? 25 : aiIdeology === 'right' ? 75 : 50,
    socialAxis: aiIdeology === 'left' ? 75 : aiIdeology === 'right' ? 35 : 55,
    logo: preset.logo,
    manifesto: preset.manifesto as unknown as [ManifestoOption, ManifestoOption, ManifestoOption],
  };

  const aiPlayer: Player = {
    id: 'ai',
    name: preset.leaderName,
    role: 'opposition',
    politicalCapital: 5,
    termsWon: 0,
    party: aiPartyConfig,
  };
  gameState.players.push(aiPlayer);
  gameState.aiPlayerId = 'ai';

  aiPersonality = {
    ideology: aiIdeology,
    aggressiveness: 0.5,
    adaptiveness: 0.7,
  };

  addLogEntry(gameState, `${humanPlayer.name} created the game`, 'info');
  addLogEntry(gameState, `🤖 ${preset.partyName} (${preset.leaderName}) joins as AI opponent`, 'info');
  addNewsItem(gameState, `${preset.partyName} enters Novarian politics under ${preset.leaderName}`, 'general');

  // Initialize parliament (both parties ready)
  gameState.parliament = createInitialParliament(gameState.players, gameState.botParties);
  gameState.regionalSatisfaction = computeRegionalSatisfaction(
    gameState.policies, gameState.voterSatisfaction, gameState.players
  );

  // Pre-election campaign
  gameState.turnsUntilElection = 5;
  gameState.isPreElection = true;
  gameState.phase = 'campaigning';

  for (const p of gameState.players) {
    p.role = 'opposition'; // Neither rules yet
    p.politicalCapital = 5;
  }

  addLogEntry(gameState, '📢 Campaign season begins! Win voters to form the first government.', 'info');
  addNewsItem(gameState, 'Election campaign begins in Novaria — all parties vie for voter support', 'election');

  broadcastState();

  // Trigger AI turn if needed
  scheduleAITurn();

  return gameState;
}

let aiScheduled = false;

/**
 * Schedule AI turn with a realistic delay (1.5-2.5s).
 */
function scheduleAITurn() {
  if (!gameState || !gameState.isAIGame || !gameState.aiPlayerId) return;
  if (aiScheduled) return; // Prevent re-entry

  const aiPlayer = gameState.players.find(p => p.id === gameState!.aiPlayerId);
  if (!aiPlayer) return;

  // Check if it's AI's turn to act
  if (!isAITurn(gameState, aiPlayer)) return;

  aiScheduled = true;

  // Set thinking state and broadcast without triggering another AI check
  gameState.aiThinking = true;
  persistState();
  sendMessage({ type: 'state', state: gameState });
  if (onStateChange) onStateChange({ ...gameState });

  const delay = 2500 + Math.random() * 1500; // 2.5-4s — long enough for human to see opposition phase

  if (aiTurnTimer) clearTimeout(aiTurnTimer);
  aiTurnTimer = setTimeout(() => {
    aiScheduled = false;
    executeAITurn();
  }, delay);
}

/**
 * Check if the current phase requires AI action.
 */
function isAITurn(state: GameState, aiPlayer: Player): boolean {
  const phase = state.phase;

  // Campaign phase: AI acts when it hasn't yet this turn
  if (phase === 'campaigning') {
    return !state.campaignActedThisTurn[aiPlayer.id];
  }

  // Ruling phase: AI acts if it's the ruling party
  if (phase === 'ruling' && aiPlayer.role === 'ruling') return true;

  // Opposition phase: AI acts if it's the opposition
  if (phase === 'opposition' && aiPlayer.role === 'opposition') return true;

  // Events: AI acknowledges
  if (phase === 'events' && state.currentEvent && aiPlayer.role === 'ruling') return true;

  // Dilemma: AI decides if ruling
  if (phase === 'dilemma' && aiPlayer.role === 'ruling') return true;

  // Coalition: AI negotiates
  if (phase === 'coalition_negotiation') return true;

  // Government formation: AI appoints ministers if ruling
  if (phase === 'government_formation' && aiPlayer.role === 'ruling') return true;

  // Polling/election/etc: AI advances
  if (['polling', 'election', 'bill_voting', 'resolution'].includes(phase)) return true;

  return false;
}

/**
 * Execute the AI's turn.
 */
function executeAITurn() {
  if (!gameState || !gameState.isAIGame || !gameState.aiPlayerId) return;

  const aiPlayer = gameState.players.find(p => p.id === gameState!.aiPlayerId);
  if (!aiPlayer) return;

  gameState.aiThinking = false;

  const decision = makeAIDecision(gameState, aiPlayer, getAIPersonality());

  if (decision) {
    addLogEntry(gameState, `🤖 ${decision.description}`, 'info');
    // handleAction will broadcastState which triggers checkAITurn for next phases
    handleAction(aiPlayer.id, decision.action, decision.payload);
  } else {
    // No decision but state changed — broadcast
    broadcastState();
  }
}

/**
 * Call this after any state change to check if AI should act next.
 */
function checkAITurn() {
  if (!gameState || !gameState.isAIGame) return;
  // Don't check if AI is already scheduled/thinking
  if (aiScheduled || gameState.aiThinking) return;
  scheduleAITurn();
}

export function initGame(roomCode: string, hostPlayerName: string): GameState {
  gameState = createInitialGameState(roomCode);
  const player: Player = {
    id: 'host',
    name: hostPlayerName,
    role: 'ruling',
    politicalCapital: 6,
    termsWon: 0,
    party: { ...DEFAULT_PARTY, leaderName: hostPlayerName },
  };
  gameState.players.push(player);
  addLogEntry(gameState, `${player.name} created the game`, 'info');
  broadcastState();
  return gameState;
}

export function handleClientJoin(clientName: string) {
  if (!gameState) return;
  if (gameState.players.length >= 2) return;

  const player: Player = {
    id: 'client',
    name: clientName,
    role: 'opposition',
    politicalCapital: 4,
    termsWon: 0,
    party: { ...DEFAULT_PARTY, partyColor: 'red', leaderName: clientName, partyName: 'Opposition' },
  };
  gameState.players.push(player);
  addLogEntry(gameState, `${player.name} joined the game`, 'info');
  addNewsItem(gameState, `${player.name} has entered Novarian politics`, 'general');

  // Move to party creation phase
  gameState.phase = 'party_creation';
  broadcastState();
}

export function handleAction(playerId: string, action: string, payload?: unknown) {
  if (!gameState) return;

  switch (action) {
    case 'submitPartyConfig': {
      const config = payload as PartyConfig;
      const player = gameState.players.find(p => p.id === playerId);
      if (player) {
        // Skip duplicate submissions (idempotent — avoids duplicate log entries on recovery)
        const alreadySubmitted = player.party.partyName === config.partyName
          && player.party.partyName !== 'Default Party'
          && player.party.partyName !== 'Opposition';

        player.party = config;
        player.name = config.leaderName;

        if (!alreadySubmitted) {
          addLogEntry(gameState, `${config.partyName} (${config.leaderName}) ready`, 'info');
          addNewsItem(gameState, `${config.partyName} launches with manifesto: ${config.manifesto.join(', ')}`, 'general');
        }

        // Check if both players have submitted — only advance if still in party_creation
        const allReady = gameState.players.every(p => p.party.partyName !== 'Default Party' && p.party.partyName !== 'Opposition');
        if (allReady && gameState.phase === 'party_creation') {
          // Initialize parliament with caretaker distribution (includes bot parties)
          gameState.parliament = createInitialParliament(gameState.players, gameState.botParties);
          gameState.regionalSatisfaction = computeRegionalSatisfaction(
            gameState.policies, gameState.voterSatisfaction, gameState.players
          );

          // Pre-election campaign: 5 turns of campaigning, then first election
          gameState.turnsUntilElection = 5;
          gameState.isPreElection = true;
          gameState.phase = 'campaigning';

          // Both players are equal candidates — no ruling/opposition yet
          for (const p of gameState.players) {
            p.role = 'opposition'; // Neither rules yet — caretaker government
            p.politicalCapital = 5;
          }

          // Initialize new feature systems
          const allPartyIds = gameState.players.map(p => p.id);
          gameState.reputation = {
            scores: Object.fromEntries(allPartyIds.map(id => [id, 60])),
            promisesKept: Object.fromEntries(allPartyIds.map(id => [id, 0])),
            promisesBroken: Object.fromEntries(allPartyIds.map(id => [id, 0])),
            scandalCount: Object.fromEntries(allPartyIds.map(id => [id, 0])),
          };
          gameState.victoryTrackers = Object.fromEntries(
            allPartyIds.map(id => [id, { consecutiveHighGDP: 0, consecutiveHighApproval: 0, consecutiveSupermajority: 0 }])
          );
          gameState.activeScandals = [];
          gameState.activeSynergies = [];

          addLogEntry(gameState, '📢 Campaign season begins! Win voters to form the first government.', 'info');
          addNewsItem(gameState, 'Election campaign begins in Novaria — all parties vie for voter support', 'election');
        }
      }
      broadcastState();
      break;
    }

    case 'acknowledgeEvent': {
      if (gameState.phase !== 'events') return;
      gameState.currentEvent = null;

      // Check for dilemma
      const dilemma = rollForDilemma(gameState.turn);
      if (dilemma) {
        gameState.activeDilemma = {
          dilemmaId: dilemma.id,
          startedAt: Date.now(),
          resolved: false,
          chosenOption: null,
        };
        gameState.phase = 'dilemma';
        addLogEntry(gameState, `⚖️ Dilemma: ${dilemma.title}`, 'dilemma');
        addNewsItem(gameState, `Dilemma facing the government: ${dilemma.title}`, 'dilemma');
      } else {
        advancePhase(gameState);
        addLogEntry(gameState, `Turn ${gameState.turn}: Ruling Party phase`, 'info');
      }
      broadcastState();
      break;
    }

    case 'resolveDilemma': {
      if (gameState.phase !== 'dilemma' || !gameState.activeDilemma) return;
      let ruling = gameState.players.find(p => p.role === 'ruling');
      // During campaign phase, no one is ruling — allow host or first player to decide
      if (!ruling) {
        ruling = gameState.players.find(p => p.id === playerId);
      }
      if (!ruling || ruling.id !== playerId) return;

      const option = payload as 'a' | 'b';
      const dilemma = getDilemmaById(gameState.activeDilemma.dilemmaId);
      if (!dilemma) return;

      gameState.activeDilemma.resolved = true;
      gameState.activeDilemma.chosenOption = option;

      const chosen = option === 'a' ? dilemma.optionA : dilemma.optionB;

      // Apply simulation effects
      if (chosen.effects) {
        gameState.activeEffects.push({
          type: 'dilemma',
          id: `dilemma_${dilemma.id}`,
          turnsRemaining: 3,
          data: { effects: chosen.effects },
        });
      }

      // Apply policy effects
      if (chosen.policyEffects) {
        for (const [policyId, change] of Object.entries(chosen.policyEffects)) {
          const current = gameState.policies[policyId] ?? 50;
          gameState.policies[policyId] = Math.max(0, Math.min(100, current + change));
        }
      }

      // Apply voter satisfaction effects (direct per-group modifiers)
      if (chosen.voterEffects) {
        for (const [groupId, delta] of Object.entries(chosen.voterEffects)) {
          // Apply to ruling party's voter satisfaction
          if (ruling && gameState.voterSatisfaction[ruling.id]) {
            const current = gameState.voterSatisfaction[ruling.id][groupId] ?? 50;
            gameState.voterSatisfaction[ruling.id][groupId] = Math.max(0, Math.min(100, current + (delta as number)));
          }
        }
      }

      // Apply region effects (direct regional satisfaction modifiers)
      if (chosen.regionEffects) {
        for (const [regionId, delta] of Object.entries(chosen.regionEffects)) {
          if (ruling && gameState.regionalSatisfaction[regionId]) {
            const current = gameState.regionalSatisfaction[regionId][ruling.id] ?? 50;
            gameState.regionalSatisfaction[regionId][ruling.id] = Math.max(0, Math.min(100, current + (delta as number)));
          }
        }
      }

      // Build consequences notification
      const consequenceParts: string[] = [];
      if (chosen.effects) {
        for (const [k, v] of Object.entries(chosen.effects)) {
          if (v !== 0) consequenceParts.push(`${k}: ${(v as number) > 0 ? '+' : ''}${v}`);
        }
      }
      if (chosen.policyEffects) {
        for (const [k, v] of Object.entries(chosen.policyEffects)) {
          const pName = POLICY_MAP.get(k)?.name ?? k;
          consequenceParts.push(`${pName}: ${v > 0 ? '+' : ''}${v}`);
        }
      }

      addLogEntry(gameState, `Dilemma resolved: "${chosen.label}"`, 'dilemma');
      addNewsItem(gameState, `Government decides: ${chosen.label} on "${dilemma.title}"`, 'dilemma');
      if (consequenceParts.length > 0) {
        addNewsItem(gameState, `📊 Consequences: ${consequenceParts.join(', ')}`, 'general');
      }

      // Recalculate everything after dilemma consequences
      recalculate(gameState);

      gameState.activeDilemma = null;
      gameState.phase = 'ruling';
      addLogEntry(gameState, `Turn ${gameState.turn}: Ruling Party phase`, 'info');
      broadcastState();
      break;
    }

    case 'submitPolicyChanges': {
      if (gameState.phase !== 'ruling') return;
      const player = gameState.players.find(p => p.id === playerId);
      if (!player || player.role !== 'ruling') return;

      const changes = payload as PolicyChange[];
      gameState.pendingPolicyChanges = changes;
      const log = applyPolicyChanges(gameState, changes);
      for (const msg of log) {
        addLogEntry(gameState, msg, 'ruling');
        addNewsItem(gameState, `📋 ${msg}`, 'bill');
      }

      recalculate(gameState);

      // Show impact notification for each change
      for (const change of changes) {
        if (change.newValue !== change.oldValue && !gameState.filibusteredPolicies.includes(change.policyId)) {
          const impactMsg = recalculateAfterPolicyChange(
            gameState, change.policyId, change.oldValue, change.newValue
          );
          addNewsItem(gameState, `📊 Impact: ${impactMsg}`, 'general');
        }
      }
      addLogEntry(gameState, 'Policy effects propagated.', 'info');

      // Mark ruling player as acted
      if (!gameState.turnActedThisTurn) gameState.turnActedThisTurn = {};
      gameState.turnActedThisTurn[playerId] = true;

      // Always advance through bill_voting → resolution → opposition
      // Pending bills stay pending for future voting — never block the turn
      advancePhase(gameState); // -> bill_voting
      advancePhase(gameState); // -> resolution
      advancePhase(gameState); // -> opposition
      addLogEntry(gameState, 'Opposition phase', 'info');
      broadcastState();
      break;
    }

    case 'submitBill': {
      // Either player can submit a bill during ruling or opposition phase
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) return;

      // Ruling player can submit during ruling phase, opposition during opposition phase
      if (gameState.phase === 'ruling' && player.role !== 'ruling') return;
      if (gameState.phase === 'opposition' && player.role !== 'opposition') return;
      if (gameState.phase !== 'ruling' && gameState.phase !== 'opposition') return;

      const billData = payload as { policyId: string; proposedValue: number };
      const policy = POLICY_MAP.get(billData.policyId);
      if (!policy) return;

      const currentValue = gameState.policies[billData.policyId] ?? 50;
      const steps = Math.max(1, Math.round(Math.abs(billData.proposedValue - currentValue) / 25));
      const cost = player.role === 'ruling' ? steps : steps + 1; // Opposition pays +1 PC

      if (cost > player.politicalCapital) {
        addLogEntry(gameState, `Not enough PC to propose bill (need ${cost}, have ${player.politicalCapital})`, 'info');
        broadcastState();
        return;
      }

      player.politicalCapital -= cost;

      const bill: Bill = {
        id: `bill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: `${policy.name} Act`,
        policyId: billData.policyId,
        proposedValue: billData.proposedValue,
        currentValue,
        authorId: player.id,
        status: 'pending',
        votesFor: 0,
        votesAgainst: 0,
        isEmergency: false,
        lobbyInfluence: {},
        whipBonus: 0,
        publicPressure: 0,
        constitutionalScore: 70,
        turnProposed: gameState.turn,
      };

      gameState.activeBills.push(bill);

      const isOppositionBill = player.role === 'opposition';
      const billBadge = isOppositionBill ? '[Opposition Bill] ' : '';

      addLogEntry(gameState, `📋 ${billBadge}${bill.title} proposed (${cost} PC) — call a vote to decide!`, 'ruling');
      addNewsItem(gameState, `📋 ${billBadge}${bill.title} proposed: ${policy.name} → ${billData.proposedValue}`, 'bill');

      // Auto-start live vote so the modal opens for player interaction
      handleAction(playerId, 'startLiveVote', { billId: bill.id });
      return; // startLiveVote handles broadcastState
    }

    case 'submitOppositionActions': {
      if (gameState.phase !== 'opposition') return;
      const player = gameState.players.find(p => p.id === playerId);
      if (!player || player.role !== 'opposition') return;

      const actions = payload as OppositionAction[];
      gameState.pendingOppositionActions = actions;
      const log = applyOppositionActions(gameState, actions);
      for (const msg of log) {
        addLogEntry(gameState, msg, 'opposition');
        addNewsItem(gameState, `📰 ${msg}`, 'general');
      }

      recalculate(gameState);

      // Check assassination
      const assassinResult = checkAssassination(gameState.extremism, gameState.policies.intelligence ?? 30);
      if (assassinResult.attempted) {
        gameState.extremism.assassinationAttempted = true;
        if (assassinResult.succeeded) {
          gameState.extremism.assassinationSucceeded = true;
          addLogEntry(gameState, `💀 ASSASSINATION! ${assassinResult.group} has assassinated the leader!`, 'event');
          addNewsItem(gameState, `BREAKING: Leader assassinated by ${assassinResult.group}!`, 'event');
          gameState.turnsUntilElection = 0; // Snap election
        } else {
          addLogEntry(gameState, `🛡️ Assassination attempt by ${assassinResult.group} FOILED by intelligence services!`, 'event');
          addNewsItem(gameState, `Assassination attempt foiled! ${assassinResult.group} thwarted.`, 'event');
        }
      }

      // Mark opposition player as acted
      if (!gameState.turnActedThisTurn) gameState.turnActedThisTurn = {};
      gameState.turnActedThisTurn[playerId] = true;

      // In AI games, pause before advancing so the human ruling player can see what the AI did
      if (gameState.isAIGame && playerId === gameState.aiPlayerId) {
        gameState.aiThinking = false;
        broadcastState(); // Show the actions taken (log entries, news) before advancing
        setTimeout(() => {
          if (!gameState) return;
          advancePhase(gameState); // -> polling
          addLogEntry(gameState, `📊 Ruling Approval: ${gameState.rulingApproval}%`, 'info');
          broadcastState();
        }, 2000); // 2s pause so human can see AI opposition actions
      } else {
        advancePhase(gameState); // -> polling
        addLogEntry(gameState, `📊 Ruling Approval: ${gameState.rulingApproval}%`, 'info');
        broadcastState();
      }
      break;
    }

    case 'appointMinister': {
      const { ministryId, politicianId } = payload as { ministryId: MinistryId; politicianId: string };
      const ruling = gameState.players.find(p => p.role === 'ruling');
      if (!ruling || ruling.id !== playerId) return;

      gameState.cabinet.ministers[ministryId] = politicianId;
      const pol = gameState.cabinet.availablePool.find(p => p.id === politicianId);
      if (pol) {
        addLogEntry(gameState, `${pol.name} appointed as ${ministryId}`, 'cabinet');
        addNewsItem(gameState, `Cabinet: ${pol.name} appointed ${ministryId}`, 'cabinet');
      }
      broadcastState();
      break;
    }

    case 'fireMinister': {
      const { ministryId: fireMinId } = payload as { ministryId: MinistryId };
      const ruling2 = gameState.players.find(p => p.role === 'ruling');
      if (!ruling2 || ruling2.id !== playerId) return;

      const firedId = gameState.cabinet.ministers[fireMinId];
      if (firedId) {
        const pol = gameState.cabinet.availablePool.find(p => p.id === firedId);
        gameState.cabinet.ministers[fireMinId] = null;
        ruling2.politicalCapital = Math.max(0, ruling2.politicalCapital - 2);
        if (pol) {
          addLogEntry(gameState, `${pol.name} fired from ${fireMinId} (-2 PC)`, 'cabinet');
          addNewsItem(gameState, `Cabinet reshuffle: ${pol.name} dismissed from ${fireMinId}`, 'cabinet');
        }
      }
      broadcastState();
      break;
    }

    case 'submitCampaignActions': {
      if (gameState.phase !== 'campaigning') return;
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) return;

      const actions = payload as import('./engine/types').CampaignAction[];
      let totalCost = 0;

      for (const action of actions) {
        if (totalCost + action.cost > player.politicalCapital) continue;
        totalCost += action.cost;

        switch (action.type) {
          case 'campaign_rally': {
            if (action.targetRegionId) {
              const bonuses = gameState.campaignBonuses[player.id] ?? {};
              bonuses[action.targetRegionId] = (bonuses[action.targetRegionId] ?? 0) + 8;
              gameState.campaignBonuses[player.id] = bonuses;
              addLogEntry(gameState, `🎪 ${player.party.partyName} holds rally in ${action.targetRegionId}`, 'info');
              addNewsItem(gameState, `${player.party.partyName} rally draws crowds in ${action.targetRegionId}`, 'election');
            }
            break;
          }
          case 'media_blitz': {
            if (action.targetGroupId) {
              const bonuses = gameState.campaignBonuses[player.id] ?? {};
              bonuses[action.targetGroupId] = (bonuses[action.targetGroupId] ?? 0) + 6;
              gameState.campaignBonuses[player.id] = bonuses;
              addLogEntry(gameState, `📺 ${player.party.partyName} runs media campaign targeting ${action.targetGroupId}`, 'info');
            }
            break;
          }
          case 'voter_promise': {
            if (action.promisePolicyId) {
              // Prevent duplicate promises for the same policy
              if (!gameState.pledges) gameState.pledges = [];
              const existingPledge = gameState.pledges.find(
                p => p.playerId === player.id && p.policyId === action.promisePolicyId
              );
              if (existingPledge) {
                addLogEntry(gameState, `⚠️ ${player.party.partyName} has already promised this policy`, 'info');
                break;
              }
              const bonuses = gameState.campaignBonuses[player.id] ?? {};
              bonuses[`promise_${action.promisePolicyId}`] = (bonuses[`promise_${action.promisePolicyId}`] ?? 0) + 5;
              gameState.campaignBonuses[player.id] = bonuses;
              // D4: Track pledge for broken promise detection
              const direction = (action.promiseDirection === 'increase' || action.promiseDirection === 'decrease')
                ? action.promiseDirection : 'increase';
              gameState.pledges.push({
                playerId: player.id,
                policyId: action.promisePolicyId,
                direction: direction as 'increase' | 'decrease',
                madeOnTurn: gameState.turn,
                status: 'pending',
              });
              addLogEntry(gameState, `📢 ${player.party.partyName} promises to ${direction} ${action.promisePolicyId}`, 'info');
              addNewsItem(gameState, `📢 Campaign pledge: ${player.party.partyName} promises to ${direction} ${POLICY_MAP.get(action.promisePolicyId)?.name ?? action.promisePolicyId}`, 'election');
            }
            break;
          }
          case 'target_region': {
            if (action.targetRegionId) {
              const bonuses = gameState.campaignBonuses[player.id] ?? {};
              bonuses[action.targetRegionId] = (bonuses[action.targetRegionId] ?? 0) + 5;
              gameState.campaignBonuses[player.id] = bonuses;
            }
            break;
          }
          case 'state_position': {
            // Taking a position gives broad +2 support across all groups
            const bonuses = gameState.campaignBonuses[player.id] ?? {};
            for (const group of VOTER_GROUPS) {
              bonuses[group.id] = (bonuses[group.id] ?? 0) + 2;
            }
            gameState.campaignBonuses[player.id] = bonuses;
            addLogEntry(gameState, `📢 ${player.party.partyName} takes a public stance — +2% across all voter groups`, 'info');
            addNewsItem(gameState, `${player.party.partyName} makes bold policy statement on the campaign trail`, 'election');
            break;
          }
          case 'attack_ad': {
            // Attack the opponent's weakest policy area — reduces their support with a voter group
            const opponentPlayer = gameState.players.find(p => p.id !== player.id);
            if (opponentPlayer && action.targetGroupId) {
              // Reduce opponent's campaign bonus for this group
              const oppBonuses = gameState.campaignBonuses[opponentPlayer.id] ?? {};
              oppBonuses[action.targetGroupId] = Math.max(-10, (oppBonuses[action.targetGroupId] ?? 0) - 4);
              gameState.campaignBonuses[opponentPlayer.id] = oppBonuses;
              // Slight self-penalty (negative campaigning turns some voters off)
              const selfBonuses = gameState.campaignBonuses[player.id] ?? {};
              selfBonuses[action.targetGroupId] = (selfBonuses[action.targetGroupId] ?? 0) - 1;
              gameState.campaignBonuses[player.id] = selfBonuses;
              const groupName = VOTER_GROUPS.find(g => g.id === action.targetGroupId)?.name ?? action.targetGroupId;
              addLogEntry(gameState, `📺 ${player.party.partyName} runs attack ad targeting ${opponentPlayer.party.partyName} among ${groupName}`, 'info');
              addNewsItem(gameState, `Negative campaign: ${player.party.partyName} attacks ${opponentPlayer.party.partyName}'s record with ${groupName}`, 'election');
            }
            break;
          }
          case 'fundraiser': {
            // Host a fundraiser — gain extra PC, limited to once per campaign turn
            const alreadyFundraised = actions.filter(a => a.type === 'fundraiser').length > 1
              || (gameState.campaignBonuses[player.id]?.['_fundraised_this_turn'] ?? 0) > 0;
            if (alreadyFundraised) {
              addLogEntry(gameState, `⚠️ Only one fundraiser per campaign turn!`, 'info');
              break;
            }
            player.politicalCapital += 2; // Net gain of +1 after cost (cost is 1)
            const bonuses = gameState.campaignBonuses[player.id] ?? {};
            bonuses['_fundraised_this_turn'] = 1;
            gameState.campaignBonuses[player.id] = bonuses;
            addLogEntry(gameState, `💰 ${player.party.partyName} hosts a fundraising dinner (+2 PC)`, 'info');
            addNewsItem(gameState, `${player.party.partyName} raises campaign funds at exclusive dinner event`, 'election');
            break;
          }
          case 'endorsement': {
            // Seek endorsement from a prominent figure — broad +3 bonus across all groups
            if (action.targetGroupId) {
              const bonuses = gameState.campaignBonuses[player.id] ?? {};
              bonuses[action.targetGroupId] = (bonuses[action.targetGroupId] ?? 0) + 4;
              // Also small boost to two adjacent groups
              const groupIndex = VOTER_GROUPS.findIndex(g => g.id === action.targetGroupId);
              if (groupIndex >= 0) {
                const prev = VOTER_GROUPS[(groupIndex - 1 + VOTER_GROUPS.length) % VOTER_GROUPS.length];
                const next = VOTER_GROUPS[(groupIndex + 1) % VOTER_GROUPS.length];
                bonuses[prev.id] = (bonuses[prev.id] ?? 0) + 2;
                bonuses[next.id] = (bonuses[next.id] ?? 0) + 2;
              }
              gameState.campaignBonuses[player.id] = bonuses;
              const groupName = VOTER_GROUPS.find(g => g.id === action.targetGroupId)?.name ?? action.targetGroupId;
              addLogEntry(gameState, `🌟 ${player.party.partyName} secures endorsement from ${groupName} leader`, 'info');
              addNewsItem(gameState, `Prominent ${groupName} figure endorses ${player.party.partyName}`, 'election');
            }
            break;
          }
        }
      }

      player.politicalCapital -= totalCost;

      // Track that this player has acted this campaign turn
      if (!gameState.campaignActedThisTurn) gameState.campaignActedThisTurn = {};
      gameState.campaignActedThisTurn[player.id] = true;

      // Check if both players have submitted
      const allActed = gameState.players.every(p => gameState!.campaignActedThisTurn[p.id]);
      if (allActed) {
        // Both players have acted — auto-advance to polling
        gameState.campaignActedThisTurn = {};
        // Reset per-turn fundraiser flags
        for (const p of gameState.players) {
          if (gameState.campaignBonuses[p.id]) {
            delete gameState.campaignBonuses[p.id]['_fundraised_this_turn'];
          }
        }
        gameState.pendingCampaignActions = [];
        recalculate(gameState);
        advancePhase(gameState); // -> polling
        addLogEntry(gameState, `📊 Campaign standings update`, 'info');
      } else {
        gameState.pendingCampaignActions = [];
        addLogEntry(gameState, `${player.party.partyName} has finished their campaign actions. Waiting for opponent...`, 'info');
      }
      broadcastState();
      break;
    }

    case 'submitCoalitionOffer': {
      if (gameState.phase !== 'coalition_negotiation') return;
      const offer = payload as import('./engine/types').CoalitionOffer;
      const botParty = gameState.botParties.find(bp => bp.id === offer.toBotPartyId);
      if (!botParty) break;

      const player = gameState.players.find(p => p.id === playerId);
      if (!player) break;

      // Prevent double-approach: check if player already made an offer to this party
      const existingOffer = gameState.coalitionOffers.find(
        o => o.fromPlayerId === playerId && o.toBotPartyId === offer.toBotPartyId
      );
      if (existingOffer) {
        addLogEntry(gameState, `You already approached ${botParty.name}`, 'info');
        broadcastState();
        break;
      }

      // Store offer as pending — will be evaluated when coalition phase ends
      // Both players can make offers; bot parties pick the BEST offer, not the first
      const pendingOffer: import('./engine/types').CoalitionOffer = {
        fromPlayerId: playerId,
        toBotPartyId: botParty.id,
        promises: offer.promises,
        accepted: false,
        rejected: false,
      };
      gameState.coalitionOffers.push(pendingOffer);

      addLogEntry(gameState, `📨 ${player.party.partyName} submits coalition offer to ${botParty.name} (${offer.promises.length} promise${offer.promises.length !== 1 ? 's' : ''})`, 'election');
      addNewsItem(gameState, `${player.party.partyName} approaches ${botParty.name} for coalition talks`, 'election');
      broadcastState();
      break;
    }

    case 'spinScandal': {
      // Ruling party spins a scandal — costs 2 PC, reduces impact
      const ruling = gameState.players.find(p => p.role === 'ruling');
      if (!ruling || ruling.id !== playerId) break;
      if (ruling.politicalCapital < 2) {
        addLogEntry(gameState, 'Not enough PC to spin scandal (need 2)', 'info');
        broadcastState();
        break;
      }

      const scandalId = payload as string;
      const scandal = (gameState.activeScandals ?? []).find(s => s.id === scandalId);
      if (scandal && !scandal.spun) {
        ruling.politicalCapital -= 2;
        const spun = spinScandal(scandal);
        gameState.activeScandals = gameState.activeScandals.map(s =>
          s.id === scandalId ? spun : s
        );
        addLogEntry(gameState, `🔄 Spun scandal: "${scandal.title}" — impact reduced`, 'ruling');
        addNewsItem(gameState, `Government spin doctors address "${scandal.title}"`, 'general');
      }
      broadcastState();
      break;
    }

    case 'resolveDiplomaticIncident': {
      // Resolve a diplomatic incident (option a or b)
      const ruling = gameState.players.find(p => p.role === 'ruling');
      if (!ruling || ruling.id !== playerId) break;

      const { option } = payload as { option: 'a' | 'b' };
      const incident = gameState.activeDiplomaticIncident;
      if (!incident) break;

      const chosen = option === 'a' ? incident.optionA : incident.optionB;
      const rel = gameState.diplomaticRelations?.find(r => r.nationId === incident.nationId);
      if (rel) {
        rel.relation = Math.max(0, Math.min(100, rel.relation + chosen.relationDelta));
      }

      // Apply effects
      if (chosen.effects) {
        gameState.activeEffects.push({
          type: 'event',
          id: `diplo_${incident.id}_${Date.now()}`,
          turnsRemaining: 3,
          data: { effects: chosen.effects },
        });
      }

      addLogEntry(gameState, `🌐 Diplomatic response: "${chosen.label}" (${incident.title})`, 'ruling');
      addNewsItem(gameState, `🌐 Government responds to ${incident.title}: ${chosen.label}`, 'general');

      gameState.activeDiplomaticIncident = null;
      broadcastState();
      break;
    }

    case 'updateGameSettings': {
      // Update game settings (only from lobby/host)
      const settings = payload as Partial<import('./engine/types').GameSettings>;
      if (gameState.gameSettings) {
        gameState.gameSettings = { ...gameState.gameSettings, ...settings };
      }
      broadcastState();
      break;
    }

    case 'appointShadowMinister': {
      const { ministryId, politicianId } = payload as { ministryId: MinistryId; politicianId: string };
      const opp = gameState.players.find(p => p.role === 'opposition');
      if (!opp || opp.id !== playerId) return;

      if (!gameState.shadowCabinet) gameState.shadowCabinet = {} as Record<MinistryId, string | null>;
      gameState.shadowCabinet[ministryId] = politicianId;
      const pol = gameState.cabinet.availablePool.find(p => p.id === politicianId);
      if (pol) {
        addLogEntry(gameState, `Shadow cabinet: ${pol.name} shadowing ${ministryId}`, 'opposition');
      }
      broadcastState();
      break;
    }

    case 'poachCoalitionPartner': {
      const botPartyId = payload as string;
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) return;

      // Can only poach during opposition phase
      const existingPartner = gameState.coalitionPartners.find(cp => cp.botPartyId === botPartyId);
      if (!existingPartner) {
        addLogEntry(gameState, `${botPartyId} is not in any coalition`, 'info');
        broadcastState();
        break;
      }

      // Low chance of success — depends on partner satisfaction
      const poachChance = (100 - existingPartner.satisfaction) / 200; // 0-50% based on dissatisfaction
      if (Math.random() < poachChance) {
        gameState.coalitionPartners = gameState.coalitionPartners.filter(cp => cp.botPartyId !== botPartyId);
        const bot = gameState.botParties.find(b => b.id === botPartyId);
        addLogEntry(gameState, `🔀 ${bot?.name ?? botPartyId} leaves the coalition!`, 'opposition');
        addNewsItem(gameState, `Coalition crisis: ${bot?.name ?? botPartyId} breaks away!`, 'general');
      } else {
        addLogEntry(gameState, `${gameState.botParties.find(b => b.id === botPartyId)?.name ?? botPartyId} stays loyal to the coalition`, 'info');
      }
      broadcastState();
      break;
    }

    case 'lobbyBill': {
      // Player spends PC to lobby a bot party on a specific bill
      const { billId, targetPartyId, pcSpent, direction } = payload as {
        billId: string; targetPartyId: string; pcSpent: number; direction: 'support' | 'oppose';
      };
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) return;
      if (pcSpent < 1 || pcSpent > player.politicalCapital) {
        addLogEntry(gameState, `Not enough PC to lobby (need ${pcSpent}, have ${player.politicalCapital})`, 'info');
        broadcastState();
        return;
      }

      const bill = gameState.activeBills.find(b => b.id === billId);
      if (!bill || (bill.status !== 'voting' && bill.status !== 'pending')) {
        addLogEntry(gameState, 'Bill not available for lobbying', 'info');
        broadcastState();
        return;
      }

      player.politicalCapital -= pcSpent;
      if (!bill.lobbyInfluence) bill.lobbyInfluence = {};
      const influence = direction === 'support' ? pcSpent : -pcSpent;
      bill.lobbyInfluence[targetPartyId] = (bill.lobbyInfluence[targetPartyId] ?? 0) + influence;

      const botParty = gameState.botParties.find(b => b.id === targetPartyId);
      const dirLabel = direction === 'support' ? 'support' : 'oppose';
      addLogEntry(gameState, `🤝 ${player.party.partyName} lobbied ${botParty?.name ?? targetPartyId} to ${dirLabel} "${bill.title}" (${pcSpent} PC)`, 'info');
      addNewsItem(gameState, `📋 Lobbying: ${player.party.partyName} pressures ${botParty?.name ?? targetPartyId} on ${bill.title}`, 'bill');
      broadcastState();
      break;
    }

    case 'whipVotes': {
      // Ruling party whips coalition partners to vote with them on a bill
      const { billId: whipBillId, pcSpent: whipPC } = payload as { billId: string; pcSpent: number };
      const ruling = gameState.players.find(p => p.id === playerId && p.role === 'ruling');
      if (!ruling) {
        addLogEntry(gameState, 'Only the ruling party can whip votes', 'info');
        broadcastState();
        return;
      }
      if (whipPC < 1 || whipPC > ruling.politicalCapital) {
        addLogEntry(gameState, `Not enough PC to whip (need ${whipPC}, have ${ruling.politicalCapital})`, 'info');
        broadcastState();
        return;
      }

      const whipBill = gameState.activeBills.find(b => b.id === whipBillId);
      if (!whipBill || (whipBill.status !== 'voting' && whipBill.status !== 'pending')) {
        addLogEntry(gameState, 'Bill not available for whipping', 'info');
        broadcastState();
        return;
      }

      ruling.politicalCapital -= whipPC;
      // Each PC adds 15% loyalty to coalition partners
      whipBill.whipBonus = Math.min(30, (whipBill.whipBonus ?? 0) + whipPC * 15);

      addLogEntry(gameState, `🏛️ ${ruling.party.partyName} whips coalition partners on "${whipBill.title}" (+${whipPC * 15}% loyalty, ${whipPC} PC)`, 'ruling');
      addNewsItem(gameState, `🏛️ Government whip pressures coalition on ${whipBill.title}`, 'bill');
      broadcastState();
      break;
    }

    case 'campaignForBill': {
      // Public campaign to build pressure for/against a bill
      const { billId: campBillId, pcSpent: campPC, direction: campDir } = payload as {
        billId: string; pcSpent: number; direction: 'support' | 'oppose';
      };
      const campPlayer = gameState.players.find(p => p.id === playerId);
      if (!campPlayer) return;
      if (campPC < 1 || campPC > campPlayer.politicalCapital) {
        addLogEntry(gameState, `Not enough PC for public campaign`, 'info');
        broadcastState();
        return;
      }

      const campBill = gameState.activeBills.find(b => b.id === campBillId);
      if (!campBill || (campBill.status !== 'voting' && campBill.status !== 'pending')) {
        addLogEntry(gameState, 'Bill not available for campaigning', 'info');
        broadcastState();
        return;
      }

      campPlayer.politicalCapital -= campPC;
      // Each PC adds +5% public pressure
      const pressureDir = campDir === 'support' ? 1 : -1;
      campBill.publicPressure = Math.max(-20, Math.min(20,
        (campBill.publicPressure ?? 0) + campPC * 5 * pressureDir
      ));

      const dirLabel = campDir === 'support' ? 'supporting' : 'opposing';
      addLogEntry(gameState, `📢 ${campPlayer.party.partyName} launches public campaign ${dirLabel} "${campBill.title}" (${campPC} PC)`, 'info');
      addNewsItem(gameState, `📢 Public campaign: ${campPlayer.party.partyName} rallies public ${dirLabel} ${campBill.title}`, 'bill');
      broadcastState();
      break;
    }

    case 'proposeBillFromLibrary': {
      const { templateId } = payload as { templateId: string };
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) return;

      // Player can propose during their active phase
      const isPlayerPhase = (gameState.phase === 'ruling' && player.role === 'ruling') ||
                            (gameState.phase === 'opposition' && player.role === 'opposition');
      if (!isPlayerPhase) {
        addLogEntry(gameState, 'You can only propose bills during your turn', 'info');
        broadcastState();
        return;
      }

      const template = getBillTemplate(templateId);
      if (!template) {
        addLogEntry(gameState, 'Bill template not found', 'info');
        broadcastState();
        return;
      }

      const cost = player.role === 'ruling' ? template.cost : template.cost + 1;
      if (cost > player.politicalCapital) {
        addLogEntry(gameState, `Not enough PC to propose bill (need ${cost}, have ${player.politicalCapital})`, 'info');
        broadcastState();
        return;
      }

      // Check if bill is already active/passed
      const alreadyActive = gameState.activeBills.some(
        b => b.fromTemplate === templateId && (b.status === 'pending' || b.status === 'voting' || b.status === 'passed')
      );
      if (alreadyActive) {
        addLogEntry(gameState, `This bill is already active or passed`, 'info');
        broadcastState();
        return;
      }

      player.politicalCapital -= cost;

      // Create bill from template — use the first policy change as primary
      const primaryChange = template.policyChanges[0];
      const currentValue = gameState.policies[primaryChange.policyId] ?? 50;

      const bill: Bill = {
        id: `bill_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: template.name,
        description: template.description,
        category: template.category,
        policyId: primaryChange.policyId,
        proposedValue: primaryChange.targetValue,
        currentValue,
        authorId: player.id,
        status: 'pending',
        votesFor: 0,
        votesAgainst: 0,
        isEmergency: false,
        lobbyInfluence: {},
        whipBonus: 0,
        publicPressure: 0,
        constitutionalScore: template.constitutionalScore,
        turnProposed: gameState.turn,
        fromTemplate: templateId,
      };

      gameState.activeBills.push(bill);
      addLogEntry(gameState, `📋 ${player.party.partyName} proposes: ${template.name} (${cost} PC)`, 'ruling');
      addNewsItem(gameState, `📋 Parliament debates ${template.name}: ${template.description}`, 'bill');
      broadcastState();
      break;
    }

    case 'callBillVote': {
      // Redirect to startLiveVote — bills should never auto-resolve
      handleAction(playerId, 'startLiveVote', payload);
      return; // startLiveVote handles broadcastState
    }

    case 'vetoBill': {
      const { billId: vetoBillId } = payload as { billId: string };
      const ruling = gameState.players.find(p => p.id === playerId && p.role === 'ruling');
      if (!ruling) {
        addLogEntry(gameState, 'Only the ruling party can veto bills', 'info');
        broadcastState();
        return;
      }

      if (ruling.politicalCapital < 3) {
        addLogEntry(gameState, `Not enough PC to veto (need 3, have ${ruling.politicalCapital})`, 'info');
        broadcastState();
        return;
      }

      const vetoBill = gameState.activeBills.find(b => b.id === vetoBillId);
      if (!vetoBill || (vetoBill.status !== 'passed' && vetoBill.status !== 'pending')) {
        addLogEntry(gameState, 'Bill not available for veto', 'info');
        broadcastState();
        return;
      }

      // Can't veto your own bills
      if (vetoBill.authorId === playerId) {
        addLogEntry(gameState, 'Cannot veto your own bill', 'info');
        broadcastState();
        return;
      }

      ruling.politicalCapital -= 3;
      vetoBill.status = 'vetoed';

      // Remove delayed policy effects for this bill
      if (vetoBill.fromTemplate) {
        const template = getBillTemplate(vetoBill.fromTemplate);
        if (template) {
          for (const change of template.policyChanges) {
            gameState.delayedPolicies = gameState.delayedPolicies.filter(
              dp => !(dp.policyId === change.policyId && dp.newValue === change.targetValue)
            );
          }
        }
      } else {
        gameState.delayedPolicies = gameState.delayedPolicies.filter(
          dp => !(dp.policyId === vetoBill.policyId && dp.newValue === vetoBill.proposedValue)
        );
      }

      addLogEntry(gameState, `🚫 VETO: ${ruling.party.partyName} vetoes "${vetoBill.title}" (3 PC)`, 'ruling');
      addNewsItem(gameState, `🚫 VETO: Government blocks "${vetoBill.title}" — opposition may attempt override`, 'bill');
      broadcastState();
      break;
    }

    case 'overrideVeto': {
      const { billId: overrideBillId } = payload as { billId: string };
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) return;

      const overrideBill = gameState.activeBills.find(b => b.id === overrideBillId && b.status === 'vetoed');
      if (!overrideBill) {
        addLogEntry(gameState, 'No vetoed bill to override', 'info');
        broadcastState();
        return;
      }

      // Need 2/3 majority (67 out of 100 seats)
      const overrideResult = voteBill(
        { ...overrideBill, status: 'voting', lobbyInfluence: {}, whipBonus: 0, publicPressure: 0 },
        gameState.parliament,
        overrideBill.authorId,
        gameState.players,
        gameState.botParties,
        gameState.policies,
        undefined,
        gameState.coalitionPartners,
      );

      overrideBill.vetoOverrideVotes = { yes: overrideResult.votesFor, no: overrideResult.votesAgainst };

      if (overrideResult.votesFor >= 67) {
        // Override succeeds — bill passes
        overrideBill.status = 'passed';
        overrideBill.votesFor = overrideResult.votesFor;
        overrideBill.votesAgainst = overrideResult.votesAgainst;

        // Re-add delayed policy effects
        const template = overrideBill.fromTemplate ? getBillTemplate(overrideBill.fromTemplate) : null;
        if (template) {
          for (const change of template.policyChanges) {
            gameState.delayedPolicies.push({
              policyId: change.policyId,
              originalValue: gameState.policies[change.policyId],
              newValue: change.targetValue,
              turnsRemaining: 2,
              source: 'bill',
            });
          }
        } else {
          gameState.delayedPolicies.push({
            policyId: overrideBill.policyId,
            originalValue: gameState.policies[overrideBill.policyId],
            newValue: overrideBill.proposedValue,
            turnsRemaining: 2,
            source: 'bill',
          });
        }

        addLogEntry(gameState, `⚡ VETO OVERRIDDEN! ${overrideBill.title} passes with ${overrideResult.votesFor}/100 votes (needed 67)`, 'ruling');
        addNewsItem(gameState, `⚡ Parliament overrides veto on "${overrideBill.title}" ${overrideResult.votesFor}-${overrideResult.votesAgainst}!`, 'bill');
      } else {
        // Override fails — bill stays vetoed and is removed
        addLogEntry(gameState, `🚫 Veto override FAILS for ${overrideBill.title} (${overrideResult.votesFor}/100, needed 67)`, 'ruling');
        addNewsItem(gameState, `🚫 Veto on "${overrideBill.title}" upheld — override attempt fails ${overrideResult.votesFor}-${overrideResult.votesAgainst}`, 'bill');
      }

      broadcastState();
      break;
    }

    case 'challengeConstitutionality': {
      const { billId: constBillId } = payload as { billId: string };
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) return;

      if (player.politicalCapital < 2) {
        addLogEntry(gameState, `Not enough PC to challenge (need 2, have ${player.politicalCapital})`, 'info');
        broadcastState();
        return;
      }

      const constBill = gameState.activeBills.find(b =>
        b.id === constBillId && (b.status === 'passed' || b.status === 'pending')
      );
      if (!constBill) {
        addLogEntry(gameState, 'Bill not available for constitutional challenge', 'info');
        broadcastState();
        return;
      }

      player.politicalCapital -= 2;

      // Constitutional court ruling — random chance based on bill's score
      // Lower constitutionalScore = more likely to be struck down
      const score = constBill.constitutionalScore ?? 70;
      const strikeDownChance = (100 - score) / 100; // 0-1, higher = more likely unconstitutional
      const isUnconstitutional = Math.random() < strikeDownChance;

      if (isUnconstitutional) {
        constBill.status = 'unconstitutional';

        // Remove delayed policy effects
        if (constBill.fromTemplate) {
          const template = getBillTemplate(constBill.fromTemplate);
          if (template) {
            for (const change of template.policyChanges) {
              gameState.delayedPolicies = gameState.delayedPolicies.filter(
                dp => !(dp.policyId === change.policyId && dp.newValue === change.targetValue)
              );
            }
          }
        } else {
          gameState.delayedPolicies = gameState.delayedPolicies.filter(
            dp => !(dp.policyId === constBill.policyId && dp.newValue === constBill.proposedValue)
          );
        }

        addLogEntry(gameState, `⚖️ UNCONSTITUTIONAL! Court strikes down "${constBill.title}" (score: ${score}/100)`, 'ruling');
        addNewsItem(gameState, `⚖️ Constitutional Court rules "${constBill.title}" UNCONSTITUTIONAL — bill canceled`, 'bill');
      } else {
        addLogEntry(gameState, `⚖️ Constitutional challenge FAILS for "${constBill.title}" — court upholds (score: ${score}/100)`, 'ruling');
        addNewsItem(gameState, `⚖️ Constitutional Court upholds "${constBill.title}" — challenge dismissed`, 'bill');

        // Failed challenge costs credibility
        if (player.role === 'opposition') {
          gameState.oppositionCredibility = Math.max(0, (gameState.oppositionCredibility ?? 50) - 5);
        }
      }

      broadcastState();
      break;
    }

    case 'startLiveVote': {
      // Start interactive voting session for a bill
      const { billId: lvBillId } = payload as { billId: string };
      const bill = gameState.activeBills.find(b => b.id === lvBillId);
      if (!bill || (bill.status !== 'pending' && bill.status !== 'voting')) {
        addLogEntry(gameState, 'Bill not available for live voting', 'info');
        broadcastState();
        return;
      }

      bill.status = 'voting';

      // Compute initial vote intentions for each bot party
      const intentions: Record<string, number> = {};
      for (const bot of gameState.botParties) {
        let yesProb = 0.35;
        const pref = bot.policyPreferences[bill.policyId];
        if (pref !== undefined) {
          const currentValue = gameState.policies[bill.policyId] ?? 50;
          const currentDist = Math.abs(currentValue - pref);
          const proposedDist = Math.abs(bill.proposedValue - pref);
          if (proposedDist < currentDist) {
            yesProb = 0.6 + (currentDist - proposedDist) / 200;
          } else {
            yesProb = 0.2 - (proposedDist - currentDist) / 400;
          }
        }
        intentions[bot.id] = Math.max(-1, Math.min(1, (yesProb - 0.5) * 2));
      }

      // Author's party always supports, other human opposes by default
      for (const p of gameState.players) {
        intentions[p.id] = p.id === bill.authorId ? 0.9 : -0.5;
      }

      gameState.liveVote = {
        billId: bill.id,
        bill,
        partyIntentions: intentions,
        lobbySpent: {},
        readyPlayers: [],
        playerVotes: {},
        startedAt: Date.now(),
        finalized: false,
      };

      addLogEntry(gameState, `🗳️ LIVE VOTE: "${bill.title}" goes to parliament! Lobby now!`, 'ruling');
      addNewsItem(gameState, `🗳️ Parliament convenes to vote on "${bill.title}"`, 'bill');

      // In AI games, auto-set AI player's vote and mark them ready
      if (gameState.isAIGame && gameState.aiPlayerId && gameState.liveVote) {
        const isAIBill = bill.authorId === gameState.aiPlayerId;
        gameState.liveVote.playerVotes[gameState.aiPlayerId] = isAIBill ? 'yes' : 'no';
        if (!gameState.liveVote.readyPlayers.includes(gameState.aiPlayerId)) {
          gameState.liveVote.readyPlayers.push(gameState.aiPlayerId);
        }
      }

      broadcastState();
      break;
    }

    case 'lobbyLiveVote': {
      // Player lobbies a party during live vote
      if (!gameState.liveVote || gameState.liveVote.finalized) return;
      const { targetPartyId: lvTarget, pcSpent: lvPC, direction: lvDir } = payload as {
        targetPartyId: string; pcSpent: number; direction: 'support' | 'oppose';
      };
      const lvPlayer = gameState.players.find(p => p.id === playerId);
      if (!lvPlayer || lvPC < 1 || lvPC > lvPlayer.politicalCapital) return;

      lvPlayer.politicalCapital -= lvPC;
      gameState.liveVote.lobbySpent[playerId] = (gameState.liveVote.lobbySpent[playerId] ?? 0) + lvPC;

      // Shift intention: each PC shifts by ~0.1
      const shift = lvPC * 0.1 * (lvDir === 'support' ? 1 : -1);
      gameState.liveVote.partyIntentions[lvTarget] = Math.max(-1, Math.min(1,
        (gameState.liveVote.partyIntentions[lvTarget] ?? 0) + shift
      ));

      // Also update the bill's lobby influence for final calculation
      const lvBill = gameState.activeBills.find(b => b.id === gameState!.liveVote!.billId);
      if (lvBill) {
        if (!lvBill.lobbyInfluence) lvBill.lobbyInfluence = {};
        const influence = lvDir === 'support' ? lvPC : -lvPC;
        lvBill.lobbyInfluence[lvTarget] = (lvBill.lobbyInfluence[lvTarget] ?? 0) + influence;
      }

      const botName = gameState.botParties.find(b => b.id === lvTarget)?.name ?? lvTarget;
      const dirLabel = lvDir === 'support' ? 'support' : 'oppose';
      addLogEntry(gameState, `🤝 ${lvPlayer.party.partyName} lobbied ${botName} to ${dirLabel} (${lvPC} PC)`, 'info');
      broadcastState();
      break;
    }

    case 'whipLiveVote': {
      // Ruling party whips coalition during live vote
      if (!gameState.liveVote || gameState.liveVote.finalized) return;
      const { pcSpent: whipLvPC } = payload as { pcSpent: number };
      const whipLvPlayer = gameState.players.find(p => p.id === playerId && p.role === 'ruling');
      if (!whipLvPlayer || whipLvPC < 1 || whipLvPC > whipLvPlayer.politicalCapital) return;

      whipLvPlayer.politicalCapital -= whipLvPC;
      
      // Shift all coalition partners toward yes
      for (const cp of gameState.coalitionPartners) {
        gameState.liveVote.partyIntentions[cp.botPartyId] = Math.max(-1, Math.min(1,
          (gameState.liveVote.partyIntentions[cp.botPartyId] ?? 0) + whipLvPC * 0.15
        ));
      }

      const lvBill = gameState.activeBills.find(b => b.id === gameState!.liveVote!.billId);
      if (lvBill) {
        lvBill.whipBonus = Math.min(30, (lvBill.whipBonus ?? 0) + whipLvPC * 15);
      }

      addLogEntry(gameState, `🏛️ ${whipLvPlayer.party.partyName} whips coalition partners (+${whipLvPC * 15}% loyalty)`, 'ruling');
      broadcastState();
      break;
    }

    case 'campaignLiveVote': {
      // Public campaign during live vote — shifts all parties slightly
      if (!gameState.liveVote || gameState.liveVote.finalized) return;
      const { pcSpent: campLvPC, direction: campLvDir } = payload as { pcSpent: number; direction: 'support' | 'oppose' };
      const campLvPlayer = gameState.players.find(p => p.id === playerId);
      if (!campLvPlayer || campLvPC < 1 || campLvPC > campLvPlayer.politicalCapital) return;

      campLvPlayer.politicalCapital -= campLvPC;
      
      // Shift ALL bot parties slightly
      const campShift = campLvPC * 0.05 * (campLvDir === 'support' ? 1 : -1);
      for (const bot of gameState.botParties) {
        gameState.liveVote.partyIntentions[bot.id] = Math.max(-1, Math.min(1,
          (gameState.liveVote.partyIntentions[bot.id] ?? 0) + campShift
        ));
      }

      const lvBill = gameState.activeBills.find(b => b.id === gameState!.liveVote!.billId);
      if (lvBill) {
        const pressureDir = campLvDir === 'support' ? 1 : -1;
        lvBill.publicPressure = Math.max(-20, Math.min(20, (lvBill.publicPressure ?? 0) + campLvPC * 5 * pressureDir));
      }

      const dirLabel = campLvDir === 'support' ? 'supporting' : 'opposing';
      addLogEntry(gameState, `📢 ${campLvPlayer.party.partyName} campaigns ${dirLabel} the bill (${campLvPC} PC)`, 'info');
      broadcastState();
      break;
    }

    case 'readyLiveVote': {
      // Player marks ready to finalize
      if (!gameState.liveVote || gameState.liveVote.finalized) return;
      if (!gameState.liveVote.readyPlayers.includes(playerId)) {
        gameState.liveVote.readyPlayers.push(playerId);
      }
      broadcastState();
      break;
    }

    case 'setPlayerVote': {
      // Player sets their party's explicit vote (yes/no/null for abstain)
      if (!gameState.liveVote || gameState.liveVote.finalized) return;
      const { vote: pvChoice } = payload as { vote: 'yes' | 'no' | null };
      if (pvChoice === null) {
        delete gameState.liveVote.playerVotes[playerId];
      } else {
        gameState.liveVote.playerVotes[playerId] = pvChoice;
      }
      broadcastState();
      break;
    }

    case 'finalizeLiveVote': {
      // Actually run the vote and determine outcome
      if (!gameState.liveVote || gameState.liveVote.finalized) return;

      const finalBill = gameState.activeBills.find(b => b.id === gameState!.liveVote!.billId);
      if (!finalBill) return;

      // Convert intentions to actual votes
      let votesFor = 0;
      let votesAgainst = 0;
      const partyVotes: Record<string, { yes: number; no: number }> = {};

      for (const seat of gameState.parliament.seats) {
        // Check if this party has an explicit player vote
        const explicitVote = gameState.liveVote.playerVotes[seat.partyId];

        let voteYes: boolean;
        if (explicitVote === 'yes') {
          voteYes = true;
        } else if (explicitVote === 'no') {
          voteYes = false;
        } else {
          // Use intention-based random voting for bot parties / abstaining players
          const intention = gameState.liveVote.partyIntentions[seat.partyId] ?? 0;
          const yesProb = Math.max(0.02, Math.min(0.98, (intention + 1) / 2));
          voteYes = Math.random() < yesProb;
        }

        if (!partyVotes[seat.partyId]) partyVotes[seat.partyId] = { yes: 0, no: 0 };
        if (voteYes) {
          votesFor++;
          partyVotes[seat.partyId].yes++;
        } else {
          votesAgainst++;
          partyVotes[seat.partyId].no++;
        }
      }

      finalBill.votesFor = votesFor;
      finalBill.votesAgainst = votesAgainst;
      finalBill.partyVotes = partyVotes;
      finalBill.status = votesFor >= 51 ? 'passed' : 'failed';

      gameState.liveVote.finalized = true;
      gameState.liveVote.result = {
        passed: finalBill.status === 'passed',
        votesFor,
        votesAgainst,
        partyVotes,
      };

      const template = finalBill.fromTemplate ? getBillTemplate(finalBill.fromTemplate) : null;

      // Generate vote summary
      const lvVoteDetails = Object.entries(partyVotes).map(([pid, v]) => {
        const p = gameState!.players.find(pl => pl.id === pid);
        const bot = gameState!.botParties.find(b => b.id === pid);
        const name = p?.party.partyName ?? bot?.name ?? pid;
        return `${name}: ${v.yes}Y/${v.no}N`;
      }).join(', ');

      if (finalBill.status === 'passed') {
        if (template) {
          for (const change of template.policyChanges) {
            gameState.delayedPolicies.push({
              policyId: change.policyId,
              originalValue: gameState.policies[change.policyId],
              newValue: change.targetValue,
              turnsRemaining: 2,
              source: 'bill',
            });
          }
        } else {
          gameState.delayedPolicies.push({
            policyId: finalBill.policyId,
            originalValue: gameState.policies[finalBill.policyId],
            newValue: finalBill.proposedValue,
            turnsRemaining: 2,
            source: 'bill',
          });
        }
        addLogEntry(gameState, `✅ ${finalBill.title} PASSED (${votesFor}-${votesAgainst})`, 'ruling');
        addNewsItem(gameState, `🏛️ Parliament passes ${finalBill.title} ${votesFor}-${votesAgainst}! ${lvVoteDetails}`, 'bill');
      } else {
        addLogEntry(gameState, `❌ ${finalBill.title} FAILED (${votesFor}-${votesAgainst})`, 'ruling');
        addNewsItem(gameState, `🏛️ Parliament rejects ${finalBill.title} ${votesFor}-${votesAgainst}. ${lvVoteDetails}`, 'bill');
      }

      recalculate(gameState);
      broadcastState();
      break;
    }

    case 'dismissLiveVote': {
      // Close the live vote modal after viewing results
      gameState.liveVote = null;
      broadcastState();
      break;
    }

    case 'forceBillVote': {
      // Ruling party forces vote on filibustered bill (needs 60% majority)
      const { billId: forceBillId } = payload as { billId: string };
      const forcePlayer = gameState.players.find(p => p.id === playerId && p.role === 'ruling');
      if (!forcePlayer) return;

      const forceBill = gameState.activeBills.find(b => b.id === forceBillId && (b as { status: string }).status === 'filibustered');
      if (!forceBill) {
        addLogEntry(gameState, 'No filibustered bill to force', 'info');
        broadcastState();
        return;
      }

      // Check if ruling coalition has 60+ seats
      let rulingCoalitionSeats = gameState.parliament.seatsByParty[forcePlayer.id] ?? 0;
      for (const cp of gameState.coalitionPartners) {
        rulingCoalitionSeats += gameState.parliament.seatsByParty[cp.botPartyId] ?? 0;
      }

      if (rulingCoalitionSeats >= 60) {
        forceBill.status = 'pending';
        forceBill.filibusterTurns = undefined;
        addLogEntry(gameState, `⚡ Filibuster broken! "${forceBill.title}" returns to pending status (${rulingCoalitionSeats} seats)`, 'ruling');
        addNewsItem(gameState, `⚡ Government breaks filibuster on "${forceBill.title}" with ${rulingCoalitionSeats}% majority`, 'bill');
      } else {
        addLogEntry(gameState, `Cannot break filibuster — need 60 seats, coalition has ${rulingCoalitionSeats}`, 'info');
      }
      broadcastState();
      break;
    }

    case 'readyPhase': {
      // Player marks themselves as ready for the current phase
      if (!gameState) return;
      gameState.phaseReady[playerId] = true;

      // For AI games, auto-ready the AI player
      if (gameState.isAIGame && gameState.aiPlayerId) {
        gameState.phaseReady[gameState.aiPlayerId] = true;
      }

      // Check if all players are ready
      const allPlayersReady = gameState.players.every(p => gameState!.phaseReady[p.id]);
      if (allPlayersReady) {
        // Auto-advance the phase
        handleEndTurnPhase(playerId);
      } else {
        broadcastState();
      }
      break;
    }

    case 'influenceMedia': {
      // D4: Spend 2 PC to influence a newspaper — shifts stance +10 for 3 turns
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) return;
      if (player.politicalCapital < 2) {
        addLogEntry(gameState, 'Not enough PC to influence media (need 2)', 'info');
        broadcastState();
        return;
      }
      const { outletId } = payload as { outletId: string };
      const outlet = gameState.mediaLandscape?.find(m => m.id === outletId);
      if (!outlet) return;

      player.politicalCapital -= 2;
      outlet.currentStance = Math.min(50, outlet.currentStance + 10);
      outlet.influencedUntil = gameState.turn + 3;

      addLogEntry(gameState, `📰 ${player.party.partyName} launches PR campaign with ${outlet.name} (2 PC)`, 'info');
      addNewsItem(gameState, `${outlet.name} runs favorable coverage of ${player.party.partyName} after exclusive interview`, 'general');
      broadcastState();
      break;
    }

    case 'submitDebateChoice': {
      if (gameState.phase !== 'debate' || !gameState.debate || gameState.debate.resolved) return;
      const choices = payload as Record<string, import('./engine/types').DebateChoice>;
      gameState.debate.playerChoices[playerId] = choices;

      // In AI games, auto-submit AI choices
      if (gameState.isAIGame && gameState.aiPlayerId && !gameState.debate.playerChoices[gameState.aiPlayerId]) {
        const aiChoices: Record<string, import('./engine/types').DebateChoice> = {};
        for (const topic of gameState.debate.topics) {
          // AI picks based on whether the topic favors them
          const inversed = ['unemployment', 'crime', 'pollution', 'corruption'];
          const val = gameState.simulation[topic.simVar as keyof typeof gameState.simulation] as number;
          const isBad = inversed.includes(topic.simVar) ? val > 50 : val < 50;
          // If topic is bad for ruling, AI (as opposition) attacks; if good, defends
          const aiPlayer = gameState.players.find(p => p.id === gameState!.aiPlayerId);
          if (aiPlayer?.role === 'opposition') {
            aiChoices[topic.id] = isBad ? 'attack' : 'pivot';
          } else {
            aiChoices[topic.id] = isBad ? 'defend' : 'attack';
          }
        }
        gameState.debate.playerChoices[gameState.aiPlayerId] = aiChoices;
      }

      // Check if all players have submitted
      const allSubmitted = gameState.players.every(p => gameState!.debate!.playerChoices[p.id]);
      if (allSubmitted) {
        // Resolve debate: Attack beats Defend, Defend beats Pivot, Pivot beats Attack
        const scores: Record<string, number> = {};
        for (const p of gameState.players) scores[p.id] = 0;

        for (const topic of gameState.debate.topics) {
          const p1 = gameState.players[0];
          const p2 = gameState.players[1];
          if (!p1 || !p2) continue;
          const c1 = gameState.debate.playerChoices[p1.id]?.[topic.id] ?? 'defend';
          const c2 = gameState.debate.playerChoices[p2.id]?.[topic.id] ?? 'defend';

          // Rock-paper-scissors: attack > defend > pivot > attack
          const beats: Record<string, string> = { attack: 'defend', defend: 'pivot', pivot: 'attack' };
          if (beats[c1] === c2) {
            scores[p1.id] += 1;
            addLogEntry(gameState, `📺 ${topic.name}: ${p1.party.partyName} wins (${c1} beats ${c2})`, 'election');
          } else if (beats[c2] === c1) {
            scores[p2.id] += 1;
            addLogEntry(gameState, `📺 ${topic.name}: ${p2.party.partyName} wins (${c2} beats ${c1})`, 'election');
          } else {
            addLogEntry(gameState, `📺 ${topic.name}: Draw (both chose ${c1})`, 'election');
          }
        }

        gameState.debate.scores = scores;
        gameState.debate.resolved = true;

        // Determine winner
        const [id1, id2] = gameState.players.map(p => p.id);
        if (scores[id1] > scores[id2]) {
          gameState.debate.winner = id1;
          gameState.approvalRating[id1] = Math.min(100, (gameState.approvalRating[id1] ?? 50) + 5);
          gameState.approvalRating[id2] = Math.max(0, (gameState.approvalRating[id2] ?? 50) - 3);
          addLogEntry(gameState, `🏆 ${gameState.players[0].party.partyName} wins the debate! +5 approval`, 'election');
        } else if (scores[id2] > scores[id1]) {
          gameState.debate.winner = id2;
          gameState.approvalRating[id2] = Math.min(100, (gameState.approvalRating[id2] ?? 50) + 5);
          gameState.approvalRating[id1] = Math.max(0, (gameState.approvalRating[id1] ?? 50) - 3);
          addLogEntry(gameState, `🏆 ${gameState.players[1].party.partyName} wins the debate! +5 approval`, 'election');
        } else {
          addLogEntry(gameState, `🤝 Debate ends in a draw — no approval change`, 'election');
        }

        recalculate(gameState);
      }
      broadcastState();
      break;
    }

    case 'runFocusGroup': {
      // D4: Focus group — spend 1 PC to preview what a policy change would do to voter satisfaction
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) return;
      if (player.politicalCapital < 1) {
        addLogEntry(gameState, 'Not enough PC for focus group (need 1)', 'info');
        broadcastState();
        return;
      }

      const { policyId, proposedValue } = payload as { policyId: string; proposedValue: number };
      const policy = POLICY_MAP.get(policyId);
      if (!policy) return;

      player.politicalCapital -= 1;

      // Simulate what would happen to each voter group
      const currentValue = gameState.policies[policyId] ?? 50;
      const predictedImpact: Record<string, number> = {};
      for (const group of VOTER_GROUPS) {
        const ideal = group.policyPreferences[policyId];
        if (ideal !== undefined) {
          const currentDist = Math.abs(currentValue - ideal);
          const proposedDist = Math.abs(proposedValue - ideal);
          const delta = (currentDist - proposedDist) * 0.3; // Positive = closer to ideal = good
          predictedImpact[group.id] = Math.round(delta * 10) / 10;
        }
      }

      gameState.focusGroupResult = { policyId, predictedImpact };
      addLogEntry(gameState, `🔍 Focus group polled on ${policy.name}: ${currentValue} → ${proposedValue}`, 'info');
      broadcastState();
      break;
    }

    case 'dismissFocusGroup': {
      gameState.focusGroupResult = null;
      broadcastState();
      break;
    }

    case 'endTurnPhase': {
      handleEndTurnPhase(playerId);
      break;
    }
  }
}

function handleEndTurnPhase(playerId?: string) {
  if (!gameState) return;

  if (gameState.phase === 'polling') {
    if (gameState.turnsUntilElection <= 0) {
      // D4: Insert debate phase before election
      if (!gameState.debate) {
        // Pick 3 debate topics from weakest simulation variables
        const sim = gameState.simulation;
        const topicCandidates: import('./engine/types').DebateTopic[] = [
          { id: 'economy', name: 'The Economy', icon: '💰', simVar: 'gdpGrowth' },
          { id: 'jobs', name: 'Jobs & Employment', icon: '👷', simVar: 'unemployment' },
          { id: 'crime', name: 'Crime & Safety', icon: '🔒', simVar: 'crime' },
          { id: 'health', name: 'Healthcare', icon: '🏥', simVar: 'healthIndex' },
          { id: 'education', name: 'Education', icon: '🎓', simVar: 'educationIndex' },
          { id: 'environment', name: 'Environment', icon: '🌿', simVar: 'pollution' },
          { id: 'freedom', name: 'Civil Liberties', icon: '⚖️', simVar: 'freedomIndex' },
          { id: 'corruption', name: 'Corruption', icon: '🕳️', simVar: 'corruption' },
        ];
        // Sort by how bad the sim var is (voters care about problems)
        const inversed = ['unemployment', 'crime', 'pollution', 'corruption'];
        topicCandidates.sort((a, b) => {
          const aVal = sim[a.simVar as keyof typeof sim] as number;
          const bVal = sim[b.simVar as keyof typeof sim] as number;
          const aBad = inversed.includes(a.simVar) ? aVal : 100 - aVal;
          const bBad = inversed.includes(b.simVar) ? bVal : 100 - bVal;
          return bBad - aBad;
        });
        const topics = topicCandidates.slice(0, 3);

        gameState.debate = {
          topics,
          playerChoices: {},
          scores: {},
          resolved: false,
          winner: null,
        };
        gameState.phase = 'debate';
        addLogEntry(gameState, `📺 Pre-election debate! Topics: ${topics.map(t => t.name).join(', ')}`, 'election');
        addNewsItem(gameState, `The candidates face off in a televised debate on ${topics.map(t => t.name).join(', ')}`, 'election');
        broadcastState();
        return;
      }

      advancePhase(gameState); // -> election

      // Recalculate before election to get fresh voter data
      recalculate(gameState);

      const result = runElection(
        gameState.regionalSatisfaction,
        gameState.players,
        gameState.turn,
        gameState.activeEffects,
        gameState.campaignBonuses,
        gameState.voterSatisfaction,
        gameState.botParties,
      );
      gameState.electionHistory.push(result);

      // C1 fix: Reset debate so it triggers again next election
      gameState.debate = null;

      // Update parliament seats with ALL parties
      const regionVoteShares: Record<string, Record<string, number>> = {};
      for (const region of Object.keys(result.voteShares)) {
        regionVoteShares[region] = result.voteShares[region];
      }
      gameState.parliament = allocateSeats(regionVoteShares, gameState.players, gameState.botParties);

      // Update bot party seat counts
      for (const bot of gameState.botParties) {
        bot.seats = gameState.parliament.seatsByParty[bot.id] ?? 0;
      }

      // Build seat summary
      const seatSummary = [
        ...gameState.players.map(p => `${p.party.partyName}: ${result.totalSeats[p.id] ?? 0}`),
        ...gameState.botParties.map(b => `${b.name}: ${result.totalSeats[b.id] ?? 0}`),
      ].join(', ');

      addLogEntry(gameState, `🗳️ ELECTION RESULTS: ${seatSummary}`, 'election');
      addNewsItem(gameState, `Election results — ${seatSummary}`, 'election');

      // Update supermajority victory tracker
      updateSupermajorityTracker(gameState);

      // After first election, end pre-election phase
      gameState.isPreElection = false;

      // Reset campaign bonuses and campaign active effects (including long-lived ones)
      gameState.campaignBonuses = {};
      gameState.activeEffects = gameState.activeEffects.filter(e => {
        const d = e.data as Record<string, unknown>;
        if (d.type === 'campaign_visit' || d.type === 'campaign' || d.type === 'rally') return false;
        // Remove any effects with very long durations that were campaign-related
        if (e.turnsRemaining >= 90) return false;
        return true;
      });

      // Don't assign ruling/opposition yet — that happens after coalition negotiation
      // The winner just has the most seats among human players, but needs 51+ with coalition
      broadcastState();
      return;
    }

    advancePhase(gameState);

    const event = rollForEvent();
    if (event) {
      gameState.currentEvent = event;
      gameState.activeEffects.push({
        type: 'event',
        id: event.id,
        turnsRemaining: event.duration,
        data: { effects: event.effects, approvalImpact: event.approvalImpact },
      });
      addLogEntry(gameState, `📰 Event: ${event.name}`, 'event');
      addNewsItem(gameState, `${event.name}: ${event.description}`, 'event');
    } else {
      gameState.currentEvent = null;
    }

    // New situations notification
    for (const sit of gameState.activeSituations) {
      if (!sit.acknowledged) {
        const sitDef = getSituationById(sit.id);
        if (sitDef) {
          addNewsItem(gameState, `${sitDef.icon} ${sitDef.name}: ${sitDef.description}`, 'situation');
        }
        sit.acknowledged = true;
      }
    }

    broadcastState();
  } else if (gameState.phase === 'election') {
    advancePhase(gameState); // -> coalition_negotiation or game_over

    if ((gameState.phase as string) !== 'game_over') {
      // Reset coalition state for negotiation
      gameState.coalitionPartners = [];
      gameState.coalitionOffers = [];

      addLogEntry(gameState, '🤝 Coalition negotiation begins — form a majority government!', 'election');
    }

    broadcastState();
  } else if (gameState.phase === 'coalition_negotiation') {
    // ===== EVALUATE ALL PENDING COALITION OFFERS =====
    // Each bot party picks the BEST offer from all players, not the first
    const pendingOffersByBot: Record<string, import('./engine/types').CoalitionOffer[]> = {};
    for (const offer of gameState.coalitionOffers) {
      if (!offer.accepted && !offer.rejected) {
        if (!pendingOffersByBot[offer.toBotPartyId]) pendingOffersByBot[offer.toBotPartyId] = [];
        pendingOffersByBot[offer.toBotPartyId].push(offer);
      }
    }

    for (const [botId, offers] of Object.entries(pendingOffersByBot)) {
      const botParty = gameState.botParties.find(b => b.id === botId);
      if (!botParty) continue;

      // Score each offer
      let bestOffer: import('./engine/types').CoalitionOffer | null = null;
      let bestScore = -1;

      for (const offer of offers) {
        const offerPlayer = gameState.players.find(p => p.id === offer.fromPlayerId);
        if (!offerPlayer) continue;

        const econDiff = Math.abs(offerPlayer.party.economicAxis - botParty.economicAxis);
        const socialDiff = Math.abs(offerPlayer.party.socialAxis - botParty.socialAxis);
        const alignment = (200 - econDiff - socialDiff) / 200;

        let score = alignment * 0.7 + 0.15;
        for (const promise of offer.promises) {
          const pref = botParty.policyPreferences[promise.policyId];
          if (pref !== undefined) {
            if ((promise.direction === 'increase' && pref > 60) || (promise.direction === 'decrease' && pref < 40)) {
              score += 0.1;
            }
          }
        }
        // Bonus: more promises = more serious offer
        score += offer.promises.length * 0.03;

        if (score > bestScore) {
          bestScore = score;
          bestOffer = offer;
        }
      }

      // Bot decides whether to accept the best offer
      const acceptChance = Math.min(0.95, Math.max(0.05, bestScore));
      const accepted = bestOffer && Math.random() < acceptChance;

      for (const offer of offers) {
        if (accepted && offer === bestOffer) {
          offer.accepted = true;
          offer.rejected = false;
          const offerPlayer = gameState.players.find(p => p.id === offer.fromPlayerId);
          gameState.coalitionPartners.push({
            botPartyId: botParty.id,
            seats: botParty.seats,
            promises: offer.promises,
            satisfaction: 80,
            turnsInCoalition: 0,
          });
          addLogEntry(gameState, `🤝 ${botParty.name} accepts ${offerPlayer?.party.partyName ?? 'unknown'}'s coalition offer!`, 'election');
          addNewsItem(gameState, `Coalition deal: ${botParty.name} joins ${offerPlayer?.party.partyName}`, 'election');
        } else {
          offer.accepted = false;
          offer.rejected = true;
          if (offers.length > 1 && offer !== bestOffer) {
            const rejectedPlayer = gameState.players.find(p => p.id === offer.fromPlayerId);
            addLogEntry(gameState, `❌ ${botParty.name} chose a better offer over ${rejectedPlayer?.party.partyName}`, 'election');
          } else if (!accepted) {
            const rejectedPlayer = gameState.players.find(p => p.id === offer.fromPlayerId);
            addLogEntry(gameState, `❌ ${botParty.name} rejects ${rejectedPlayer?.party.partyName}'s offer`, 'election');
          }
        }
      }
    }

    // Player is done negotiating — determine who forms government
    const lastElection = gameState.electionHistory[gameState.electionHistory.length - 1];
    if (!lastElection) {
      advancePhase(gameState);
      broadcastState();
      return;
    }

    // Find which human player has the most seats + coalition seats
    let formateur: Player | null = null;
    let maxCoalitionSeats = 0;

    for (const player of gameState.players) {
      let coalitionTotal = gameState.parliament.seatsByParty[player.id] ?? 0;
      for (const partner of gameState.coalitionPartners.filter(cp =>
        // Check if this player was the one who made the deal
        gameState!.coalitionOffers.some(o => o.fromPlayerId === player.id && o.toBotPartyId === cp.botPartyId && o.accepted)
      )) {
        coalitionTotal += partner.seats;
      }
      // Also add from offers that were accepted
      for (const offer of gameState.coalitionOffers.filter(o => o.fromPlayerId === player.id && o.accepted)) {
        const bot = gameState.botParties.find(b => b.id === offer.toBotPartyId);
        if (bot && !gameState.coalitionPartners.some(cp => cp.botPartyId === bot.id)) {
          coalitionTotal += bot.seats;
        }
      }

      if (coalitionTotal > maxCoalitionSeats) {
        maxCoalitionSeats = coalitionTotal;
        formateur = player;
      }
    }

    // If no player reached 51+, largest party wins by default (minority government)
    if (!formateur) {
      let maxSeats = 0;
      for (const player of gameState.players) {
        const seats = gameState.parliament.seatsByParty[player.id] ?? 0;
        if (seats > maxSeats) {
          maxSeats = seats;
          formateur = player;
        }
      }
    }

    // Assign roles
    for (const p of gameState.players) {
      if (formateur && p.id === formateur.id) {
        p.role = 'ruling';
        p.termsWon++;
        p.politicalCapital = 6;
      } else {
        p.role = 'opposition';
        p.politicalCapital = 4;
      }
    }

    if (formateur) {
      addLogEntry(gameState, `🏛️ ${formateur.party.partyName} forms the government with ${maxCoalitionSeats} seats!`, 'election');
      addNewsItem(gameState, `${formateur.party.partyName} forms government coalition`, 'election');

      // Check if this was a role swap
      const prevRuling = lastElection.winner;
      if (prevRuling !== formateur.id) {
        for (const key of Object.keys(gameState.cabinet.ministers)) {
          gameState.cabinet.ministers[key as MinistryId] = null;
        }
        // Reset consecutive ruling counter on power change
        gameState.consecutiveRulingPartyElections = 1;
      } else {
        // Same party stays in power
        gameState.consecutiveRulingPartyElections = (gameState.consecutiveRulingPartyElections ?? 0) + 1;
        // D4: Cynicism increases when same party rules for 5+ elections
        if (gameState.consecutiveRulingPartyElections >= 5) {
          if (!gameState.voterCynicism) gameState.voterCynicism = {};
          for (const group of VOTER_GROUPS) {
            gameState.voterCynicism[group.id] = Math.min(100, (gameState.voterCynicism[group.id] ?? 0) + 8);
          }
          addNewsItem(gameState, `😤 Voter fatigue: ${formateur.party.partyName} in power for ${gameState.consecutiveRulingPartyElections} terms — cynicism rises`, 'general');
        }
      }
    }

    advancePhase(gameState); // -> government_formation

    broadcastState();
  } else if (gameState.phase === 'ruling') {
    // Only the ruling player can end the ruling phase
    const rulingPlayer = gameState.players.find(p => p.role === 'ruling');
    if (playerId && rulingPlayer && playerId !== rulingPlayer.id) {
      return; // Wrong player trying to advance ruling phase
    }

    // Mark ruling player as acted
    if (playerId) {
      if (!gameState.turnActedThisTurn) gameState.turnActedThisTurn = {};
      gameState.turnActedThisTurn[playerId] = true;
    }

    gameState.pendingPolicyChanges = [];

    // Advance ruling → opposition, accounting for bill_voting being conditionally skipped
    // advancePhase(ruling) may go to bill_voting OR directly to resolution (if no active bills)
    advancePhase(gameState); // -> bill_voting or resolution
    if ((gameState.phase as string) === 'bill_voting') {
      advancePhase(gameState); // bill_voting -> resolution
    }
    recalculate(gameState);
    advancePhase(gameState); // resolution -> opposition
    addLogEntry(gameState, 'Opposition phase.', 'info');
    broadcastState();
  } else if (gameState.phase === 'opposition') {
    // Only the opposition player can end the opposition phase
    const oppPlayer = gameState.players.find(p => p.role === 'opposition');
    if (playerId && oppPlayer && playerId !== oppPlayer.id) {
      return; // Wrong player trying to advance opposition phase
    }

    // Mark opposition player as acted (passed without actions)
    if (playerId) {
      if (!gameState.turnActedThisTurn) gameState.turnActedThisTurn = {};
      gameState.turnActedThisTurn[playerId] = true;
    }

    gameState.pendingOppositionActions = [];
    recalculate(gameState);

    // Bot parties propose bills (20% chance each)
    proposeBotBills(gameState);

    // No auto-vote — bills are voted on manually via startLiveVote + finalizeLiveVote

    // Reset turn tracking for next turn
    gameState.turnActedThisTurn = {};

    advancePhase(gameState);
    addLogEntry(gameState, `📊 Ruling Approval: ${gameState.rulingApproval}%`, 'info');
    broadcastState();
  } else if (gameState.phase === 'events') {
    // Only the ruling player advances the events phase
    const eventRuler = gameState.players.find(p => p.role === 'ruling');
    if (playerId && eventRuler && playerId !== eventRuler.id) {
      return; // Wrong player trying to advance events phase
    }

    gameState.currentEvent = null;

    // Check for dilemma
    const dilemma = rollForDilemma(gameState.turn);
    if (dilemma) {
      gameState.activeDilemma = {
        dilemmaId: dilemma.id,
        startedAt: Date.now(),
        resolved: false,
        chosenOption: null,
      };
      gameState.phase = 'dilemma';
      addLogEntry(gameState, `⚖️ Dilemma: ${dilemma.title}`, 'dilemma');
      addNewsItem(gameState, `Dilemma: ${dilemma.title}`, 'dilemma');
    } else {
      advancePhase(gameState);
    }
    broadcastState();
  } else if (gameState.phase === 'government_formation') {
    advancePhase(gameState); // -> events

    const event = rollForEvent();
    if (event) {
      gameState.currentEvent = event;
      gameState.activeEffects.push({
        type: 'event',
        id: event.id,
        turnsRemaining: event.duration,
        data: { effects: event.effects, approvalImpact: event.approvalImpact },
      });
      addLogEntry(gameState, `📰 Event: ${event.name}`, 'event');
    }

    broadcastState();
  } else if (gameState.phase === 'campaigning') {
    // Campaign phase — track who ended their turn, advance when both ready
    if (playerId) {
      // Require at least 1 campaign promise total before you can end any campaign turn
      const totalPledges = (gameState.pledges ?? []).filter(
        p => p.playerId === playerId
      ).length;
      if (totalPledges < 1) {
        const player = gameState.players.find(p => p.id === playerId);
        addLogEntry(gameState, `⚠️ ${player?.party.partyName ?? playerId} must make at least 1 campaign promise before ending turn. Voters need to know what you stand for!`, 'info');
        broadcastState();
        return;
      }

      if (!gameState.campaignActedThisTurn) gameState.campaignActedThisTurn = {};
      gameState.campaignActedThisTurn[playerId] = true;

      const allActed = gameState.players.every(p => gameState!.campaignActedThisTurn[p.id]);
      if (!allActed) {
        const player = gameState.players.find(p => p.id === playerId);
        addLogEntry(gameState, `${player?.party.partyName ?? playerId} passes. Waiting for opponent...`, 'info');
        broadcastState();
        return;
      }
    }

    // Both players ready (or forced advance) — move to polling
    gameState.campaignActedThisTurn = {};
    recalculate(gameState);
    advancePhase(gameState); // -> polling
    addLogEntry(gameState, `📊 Campaign standings update`, 'info');
    broadcastState();
  } else if (gameState.phase === 'debate') {
    // Debate resolved (or skipped) — proceed to election
    gameState.phase = 'polling'; // Reset to polling so election logic fires
    gameState.turnsUntilElection = 0;
    handleEndTurnPhase(playerId); // This will now run the election since debate exists
    return;
  } else if (gameState.phase === 'bill_voting') {
    // Skip through to resolution → opposition. Bills stay pending for next turn.
    advancePhase(gameState); // -> resolution
    recalculate(gameState);
    advancePhase(gameState); // -> opposition
    addLogEntry(gameState, 'Opposition phase.', 'info');
    broadcastState();
  }
}

export function getGameState(): GameState | null {
  return gameState ? { ...gameState } : null;
}

export function cleanupGame() {
  gameState = null;
  onStateChange = null;
  aiPersonality = null;
  aiScheduled = false;
  if (aiTurnTimer) {
    clearTimeout(aiTurnTimer);
    aiTurnTimer = null;
  }
  clearPersistedState();
  // Reset module-level trackers so new games get fresh state
  resetDilemmaTracker();
  resetEventCounter();
}
