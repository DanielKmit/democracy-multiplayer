'use client';

import {
  GameState,
  PolicyChange,
  OppositionAction,
  Player,
  PartyConfig,
  MinistryId,
  PARTY_COLORS,
} from './engine/types';
import {
  createInitialGameState,
  computeSimulation,
  computeVoterSatisfaction,
  computeApprovalRating,
  computePoliticalCapital,
  computeRegionalSatisfaction,
  applyPolicyChanges,
  applyOppositionActions,
  advancePhase,
  addLogEntry,
  addNewsItem,
  runElection,
  tickActiveEffects,
} from './engine/simulation';
import { rollForEvent } from './engine/events';
import { calculateBudget } from './engine/budget';
import { createInitialParliament, allocateSeats } from './engine/parliament';
import { checkAssassination, updateExtremism } from './engine/extremism';
import { rollForDilemma, getDilemmaById } from './engine/dilemmas';
import { getSituationById } from './engine/situations';
import { sendMessage } from './peer';

let gameState: GameState | null = null;
let onStateChange: ((state: GameState) => void) | null = null;

function recalculate(state: GameState) {
  state.simulation = computeSimulation(state.policies, state.activeEffects);
  state.budget = calculateBudget(state.policies, state.simulation, state.budget.debtToGdp);
  state.voterSatisfaction = computeVoterSatisfaction(state.policies, state.simulation, state.activeEffects);
  state.approvalRating = computeApprovalRating(state.voterSatisfaction, state.activeEffects);
  state.oppositionVoteShare = 100 - state.approvalRating;

  if (state.players.length >= 2) {
    state.regionalSatisfaction = computeRegionalSatisfaction(
      state.policies, state.voterSatisfaction, state.players
    );
  }

  // Apply situation effects
  for (const activeSit of state.activeSituations) {
    const sitDef = getSituationById(activeSit.id);
    if (sitDef) {
      for (const [key, val] of Object.entries(sitDef.effects)) {
        const k = key as keyof typeof state.simulation;
        if (state.simulation[k] !== undefined) {
          (state.simulation as unknown as Record<string, number>)[k] += val * 0.5; // Half effect per turn
        }
      }
    }
  }

  if (state.budget.debtToGdp > 200) {
    addLogEntry(state, '⚠️ ECONOMIC CRISIS: Debt exceeds 200% GDP!', 'event');
  } else if (state.budget.creditDowngrade) {
    addLogEntry(state, '⚠️ Credit downgrade: Debt exceeds 150% GDP', 'event');
  }
}

function broadcastState() {
  if (!gameState) return;
  sendMessage({ type: 'state', state: gameState });
  if (onStateChange) onStateChange({ ...gameState });
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
        player.party = config;
        player.name = config.leaderName;
        addLogEntry(gameState, `${config.partyName} (${config.leaderName}) ready`, 'info');
        addNewsItem(gameState, `${config.partyName} launches with manifesto: ${config.manifesto.join(', ')}`, 'general');

        // Check if both players have submitted
        const allReady = gameState.players.every(p => p.party.partyName !== 'Default Party' && p.party.partyName !== 'Opposition');
        if (allReady) {
          // Initialize parliament
          gameState.parliament = createInitialParliament(gameState.players);
          gameState.regionalSatisfaction = computeRegionalSatisfaction(
            gameState.policies, gameState.voterSatisfaction, gameState.players
          );

          gameState.turnsUntilElection = 8;
          gameState.phase = 'events';

          // Roll first event
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
          }

          for (const p of gameState.players) {
            p.politicalCapital = p.role === 'ruling' ? 6 : 4;
          }
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
      const ruling = gameState.players.find(p => p.role === 'ruling');
      if (!ruling || ruling.id !== playerId) return;

      const option = payload as 'a' | 'b';
      const dilemma = getDilemmaById(gameState.activeDilemma.dilemmaId);
      if (!dilemma) return;

      gameState.activeDilemma.resolved = true;
      gameState.activeDilemma.chosenOption = option;

      const chosen = option === 'a' ? dilemma.optionA : dilemma.optionB;

      // Apply effects
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

      addLogEntry(gameState, `Dilemma resolved: "${chosen.label}"`, 'dilemma');
      addNewsItem(gameState, `Government decides: ${chosen.label} on "${dilemma.title}"`, 'dilemma');

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

      advancePhase(gameState); // -> resolution
      recalculate(gameState);
      addLogEntry(gameState, 'Policy effects propagated.', 'info');
      advancePhase(gameState); // -> opposition
      addLogEntry(gameState, 'Opposition phase', 'info');
      broadcastState();
      break;
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

      advancePhase(gameState); // -> polling
      addLogEntry(gameState, `📊 Approval: ${gameState.approvalRating}%`, 'info');
      broadcastState();
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

    case 'endTurnPhase': {
      handleEndTurnPhase();
      break;
    }
  }
}

