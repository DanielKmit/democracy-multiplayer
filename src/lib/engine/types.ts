// ============================================
// Democracy Multiplayer — Core Types (Novaria Rebuild)
// ============================================

export type PlayerRole = 'ruling' | 'opposition';

// ---- Party Creation ----

export type PartyColor = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'cyan' | 'pink';

export const PARTY_COLORS: Record<PartyColor, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#EAB308',
  orange: '#F97316',
  purple: '#A855F7',
  cyan: '#06B6D4',
  pink: '#EC4899',
};

export type PartyLogo =
  | 'eagle' | 'rose' | 'star' | 'tree' | 'fist' | 'dove'
  | 'shield' | 'flame' | 'scales' | 'gear' | 'wheat' | 'sun';

export const MANIFESTO_OPTIONS = [
  'Lower taxes',
  'Universal healthcare',
  'Strong military',
  'Green energy',
  'Civil rights',
  'Job creation',
  'Education reform',
  'Housing for all',
  'Tough on crime',
  'Immigration control',
  'Free trade',
  'Workers rights',
  'Digital innovation',
  'Rural development',
  'Religious freedom',
  'Anti-corruption',
  'National sovereignty',
  'Social equality',
  'Environmental protection',
  'Public transport',
] as const;

export type ManifestoOption = typeof MANIFESTO_OPTIONS[number];

export interface PartyConfig {
  partyName: string;
  partyColor: PartyColor;
  leaderName: string;
  economicAxis: number;    // 0 (far left) to 100 (far right)
  socialAxis: number;      // 0 (authoritarian) to 100 (liberal)
  logo: PartyLogo;
  manifesto: ManifestoOption[];  // exactly 3
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  politicalCapital: number;
  termsWon: number;
  party: PartyConfig;
}

// ---- Regions ----

export interface RegionDefinition {
  id: string;
  name: string;
  description: string;
  populationShare: number;      // sums to 1.0
  seats: number;                // parliamentary seats (sums to 100)
  economicLean: number;         // 0-100, 0=left, 100=right
  socialLean: number;           // 0-100, 0=auth, 100=lib
  dominantGroups: string[];     // voter group IDs
  characteristics: string;
  keyIssues: string[];
  // Policy weights - which policies this region cares about most
  policyWeights: Record<string, number>;  // policyId -> weight multiplier
}

// ---- Policies ----

export type PolicyCategory = 'economy' | 'welfare' | 'society' | 'environment' | 'security' | 'infrastructure';

export interface PolicyDefinition {
  id: string;
  name: string;
  category: PolicyCategory;
  description: string;
  defaultValue: number;
  effects: Partial<Record<SimVarKey, number>>;
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
  | 'nationalSecurity'
  | 'corruption';

export interface SimulationState {
  gdpGrowth: number;
  unemployment: number;
  inflation: number;
  crime: number;
  pollution: number;
  equality: number;
  healthIndex: number;
  educationIndex: number;
  freedomIndex: number;
  nationalSecurity: number;
  corruption: number;
}

// ---- Voter Groups ----

export interface VoterGroupDefinition {
  id: string;
  name: string;
  populationShare: number;
  concerns: Partial<Record<SimVarKey, number>>;
  policyPreferences: Record<string, number>;
}

// ---- Ministers / Cabinet ----

export type MinistryId =
  | 'finance' | 'interior' | 'defense' | 'health'
  | 'education' | 'foreign' | 'environment' | 'justice';

export const MINISTRY_NAMES: Record<MinistryId, string> = {
  finance: 'Minister of Finance',
  interior: 'Minister of Interior',
  defense: 'Minister of Defense',
  health: 'Minister of Health',
  education: 'Minister of Education',
  foreign: 'Minister of Foreign Affairs',
  environment: 'Minister of Environment',
  justice: 'Minister of Justice',
};

export interface Politician {
  id: string;
  name: string;
  competence: number;        // 1-10
  loyalty: number;           // 1-10
  economicLean: number;      // 0-100
  socialLean: number;        // 0-100
  specialty: MinistryId;     // +3 competence here
  avatarColor: string;
  initials: string;
}

export interface CabinetState {
  ministers: Record<MinistryId, string | null>;  // politicianId or null
  availablePool: Politician[];
}

// ---- Parliament ----

export interface ParliamentSeat {
  id: number;
  regionId: string;
  partyId: string;       // player id who won this seat
  partyColor: string;
}

export interface ParliamentState {
  seats: ParliamentSeat[];
  seatsByParty: Record<string, number>;
  coalitionPartner: string | null;
  speakerId: number | null;
}

// ---- Bills / Laws ----

export type BillStatus = 'drafting' | 'voting' | 'passed' | 'failed' | 'filibustered';

export interface Bill {
  id: string;
  title: string;
  policyId: string;
  proposedValue: number;
  currentValue: number;
  authorId: string;
  status: BillStatus;
  votesFor: number;
  votesAgainst: number;
  isEmergency: boolean;
  seatVotes?: Record<number, boolean>;  // seatId -> yes/no
}

// ---- Situations ----

export type SituationSeverity = 'mild' | 'moderate' | 'severe' | 'critical';

export interface SituationDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'economic' | 'social' | 'security' | 'environment';
  severity: SituationSeverity;
  triggerCondition: (policies: Record<string, number>, sim: SimulationState, turnsSinceStart: number) => boolean;
  effects: Partial<Record<SimVarKey, number>>;
  voterEffects: Record<string, number>;   // groupId -> satisfaction modifier
  cascades?: string[];                     // other situation IDs this can trigger
}

export interface ActiveSituation {
  id: string;
  turnsActive: number;
  acknowledged: boolean;
}

// ---- Dilemmas ----

