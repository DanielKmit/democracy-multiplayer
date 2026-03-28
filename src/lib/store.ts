import { create } from 'zustand';
import { GameState, PolicyChange, OppositionAction } from './engine/types';

interface GameStore {
  // Connection
  playerId: string | null;
  playerName: string;
  roomId: string | null;
  connected: boolean;

  // Game
  gameState: GameState | null;
  error: string | null;

  // Pending changes (client-side before submit)
  pendingPolicyChanges: PolicyChange[];
  pendingOppositionActions: OppositionAction[];

  // Actions
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setRoomId: (id: string) => void;
  setConnected: (c: boolean) => void;
  setGameState: (state: GameState) => void;
  setError: (error: string | null) => void;
  addPolicyChange: (change: PolicyChange) => void;
  removePolicyChange: (policyId: string) => void;
  clearPolicyChanges: () => void;
  addOppositionAction: (action: OppositionAction) => void;
  removeOppositionAction: (index: number) => void;
  clearOppositionActions: () => void;
  getPendingPolicyCost: () => number;
  getPendingOppositionCost: () => number;
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerId: null,
  playerName: '',
  roomId: null,
  connected: false,
  gameState: null,
  error: null,
  pendingPolicyChanges: [],
  pendingOppositionActions: [],

  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setRoomId: (id) => set({ roomId: id }),
  setConnected: (c) => set({ connected: c }),
  setGameState: (state) => set({ gameState: state }),
  setError: (error) => set({ error }),

  addPolicyChange: (change) => set((s) => {
    const existing = s.pendingPolicyChanges.filter(c => c.policyId !== change.policyId);
    // Only add if value actually changed
    if (change.newValue !== change.oldValue) {
      return { pendingPolicyChanges: [...existing, change] };
    }
    return { pendingPolicyChanges: existing };
  }),

  removePolicyChange: (policyId) => set((s) => ({
    pendingPolicyChanges: s.pendingPolicyChanges.filter(c => c.policyId !== policyId),
  })),

  clearPolicyChanges: () => set({ pendingPolicyChanges: [] }),

  addOppositionAction: (action) => set((s) => ({
    pendingOppositionActions: [...s.pendingOppositionActions, action],
  })),

  removeOppositionAction: (index) => set((s) => ({
    pendingOppositionActions: s.pendingOppositionActions.filter((_, i) => i !== index),
  })),

  clearOppositionActions: () => set({ pendingOppositionActions: [] }),

  getPendingPolicyCost: () => {
    const changes = get().pendingPolicyChanges;
    return changes.reduce((total, c) => total + Math.ceil(Math.abs(c.newValue - c.oldValue) / 10), 0);
  },

  getPendingOppositionCost: () => {
    const actions = get().pendingOppositionActions;
    return actions.reduce((total, a) => total + a.cost, 0);
  },
}));