function handleEndTurnPhase() {
  if (!gameState) return;

  if (gameState.phase === 'polling') {
    if (gameState.turnsUntilElection <= 0) {
      advancePhase(gameState); // -> election

      const campaignBonuses: Record<string, number> = {};
      for (const effect of gameState.activeEffects) {
        if (effect.data.type === 'campaign' && effect.data.groupId) {
          const groupId = effect.data.groupId as string;
          campaignBonuses[groupId] = (campaignBonuses[groupId] ?? 0) + (effect.data.bonus as number);
        }
      }

      const result = runElection(
        gameState.regionalSatisfaction,
        gameState.players,
        gameState.turn,
        gameState.activeEffects,
        campaignBonuses
      );
      gameState.electionHistory.push(result);

      // Update parliament seats
      const regionVoteShares: Record<string, Record<string, number>> = {};
      for (const region of Object.keys(result.voteShares)) {
        regionVoteShares[region] = result.voteShares[region];
      }
      gameState.parliament = allocateSeats(regionVoteShares, gameState.players);

      addLogEntry(gameState, `🗳️ ELECTION: ${JSON.stringify(result.totalSeats)}`, 'election');
      addNewsItem(gameState, `Election results: ${gameState.players.map(p => `${p.party.partyName}: ${result.totalSeats[p.id] ?? 0} seats`).join(' vs ')}`, 'election');

      if (result.swapped) {
        for (const p of gameState.players) {
          if (p.role === 'ruling') {
            p.role = 'opposition';
          } else {
            p.role = 'ruling';
          }
        }
        const winner = gameState.players.find(p => p.role === 'ruling');
        if (winner) winner.termsWon++;
        addLogEntry(gameState, `🔄 Power changes hands! ${winner?.party.partyName} now governs!`, 'election');
        addNewsItem(gameState, `New government: ${winner?.party.partyName} takes power!`, 'election');
      } else {
        const winner = gameState.players.find(p => p.role === 'ruling');
        if (winner) winner.termsWon++;
        addLogEntry(gameState, `${winner?.party.partyName} retains power!`, 'election');
        addNewsItem(gameState, `${winner?.party.partyName} wins re-election!`, 'election');
      }

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
    advancePhase(gameState);

    if ((gameState.phase as string) !== 'game_over') {
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

      for (const p of gameState.players) {
        p.politicalCapital = p.role === 'ruling' ? 6 : 4;
      }

      // Reset cabinet for new government if roles swapped
      const lastElection = gameState.electionHistory[gameState.electionHistory.length - 1];
      if (lastElection?.swapped) {
        for (const key of Object.keys(gameState.cabinet.ministers)) {
          gameState.cabinet.ministers[key as MinistryId] = null;
        }
      }
    }

    broadcastState();
  } else if (gameState.phase === 'ruling') {
    gameState.pendingPolicyChanges = [];
    advancePhase(gameState);
    recalculate(gameState);
    advancePhase(gameState);
    addLogEntry(gameState, 'Ruling party passed. Opposition phase.', 'info');
    broadcastState();
  } else if (gameState.phase === 'opposition') {
    gameState.pendingOppositionActions = [];
    recalculate(gameState);
    advancePhase(gameState);
    addLogEntry(gameState, `📊 Approval: ${gameState.approvalRating}%`, 'info');
    broadcastState();
  } else if (gameState.phase === 'events') {
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
    }

    broadcastState();
  }
}

export function getGameState(): GameState | null {
  return gameState ? { ...gameState } : null;
}

export function cleanupGame() {
  gameState = null;
  onStateChange = null;
}