export interface DilemmaOption {
  label: string;
  description: string;
  effects: Partial<Record<SimVarKey, number>>;
  policyEffects?: Record<string, number>;
  voterEffects?: Record<string, number>;
  regionEffects?: Record<string, number>;   // regionId -> satisfaction mod
}

export interface DilemmaDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  optionA: DilemmaOption;
  optionB: DilemmaOption;
  defaultOption: 'a' | 'b';
  timeoutSeconds: number;
}

export interface ActiveDilemma {
  dilemmaId: string;
  startedAt: number;
  resolved: boolean;
  chosenOption: 'a' | 'b' | null;
}

// ---- Extremism ----

export type ExtremistGroup = 'far_left' | 'far_right' | 'religious' | 'eco';

export interface ExtremismState {
  far_left: number;    // 0-100
  far_right: number;
  religious: number;
  eco: number;
  assassinationAttempted: boolean;
  assassinationSucceeded: boolean;
}

// ---- Events ----

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  effects: Partial<Record<SimVarKey, number>>;
  policyEffects?: Record<string, number>;
  duration: number;
  approvalImpact: number;
}

// ---- Budget ----

export interface BudgetState {
  revenue: number;
  spending: number;
  deficit: number;
  debtToGdp: number;
  creditDowngrade: boolean;
}

// ---- Active Effects ----

export interface ActiveEffect {
  type: 'event' | 'media_attack' | 'coalition' | 'filibuster' | 'dilemma';
  id: string;
  turnsRemaining: number;
  data: Record<string, unknown>;
}

// ---- Turn Phases ----

export type TurnPhase =
  | 'waiting'
  | 'party_creation'
  | 'events'
  | 'dilemma'
  | 'ruling'
  | 'bill_voting'
  | 'resolution'
  | 'opposition'
  | 'polling'
  | 'election'
  | 'government_formation'
  | 'game_over';

// ---- Policy Change (legacy compat) ----

export interface PolicyChange {
  policyId: string;
  oldValue: number;
  newValue: number;
  cost: number;
}

// ---- Opposition Actions ----

export type OppositionActionType =
  | 'filibuster'
  | 'campaign'
  | 'propose_alternative'
  | 'media_attack'
  | 'coalition_building'
  | 'vote_of_no_confidence'
  | 'lobby_votes'
  | 'propose_amendment';

export interface OppositionAction {
  type: OppositionActionType;
  cost: number;
  targetPolicyId?: string;
  targetGroupId?: string;
  targetSimVar?: SimVarKey;
  proposedPolicyId?: string;
  proposedValue?: number;
  targetBillId?: string;
}

// ---- News Item ----

export interface NewsItem {
  id: string;
  turn: number;
  text: string;
  type: 'bill' | 'situation' | 'dilemma' | 'event' | 'election' | 'cabinet' | 'general';
  timestamp: number;
}

// ---- Action Log ----

export interface ActionLogEntry {
  turn: number;
  phase: TurnPhase;
  message: string;
  type: 'info' | 'ruling' | 'opposition' | 'event' | 'election' | 'situation' | 'dilemma' | 'cabinet';
  timestamp: number;
}

// ---- Election ----

export interface ElectionResult {
  turn: number;
  seatResults: Record<string, Record<string, number>>;  // regionId -> { playerId: seats }
  totalSeats: Record<string, number>;                    // playerId -> total seats
  voteShares: Record<string, Record<string, number>>;    // regionId -> { playerId: % }
  overallVoteShare: Record<string, number>;              // playerId -> %
  winner: string;  // playerId
  swapped: boolean;
  regionWinners: Record<string, string>;  // regionId -> playerId
}

// ---- Simulation History ----

export interface TurnSnapshot {
  turn: number;
  approval: number;
  gdp: number;
  unemployment: number;
  debtToGdp: number;
}

// ---- Game State ----

export interface GameState {
  roomId: string;
  players: Player[];
  turn: number;
  phase: TurnPhase;
  date: { month: number; year: number };  // Game date
  policies: Record<string, number>;
  simulation: SimulationState;
  budget: BudgetState;
  voterSatisfaction: Record<string, number>;
  regionalSatisfaction: Record<string, Record<string, number>>;  // regionId -> { playerId: satisfaction }
  approvalRating: number;
  oppositionVoteShare: number;
  parliament: ParliamentState;
  cabinet: CabinetState;
  activeBills: Bill[];
  activeSituations: ActiveSituation[];
  activeDilemma: ActiveDilemma | null;
  extremism: ExtremismState;
  activeEffects: ActiveEffect[];
  currentEvent: GameEvent | null;
  actionLog: ActionLogEntry[];
  newsTicker: NewsItem[];
  pendingPolicyChanges: PolicyChange[];
  pendingOppositionActions: OppositionAction[];
  filibusteredPolicies: string[];
  electionHistory: ElectionResult[];
  turnHistory: TurnSnapshot[];
  turnsUntilElection: number;
  // Tracking for situations
  consecutiveLowEnvRegulations: number;
  consecutiveHighSpending: number;
}

// ---- Peer Messages ----

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
  submitPartyConfig: (config: PartyConfig) => void;
  submitPolicyChanges: (changes: PolicyChange[]) => void;
  submitBill: (bill: Omit<Bill, 'id' | 'status' | 'votesFor' | 'votesAgainst' | 'seatVotes'>) => void;
  submitOppositionActions: (actions: OppositionAction[]) => void;
  appointMinister: (ministryId: MinistryId, politicianId: string) => void;
  fireMinister: (ministryId: MinistryId) => void;
  resolveDilemma: (option: 'a' | 'b') => void;
  endTurnPhase: () => void;
  acknowledgeEvent: () => void;
}
