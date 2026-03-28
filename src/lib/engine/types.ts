// ============================================
// Democracy Multiplayer — Core Types
// ============================================

export type PlayerRole = 'ruling' | 'opposition';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  politicalCapital: number;
  termsWon: number;
}

// ---- Policies ----

export type PolicyCategory = 'economy' | 'welfare' | 'society' | 'environment' | 'security' | 'infrastructure';

export interface PolicyDefinition {
  id: string;
  name: string;
  category: PolicyCategory;
  description: string;
  defaultValue: number;
  // Effects on simulation variables (per point of policy value)
  effects: Partial<Record<SimVarKey, number>>;
  // Budget cost per point (positive = spending, negative = revenue)
  budgetCostPerPoint: number;
}

// ---- Simulation Variables ----

export type SimVarKey =
  | 'gdpGrowth'
  | 'unemployment'
  | 'inflation'
  | 'crime'
  | 'pollution'
  | 'equality'
  | 'healthIndex'
  | 'educationIndex'
  | 'freedomIndex'
  | 'nationalSecurity';

export interface SimulationState {
  gdpGrowth: number;       // -5 to +8
  unemployment: number;    // 0-30
  inflation: number;       // 0-20
  crime: number;           // 0-100
  pollution: number;       // 0-100
  equality: number;        // 0-100
  healthIndex: number;     // 0-100
  educationIndex: number;  // 0-100
  freedomIndex: number;    // 0-100
  nationalSecurity: number;// 0-100
}

// ---- Voter Groups ----

export interface VoterGroupDefinition {
  id: string;
  name: string;
  populationShare: number; // 0-1, sums to 1.0
  // What simulation variables they care about, and how much (positive = they like high values)
  concerns: Partial<Record<SimVarKey, number>>;
  // Direct policy preferences (policyId -> ideal value)
  policyPreferences: Record<string, number>;
}

// ---- Events ----

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  effects: Partial<Record<SimVarKey, number>>;
  policyEffects?: Record<string, number>; // temporary policy effectiveness modifiers
  duration: number; // turns
  approvalImpact: number; // direct approval hit/boost
}

// ---- Opposition Actions ----

export type OppositionActionType =
  | 'filibuster'
  | 'campaign'
  | 'propose_alternative'
  | 'media_attack'
  | 'coalition_building'
  | 'vote_of_no_confidence';

export interface OppositionAction {
  type: OppositionActionType;
  cost: number;
  targetPolicyId?: string;
  targetGroupId?: string;
  targetSimVar?: SimVarKey;
  proposedPolicyId?: string;
  proposedValue?: number;
}

// ---- Budget ----

export interface BudgetState {
  revenue: number;
  spending: number;
  deficit: number;
  debtToGdp: number; // percentage 0-200+
  creditDowngrade: boolean;
}

// ---- Active Effects ----

export interface ActiveEffect {
  type: 'event' | 'media_attack' | 'coalition' | 'filibuster';
  id: string;
  turnsRemaining: number;
  data: Record<string, unknown>;
}

// ---- Turn Phases ----

export type TurnPhase =
  | 'waiting'       // lobby
  | 'events'        // random event display
  | 'ruling'        // ruling party makes moves
  | 'resolution'    // simulation ticks
  | 'opposition'    // opposition makes moves
  | 'polling'       // results shown
  | 'election'      // election happens
  | 'game_over';    // game ended

// ---- Game State ----

export interface PolicyChange {
  policyId: string;
  oldValue: number;
  newValue: number;
  cost: number;
}

export interface GameState {
  roomId: string;
  players: Player[];
  turn: number;
  phase: TurnPhase;
  policies: Record<string, number>; // policyId -> current value (0-100)
  simulation: SimulationState;
  budget: BudgetState;
  voterSatisfaction: Record<string, number>; // groupId -> satisfaction 0-100
  approvalRating: number; // 0-100
  oppositionVoteShare: number; // 0-100
  activeEffects: ActiveEffect[];
  currentEvent: GameEvent | null;
  actionLog: ActionLogEntry[];
  pendingPolicyChanges: PolicyChange[];
  pendingOppositionActions: OppositionAction[];
  filibusteredPolicies: string[]; // policy IDs blocked this turn
  electionHistory: ElectionResult[];
  turnsUntilElection: number;
}

export interface ActionLogEntry {
  turn: number;
  phase: TurnPhase;
  message: string;
  type: 'info' | 'ruling' | 'opposition' | 'event' | 'election';
  timestamp: number;
}

export interface ElectionResult {
  turn: number;
  rulingVoteShare: number;
  oppositionVoteShare: number;
  groupResults: Record<string, { ruling: number; opposition: number }>;
  winner: PlayerRole;
  swapped: boolean;
}

// ---- Socket Events ----

export interface ServerToClientEvents {
  gameState: (state: GameState) => void;
  error: (message: string) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  notification: (message: string) => void;
}

export interface ClientToServerEvents {
  createRoom: (playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  submitPolicyChanges: (changes: PolicyChange[]) => void;
  submitOppositionActions: (actions: OppositionAction[]) => void;
  endTurnPhase: () => void;
  acknowledgeEvent: () => void;
}
