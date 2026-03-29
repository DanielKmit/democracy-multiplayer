import { create } from 'zustand';
import { GameState, PolicyChange, OppositionAction, PartyConfig, MinistryId, CampaignAction, CoalitionOffer } from './engine/types';

export type ConnectionMode = 'none' | 'host' | 'client' | 'ai_host';

interface GameStore {
  // Connection
  playerId: string | null;
  playerName: string;
  roomId: string | null;
  connected: boolean;
  mode: ConnectionMode;

  // Party creation
  partyConfig: PartyConfig | null;

  // Game
  gameState: GameState | null;
  error: string | null;

  // Pending changes
  pendingPolicyChanges: PolicyChange[];
  pendingOppositionActions: OppositionAction[];

  // UI state
  centerView: 'bills' | 'policy_web' | 'map';
  selectedNode: string | null;
  detailPanelOpen: boolean;
  detailPanelNodeId: string | null;

  // Actions
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setRoomId: (id: string) => void;
  setConnected: (c: boolean) => void;
  setMode: (mode: ConnectionMode) => void;
  setPartyConfig: (config: PartyConfig) => void;
  setGameState: (state: GameState) => void;
  setError: (error: string | null) => void;
  setCenterView: (view: 'bills' | 'policy_web' | 'map') => void;
  setSelectedNode: (id: string | null) => void;
  setDetailPanel: (nodeId: string | null) => void;
  addPolicyChange: (change: PolicyChange) => void;
  removePolicyChange: (policyId: string) => void;
  clearPolicyChanges: () => void;
  addOppositionAction: (action: OppositionAction) => void;
  removeOppositionAction: (index: number) => void;
  clearOppositionActions: () => void;
  getPendingPolicyCost: () => number;
  getPendingOppositionCost: () => number;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerId: null,
  playerName: '',
  roomId: null,
  connected: false,
  mode: 'none',
  partyConfig: null,
  gameState: null,
  error: null,
  pendingPolicyChanges: [],
  pendingOppositionActions: [],
  centerView: 'bills',
  selectedNode: null,
  detailPanelOpen: false,
  detailPanelNodeId: null,

  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setRoomId: (id) => set({ roomId: id }),
  setConnected: (c) => set({ connected: c }),
  setMode: (mode) => set({ mode }),
  setPartyConfig: (config) => set({ partyConfig: config }),
  setGameState: (state) => set({ gameState: state }),
  setError: (error) => set({ error }),
  setCenterView: (view) => set({ centerView: view }),
  setSelectedNode: (id) => set({ selectedNode: id }),
  setDetailPanel: (nodeId) => set({ detailPanelOpen: nodeId !== null, detailPanelNodeId: nodeId }),

  addPolicyChange: (change) => set((s) => {
    const existing = s.pendingPolicyChanges.filter(c => c.policyId !== change.policyId);
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

  reset: () => set({
    playerId: null,
    playerName: '',
    roomId: null,
    connected: false,
    mode: 'none',
    partyConfig: null,
    gameState: null,
    error: null,
    pendingPolicyChanges: [],
    pendingOppositionActions: [],
    centerView: 'bills',
    selectedNode: null,
    detailPanelOpen: false,
    detailPanelNodeId: null,
  }),
}));
