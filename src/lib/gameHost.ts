'use client';

import {
  GameState,
  PolicyChange,
  OppositionAction,
  Player,
} from './engine/types';
import {
  createInitialGameState,
  computeSimulation,
  computeVoterSatisfaction,
  computeApprovalRating,
  computePoliticalCapital,
  applyPolicyChanges,
  applyOppositionActions,
  advancePhase,
  addLogEntry,
  runElection,
} from './engine/simulation';
import { rollForEvent } from './engine/events';
import { calculateBudget } from './engine/budget';
import { sendMessage, PeerMessage } from './peer';

let gameState: GameState | null = null;
let onStateChange: ((state: GameState) => void) | null = null;

function recalculate(state: GameState) {
  state.simulation = computeSimulation(state.policies, state.activeEffects);
  state.budget = calculateBudget(state.policies, state.simulation, state.budget.debtToGdp);
  state.voterSatisfaction = computeVoterSatisfaction(state.policies, state.simulation, state.activeEffects);
  state.approvalRating = computeApprovalRating(state.voterSatisfaction, state.activeEffects);
  state.oppositionVoteShare = 100 - state.approvalRating;

  if (state.budget.debtToGdp > 200) {
    addLogEntry(state, '⚠️ ECONOMIC CRISIS: Debt exceeds 200% GDP! Forced austerity!', 'event');
  } else if (state.budget.creditDowngrade) {
    addLogEntry(state, '⚠️ Credit downgrade: Debt exceeds 150% GDP', 'event');
  }
}

function broadcastState() {
  if (!gameState) return;
  // Send to client peer
  sendMessage({ type: 'state', state: gameState });
  // Update local (host) UI
  if (onStateChange) onStateChange({ ...gameState });
}

export function setOnStateChange(handler: (state: GameState) => void) {
  onStateChange = handler;
}

export function initGame(roomCode: string, hostPlayerName: string): GameState {
  gameState = createInitialGameState(roomCode);
  const player: Player = {
    id: 'host',
    name: hostPlayerName,
    role: 'ruling',
    politicalCapital: 6,
    termsWon: 0,
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
  };
  gameState.players.push(player);
  addLogEntry(gameState, `${player.name} joined the game`, 'info');

  gameState.turnsUntilElection = 8;

  const event = rollForEvent();
  if (event) {
    gameState.currentEvent = event;
    gameState.activeEffects.push({
      type: 'event',
      id: event.id,
      turnsRemaining: event.duration,
      data: { effects: event.effects, approvalImpact: event.approvalImpact },
    });
    addLogEntry(gameState, `📰 Event: ${event.name} — ${event.description}`, 'event');
  }

  gameState.phase = 'events';

  for (const p of gameState.players) {
    p.politicalCapital = p.role === 'ruling' ? 6 : 4;
  }

  broadcastState();
}

export function handleAction(playerId: string, action: string, payload?: unknown) {
  if (!gameState) return;

  switch (action) {
    case 'acknowledgeEvent': {
      if (gameState.phase !== 'events') return;
      gameState.currentEvent = null;
      advancePhase(gameState);
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
      for (const msg of log) addLogEntry(gameState, msg, 'ruling');

      advancePhase(gameState); // -> resolution
      recalculate(gameState);
      addLogEntry(gameState, 'Simulation updated. Policy effects propagated.', 'info');
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
      for (const msg of log) addLogEntry(gameState, msg, 'opposition');

      recalculate(gameState);
      advancePhase(gameState); // -> polling
      addLogEntry(gameState, `📊 Approval: ${gameState.approvalRating}% | Opposition: ${gameState.oppositionVoteShare}%`, 'info');
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

      const result = runElection(gameState.voterSatisfaction, gameState.activeEffects, gameState.turn, campaignBonuses);
      gameState.electionHistory.push(result);

      addLogEntry(gameState, `🗳️ ELECTION: Ruling ${result.rulingVoteShare}% vs Opposition ${result.oppositionVoteShare}%`, 'election');

      if (result.swapped) {
        for (const p of gameState.players) {
          if (p.role === 'ruling') {
            p.role = 'opposition';
            const other = gameState.players.find(other => other.id !== p.id && other.role === 'opposition');
            if (other) other.role = 'ruling';
            break;
          }
        }
        const winner = gameState.players.find(p => p.role === 'ruling');
        if (winner) winner.termsWon++;
        addLogEntry(gameState, `🔄 Roles swapped! ${winner?.name} is now in power!`, 'election');
      } else {
        const winner = gameState.players.find(p => p.role === 'ruling');
        if (winner) winner.termsWon++;
        addLogEntry(gameState, `${winner?.name} retains power!`, 'election');
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
      addLogEntry(gameState, `📰 Event: ${event.name} — ${event.description}`, 'event');
    } else {
      gameState.currentEvent = null;
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
        addLogEntry(gameState, `📰 Event: ${event.name} — ${event.description}`, 'event');
      }

      for (const p of gameState.players) {
        p.politicalCapital = p.role === 'ruling' ? 6 : 4;
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
    addLogEntry(gameState, `📊 Approval: ${gameState.approvalRating}% | Opposition: ${gameState.oppositionVoteShare}%`, 'info');
    broadcastState();
  } else if (gameState.phase === 'events') {
    gameState.currentEvent = null;
    advancePhase(gameState);
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
