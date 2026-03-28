import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketServer } from 'socket.io';
import {
  GameState,
  PolicyChange,
  OppositionAction,
  ClientToServerEvents,
  ServerToClientEvents,
  Player,
} from './src/lib/engine/types';
import {
  createInitialGameState,
  generateRoomId,
  computeSimulation,
  computeVoterSatisfaction,
  computeApprovalRating,
  computePoliticalCapital,
  applyPolicyChanges,
  applyOppositionActions,
  advancePhase,
  addLogEntry,
  runElection,
} from './src/lib/engine/simulation';
import { rollForEvent } from './src/lib/engine/events';
import { calculateBudget } from './src/lib/engine/budget';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// In-memory game rooms
const rooms = new Map<string, GameState>();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: { origin: '*' },
    path: '/api/socketio',
  });

  // Helper: broadcast game state to all players in a room
  function broadcastState(roomId: string) {
    const state = rooms.get(roomId);
    if (!state) return;
    io.to(roomId).emit('gameState', state);
  }

  // Helper: recalculate simulation
  function recalculate(state: GameState) {
    state.simulation = computeSimulation(state.policies, state.activeEffects);
    state.budget = calculateBudget(state.policies, state.simulation, state.budget.debtToGdp);
    state.voterSatisfaction = computeVoterSatisfaction(state.policies, state.simulation, state.activeEffects);
    state.approvalRating = computeApprovalRating(state.voterSatisfaction, state.activeEffects);
    state.oppositionVoteShare = 100 - state.approvalRating;

    // Debt crisis check
    if (state.budget.debtToGdp > 200) {
      addLogEntry(state, '⚠️ ECONOMIC CRISIS: Debt exceeds 200% GDP! Forced austerity!', 'event');
    } else if (state.budget.creditDowngrade) {
      addLogEntry(state, '⚠️ Credit downgrade: Debt exceeds 150% GDP', 'event');
    }
  }

  io.on('connection', (socket) => {
    let currentRoom: string | null = null;
    let playerId: string = socket.id;

    socket.on('createRoom', (playerName: string) => {
      const roomId = generateRoomId();
      const state = createInitialGameState(roomId);
      const player: Player = {
        id: playerId,
        name: playerName || 'Player 1',
        role: 'ruling',
        politicalCapital: 6,
        termsWon: 0,
      };
      state.players.push(player);
      rooms.set(roomId, state);

      socket.join(roomId);
      currentRoom = roomId;
      addLogEntry(state, `${player.name} created the game`, 'info');
      broadcastState(roomId);
    });

    socket.on('joinRoom', (roomId: string, playerName: string) => {
      const state = rooms.get(roomId);
      if (!state) {
        socket.emit('error', 'Room not found');
        return;
      }
      if (state.players.length >= 2) {
        socket.emit('error', 'Room is full');
        return;
      }

      const player: Player = {
        id: playerId,
        name: playerName || 'Player 2',
        role: 'opposition',
        politicalCapital: 4,
        termsWon: 0,
      };
      state.players.push(player);

      socket.join(roomId);
      currentRoom = roomId;

      addLogEntry(state, `${player.name} joined the game`, 'info');

      // Both players in — start the game
      state.turnsUntilElection = 8;

      // Roll for first event
      const event = rollForEvent();
      if (event) {
        state.currentEvent = event;
        state.activeEffects.push({
          type: 'event',
          id: event.id,
          turnsRemaining: event.duration,
          data: { effects: event.effects, approvalImpact: event.approvalImpact },
        });
        addLogEntry(state, `📰 Event: ${event.name} — ${event.description}`, 'event');
      }

      state.phase = 'events';

      // Give initial PC
      for (const p of state.players) {
        p.politicalCapital = p.role === 'ruling' ? 6 : 4;
      }

      broadcastState(roomId);
    });

    socket.on('acknowledgeEvent', () => {
      if (!currentRoom) return;
      const state = rooms.get(currentRoom);
      if (!state || state.phase !== 'events') return;

      state.currentEvent = null;
      advancePhase(state); // -> ruling
      addLogEntry(state, `Turn ${state.turn}: Ruling Party phase`, 'info');
      broadcastState(currentRoom);
    });

    socket.on('submitPolicyChanges', (changes: PolicyChange[]) => {
      if (!currentRoom) return;
      const state = rooms.get(currentRoom);
      if (!state || state.phase !== 'ruling') return;

      const player = state.players.find(p => p.id === playerId);
      if (!player || player.role !== 'ruling') {
        socket.emit('error', 'Not the ruling party');
        return;
      }

      state.pendingPolicyChanges = changes;
      const log = applyPolicyChanges(state, changes);
      for (const msg of log) {
        addLogEntry(state, msg, 'ruling');
      }

      // Move to resolution
      advancePhase(state); // -> resolution
      recalculate(state);
      addLogEntry(state, 'Simulation updated. Policy effects propagated.', 'info');

      // Auto-advance to opposition phase
      advancePhase(state); // -> opposition
      addLogEntry(state, 'Opposition phase', 'info');
      broadcastState(currentRoom);
    });

    socket.on('submitOppositionActions', (actions: OppositionAction[]) => {
      if (!currentRoom) return;
      const state = rooms.get(currentRoom);
      if (!state || state.phase !== 'opposition') return;

      const player = state.players.find(p => p.id === playerId);
      if (!player || player.role !== 'opposition') {
        socket.emit('error', 'Not the opposition');
        return;
      }

      state.pendingOppositionActions = actions;
      const log = applyOppositionActions(state, actions);
      for (const msg of log) {
        addLogEntry(state, msg, 'opposition');
      }

      // Recalculate after opposition actions
      recalculate(state);

      // Move to polling
      advancePhase(state); // -> polling
      addLogEntry(state, `📊 Approval: ${state.approvalRating}% | Opposition: ${state.oppositionVoteShare}%`, 'info');

      broadcastState(currentRoom);
    });

    socket.on('endTurnPhase', () => {
      if (!currentRoom) return;
      const state = rooms.get(currentRoom);
      if (!state) return;

      if (state.phase === 'polling') {
        // Check if election
        if (state.turnsUntilElection <= 0) {
          advancePhase(state); // -> election

          // Calculate campaign bonuses from active effects
          const campaignBonuses: Record<string, number> = {};
          for (const effect of state.activeEffects) {
            if (effect.data.type === 'campaign' && effect.data.groupId) {
              const groupId = effect.data.groupId as string;
              campaignBonuses[groupId] = (campaignBonuses[groupId] ?? 0) + (effect.data.bonus as number);
            }
          }

          const result = runElection(state.voterSatisfaction, state.activeEffects, state.turn, campaignBonuses);
          state.electionHistory.push(result);

          addLogEntry(state, `🗳️ ELECTION: Ruling ${result.rulingVoteShare}% vs Opposition ${result.oppositionVoteShare}%`, 'election');

          if (result.swapped) {
            // Swap roles
            for (const p of state.players) {
              if (p.role === 'ruling') {
                p.role = 'opposition';
                state.players.find(other => other.id !== p.id && other.role === 'opposition')!.role = 'ruling';
                break;
              }
            }
            // Update terms won
            const winner = state.players.find(p => p.role === 'ruling');
            if (winner) winner.termsWon++;
            addLogEntry(state, `🔄 Roles swapped! ${winner?.name} is now in power!`, 'election');
          } else {
            const winner = state.players.find(p => p.role === 'ruling');
            if (winner) winner.termsWon++;
            addLogEntry(state, `${winner?.name} retains power!`, 'election');
          }

          broadcastState(currentRoom);
          return;
        }

        // Normal turn end
        advancePhase(state); // -> new turn events

        // Roll for event
        const event = rollForEvent();
        if (event) {
          state.currentEvent = event;
          state.activeEffects.push({
            type: 'event',
            id: event.id,
            turnsRemaining: event.duration,
            data: { effects: event.effects, approvalImpact: event.approvalImpact },
          });
          addLogEntry(state, `📰 Event: ${event.name} — ${event.description}`, 'event');
        } else {
          state.currentEvent = null;
        }

        broadcastState(currentRoom);
      } else if (state.phase === 'election') {
        advancePhase(state); // -> game_over or new cycle

        if ((state.phase as string) !== 'game_over') {
          // Roll for event
          const event = rollForEvent();
          if (event) {
            state.currentEvent = event;
            state.activeEffects.push({
              type: 'event',
              id: event.id,
              turnsRemaining: event.duration,
              data: { effects: event.effects, approvalImpact: event.approvalImpact },
            });
            addLogEntry(state, `📰 Event: ${event.name} — ${event.description}`, 'event');
          }

          // Reset PC for new term
          for (const p of state.players) {
            p.politicalCapital = p.role === 'ruling' ? 6 : 4;
          }
        }

        broadcastState(currentRoom);
      } else if (state.phase === 'ruling') {
        // Pass turn with no changes
        state.pendingPolicyChanges = [];
        advancePhase(state); // -> resolution
        recalculate(state);
        advancePhase(state); // -> opposition
        addLogEntry(state, 'Ruling party passed. Opposition phase.', 'info');
        broadcastState(currentRoom);
      } else if (state.phase === 'opposition') {
        // Pass turn with no actions
        state.pendingOppositionActions = [];
        recalculate(state);
        advancePhase(state); // -> polling
        addLogEntry(state, `📊 Approval: ${state.approvalRating}% | Opposition: ${state.oppositionVoteShare}%`, 'info');
        broadcastState(currentRoom);
      } else if (state.phase === 'events') {
        state.currentEvent = null;
        advancePhase(state); // -> ruling
        broadcastState(currentRoom);
      }
    });

    socket.on('disconnect', () => {
      if (!currentRoom) return;
      const state = rooms.get(currentRoom);
      if (!state) return;

      state.players = state.players.filter(p => p.id !== playerId);
      io.to(currentRoom).emit('playerLeft', playerId);

      if (state.players.length === 0) {
        rooms.delete(currentRoom);
      } else {
        addLogEntry(state, 'Opponent disconnected', 'info');
        broadcastState(currentRoom);
      }
    });
  });

  const PORT = parseInt(process.env.PORT || '3000');
  server.listen(PORT, () => {
    console.log(`> Democracy Multiplayer running on http://localhost:${PORT}`);
  });
});
