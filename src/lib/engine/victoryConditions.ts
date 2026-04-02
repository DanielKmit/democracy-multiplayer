// ============================================
// Victory Conditions — Multiple Paths to Win
// ============================================

import { GameState } from './types';

export type VictoryType =
  | 'electoral'        // Default: win 3 elections
  | 'economic'         // GDP growth > 15% for 5 consecutive turns
  | 'approval'         // Approval > 80% for 8 turns
  | 'parliamentary';   // 75+ seats for 2 elections

export interface VictoryCondition {
  type: VictoryType;
  name: string;
  description: string;
  icon: string;
  checkVictory: (state: GameState, playerId: string) => boolean;
  getProgress: (state: GameState, playerId: string) => { current: number; required: number; label: string };
}

export const VICTORY_CONDITIONS: VictoryCondition[] = [
  {
    type: 'electoral',
    name: 'Electoral Dominance',
    description: 'Win 3 elections to prove lasting voter support',
    icon: '🗳️',
    checkVictory: (state, playerId) => {
      const player = state.players.find(p => p.id === playerId);
      return (player?.termsWon ?? 0) >= 3;
    },
    getProgress: (state, playerId) => {
      const player = state.players.find(p => p.id === playerId);
      return { current: player?.termsWon ?? 0, required: 3, label: 'Elections Won' };
    },
  },
  {
    type: 'economic',
    name: 'Economic Miracle',
    description: 'Achieve GDP > 4% AND unemployment < 6% for 4 consecutive turns while ruling',
    icon: '📈',
    checkVictory: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return (tracker?.consecutiveHighGDP ?? 0) >= 4;
    },
    getProgress: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return {
        current: tracker?.consecutiveHighGDP ?? 0,
        required: 4,
        label: 'Consecutive Strong Economy Turns',
      };
    },
  },
  {
    type: 'approval',
    name: 'People\'s Champion',
    description: 'Maintain approval above 65% for 6 consecutive turns while ruling',
    icon: '❤️',
    checkVictory: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return (tracker?.consecutiveHighApproval ?? 0) >= 6;
    },
    getProgress: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return {
        current: tracker?.consecutiveHighApproval ?? 0,
        required: 6,
        label: 'Consecutive High Approval Turns',
      };
    },
  },
  {
    type: 'parliamentary',
    name: 'Total Dominance',
    description: 'Hold 65+ seats AND lead in 5+ regions in a single election',
    icon: '🏛️',
    checkVictory: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return (tracker?.consecutiveSupermajority ?? 0) >= 1;
    },
    getProgress: (state, playerId) => {
      const seats = state.parliament.seatsByParty[playerId] ?? 0;
      // Count regions where this player leads
      let leadingRegions = 0;
      for (const regionId of Object.keys(state.regionalSatisfaction)) {
        const mySat = state.regionalSatisfaction[regionId]?.[playerId] ?? 0;
        const otherMax = Math.max(...state.players.filter(p => p.id !== playerId).map(p => state.regionalSatisfaction[regionId]?.[p.id] ?? 0));
        if (mySat > otherMax) leadingRegions++;
      }
      const progress = (seats >= 65 && leadingRegions >= 5) ? 1 : 0;
      return {
        current: progress,
        required: 1,
        label: `${seats}/65 seats, ${leadingRegions}/5 regions`,
      };
    },
  },
];

export interface VictoryTracker {
  consecutiveHighGDP: number;
  consecutiveHighApproval: number;
  consecutiveSupermajority: number;
}

export function createVictoryTracker(): VictoryTracker {
  return {
    consecutiveHighGDP: 0,
    consecutiveHighApproval: 0,
    consecutiveSupermajority: 0,
  };
}

/**
 * Update trackers each turn (called at end of turn).
 */
export function updateVictoryTrackers(
  state: GameState,
): void {
  if (!state.victoryTrackers) return;

  for (const player of state.players) {
    if (!state.victoryTrackers[player.id]) {
      state.victoryTrackers[player.id] = createVictoryTracker();
    }
    const tracker = state.victoryTrackers[player.id];

    // Economic: GDP > 4% AND unemployment < 6% while ruling
    if (player.role === 'ruling' && state.simulation.gdpGrowth > 4 && state.simulation.unemployment < 6) {
      tracker.consecutiveHighGDP++;
    } else {
      tracker.consecutiveHighGDP = 0;
    }

    // Approval: > 65% while ruling
    const approval = state.approvalRating[player.id] ?? 0;
    if (player.role === 'ruling' && approval > 65) {
      tracker.consecutiveHighApproval++;
    } else {
      tracker.consecutiveHighApproval = 0;
    }
  }
}

/**
 * Update supermajority tracker after election.
 */
export function updateSupermajorityTracker(
  state: GameState,
): void {
  if (!state.victoryTrackers) return;

  for (const player of state.players) {
    if (!state.victoryTrackers[player.id]) {
      state.victoryTrackers[player.id] = createVictoryTracker();
    }
    const tracker = state.victoryTrackers[player.id];
    const seats = state.parliament.seatsByParty[player.id] ?? 0;

    // Total Dominance: 65+ seats AND leading in 5+ regions
    let leadingRegions = 0;
    if (state.regionalSatisfaction) {
      for (const regionId of Object.keys(state.regionalSatisfaction)) {
        const mySat = state.regionalSatisfaction[regionId]?.[player.id] ?? 0;
        const otherMax = Math.max(0, ...state.players.filter(p => p.id !== player.id).map(p => state.regionalSatisfaction[regionId]?.[p.id] ?? 0));
        if (mySat > otherMax) leadingRegions++;
      }
    }

    if (seats >= 65 && leadingRegions >= 5) {
      tracker.consecutiveSupermajority++;
    } else {
      tracker.consecutiveSupermajority = 0;
    }
  }
}

/**
 * Check if any player has achieved victory.
 */
export function checkVictory(
  state: GameState,
  victoryType: VictoryType,
): { winner: string | null; condition: VictoryCondition | null } {
  const condition = VICTORY_CONDITIONS.find(vc => vc.type === victoryType);
  if (!condition) return { winner: null, condition: null };

  for (const player of state.players) {
    if (condition.checkVictory(state, player.id)) {
      return { winner: player.id, condition };
    }
  }

  return { winner: null, condition: null };
}

export function getVictoryCondition(type: VictoryType): VictoryCondition | undefined {
  return VICTORY_CONDITIONS.find(vc => vc.type === type);
}
