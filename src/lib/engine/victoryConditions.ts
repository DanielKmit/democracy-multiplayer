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
    description: 'Achieve GDP growth above 5% for 5 consecutive turns while ruling',
    icon: '📈',
    checkVictory: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return (tracker?.consecutiveHighGDP ?? 0) >= 5;
    },
    getProgress: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return {
        current: tracker?.consecutiveHighGDP ?? 0,
        required: 5,
        label: 'Consecutive High GDP Turns',
      };
    },
  },
  {
    type: 'approval',
    name: 'People\'s Champion',
    description: 'Maintain approval above 70% for 8 consecutive turns while ruling',
    icon: '❤️',
    checkVictory: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return (tracker?.consecutiveHighApproval ?? 0) >= 8;
    },
    getProgress: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return {
        current: tracker?.consecutiveHighApproval ?? 0,
        required: 8,
        label: 'Consecutive High Approval Turns',
      };
    },
  },
  {
    type: 'parliamentary',
    name: 'Supermajority',
    description: 'Hold 75+ parliamentary seats across 2 consecutive elections',
    icon: '🏛️',
    checkVictory: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return (tracker?.consecutiveSupermajority ?? 0) >= 2;
    },
    getProgress: (state, playerId) => {
      const tracker = state.victoryTrackers?.[playerId];
      return {
        current: tracker?.consecutiveSupermajority ?? 0,
        required: 2,
        label: 'Consecutive Supermajority Elections',
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

    // Economic: GDP > 5% while ruling
    if (player.role === 'ruling' && state.simulation.gdpGrowth > 5) {
      tracker.consecutiveHighGDP++;
    } else {
      tracker.consecutiveHighGDP = 0;
    }

    // Approval: > 70% while ruling
    const approval = state.approvalRating[player.id] ?? 0;
    if (player.role === 'ruling' && approval > 70) {
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

    if (seats >= 75) {
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
