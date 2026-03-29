'use client';

import {
  GameState,
  PolicyChange,
  OppositionAction,
  Player,
  PartyConfig,
  MinistryId,
  Bill,
  PARTY_COLORS,
} from './engine/types';
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
} from './engine/simulation';
import { POLICY_MAP } from './engine/policies';
import { rollForEvent } from './engine/events';
import { calculateBudget } from './engine/budget';
import { createInitialParliament, allocateSeats, voteBill } from './engine/parliament';
import { checkAssassination, updateExtremism } from './engine/extremism';
import { rollForDilemma, getDilemmaById } from './engine/dilemmas';
import { getSituationById } from './engine/situations';
import { sendMessage } from './peer';

let gameState: GameState | null = null;
let onStateChange: ((state: GameState) => void) | null = null;

function recalculate(state: GameState) {
  state.simulation = computeSimulation(state.policies, state.activeEffects);
  state.budget = calculateBudget(state.policies, state.simulation, state.budget.debtTotal ?? 200);

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
    );

    // Per-party approval ratings
    state.approvalRating = computeAllApprovalRatings(state.voterSatisfaction, state.activeEffects);

    // Apply event approval impact to ruling party only
    const ruling = state.players.find(p => p.role === 'ruling');
    if (ruling) {
      for (const effect of state.activeEffects) {
        if (effect.type === 'event' && effect.data.approvalImpact) {
          state.approvalRating[ruling.id] = Math.max(0, Math.min(100,
            (state.approvalRating[ruling.id] ?? 50) + (effect.data.approvalImpact as number)
          ));
        }
      }
      state.rulingApproval = state.approvalRating[ruling.id] ?? 50;
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
    state.voteShares = computeVoteShares(state.voterSatisfaction);
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
      const diff = Math.abs(billData.proposedValue - currentValue);
      const cost = player.role === 'ruling' ? Math.ceil(diff / 10) : Math.ceil(diff / 10) + 1; // Opposition pays +1 PC

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
        status: 'voting',
        votesFor: 0,
        votesAgainst: 0,
        isEmergency: false,
      };

      // Immediately run parliament vote
      const votedBill = voteBill(
        bill,
        gameState.parliament,
        player.id,
        gameState.players,
        gameState.botParties,
        gameState.policies,
      );

      gameState.activeBills.push(votedBill);

      // Generate vote summary
      const voteDetails = Object.entries(votedBill.partyVotes ?? {}).map(([pid, v]) => {
        const p = gameState!.players.find(pl => pl.id === pid);
        const bot = gameState!.botParties.find(b => b.id === pid);
        const name = p?.party.partyName ?? bot?.name ?? pid;
        return `${name}: ${v.yes}Y/${v.no}N`;
      }).join(', ');

      if (votedBill.status === 'passed') {
        // Apply the policy change
        gameState.policies[votedBill.policyId] = votedBill.proposedValue;
        addLogEntry(gameState, `✅ ${votedBill.title} PASSED (${votedBill.votesFor}-${votedBill.votesAgainst})`, 'ruling');
        addNewsItem(gameState, `📋 ${votedBill.title} passed! ${voteDetails}`, 'bill');
      } else {
        addLogEntry(gameState, `❌ ${votedBill.title} FAILED (${votedBill.votesFor}-${votedBill.votesAgainst})`, 'ruling');
        addNewsItem(gameState, `📋 ${votedBill.title} rejected. ${voteDetails}`, 'bill');
      }

      recalculate(gameState);
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
      addLogEntry(gameState, `📊 Ruling Approval: ${gameState.rulingApproval}%`, 'info');
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
              const bonuses = gameState.campaignBonuses[player.id] ?? {};
              bonuses[`promise_${action.promisePolicyId}`] = (bonuses[`promise_${action.promisePolicyId}`] ?? 0) + 5;
              gameState.campaignBonuses[player.id] = bonuses;
              addLogEntry(gameState, `📢 ${player.party.partyName} promises to ${action.promiseDirection} ${action.promisePolicyId}`, 'info');
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
            // Taking a position on an issue
            addLogEntry(gameState, `📢 ${player.party.partyName} takes a public stance`, 'info');
            break;
          }
        }
      }

      player.politicalCapital -= totalCost;

      // Check if both players have submitted (or this is the only action)
      // For simplicity, campaign progresses after each player submits
      gameState.pendingCampaignActions = [];
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

      // Evaluate the offer based on ideology alignment
      const econDiff = Math.abs(player.party.economicAxis - botParty.economicAxis);
      const socialDiff = Math.abs(player.party.socialAxis - botParty.socialAxis);
      const ideologyAlignment = (200 - econDiff - socialDiff) / 200; // 0 to 1

      // Base acceptance chance from ideology
      let acceptChance = ideologyAlignment * 0.7 + 0.15; // 15% to 85%

      // Bonus for policy promises that align with bot party preferences
      for (const promise of offer.promises) {
        const pref = botParty.policyPreferences[promise.policyId];
        if (pref !== undefined) {
          if ((promise.direction === 'increase' && pref > 60) ||
              (promise.direction === 'decrease' && pref < 40)) {
            acceptChance += 0.1;
          }
        }
      }

      acceptChance = Math.min(0.95, Math.max(0.05, acceptChance));
      const accepted = Math.random() < acceptChance;

      if (accepted) {
        gameState.coalitionPartners.push({
          botPartyId: botParty.id,
          seats: botParty.seats,
          promises: offer.promises,
          satisfaction: 80,
          turnsInCoalition: 0,
        });
        addLogEntry(gameState, `🤝 ${botParty.name} joins ${player.party.partyName}'s coalition!`, 'election');
        addNewsItem(gameState, `Coalition deal: ${botParty.name} joins ${player.party.partyName}`, 'election');
      } else {
        addLogEntry(gameState, `❌ ${botParty.name} rejects coalition offer from ${player.party.partyName}`, 'election');
        addNewsItem(gameState, `${botParty.name} rejects ${player.party.partyName}'s coalition overture`, 'election');
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

      // After first election, end pre-election phase
      gameState.isPreElection = false;

      // Reset campaign bonuses
      gameState.campaignBonuses = {};

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
      }
    }

    advancePhase(gameState); // -> government_formation

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
    addLogEntry(gameState, `📊 Ruling Approval: ${gameState.rulingApproval}%`, 'info');
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
    // Campaign phase — move to polling
    recalculate(gameState);
    advancePhase(gameState); // -> polling
    addLogEntry(gameState, `📊 Campaign standings update`, 'info');
    broadcastState();
  } else if (gameState.phase === 'bill_voting') {
    // Bills have been voted on, proceed
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
