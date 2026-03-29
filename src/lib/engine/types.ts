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

export interface RegionDemographics {
  populationMillions: number;
  ageYoung: number;       // % 18-30
  ageMiddle: number;      // % 30-55
  ageElderly: number;     // % 55+
  voterGroupBreakdown: Record<string, number>; // groupId -> % of region
  avgIncome: 'low' | 'medium' | 'high';
  baseUnemployment: number;   // base % (affected by policies)
  universityEducated: number; // %
  religiousPopulation: number; // %
  urbanPercent: number;        // % urban (rest is rural)
  keyIndustry: string;
}

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
  policyWeights: Record<string, number>;
  demographics: RegionDemographics;
}

// ---- Policies ----

export type PolicyCategory = 'economy' | 'welfare' | 'society' | 'environment' | 'security' | 'infrastructure';

export const POLICY_LEVELS = ['Off', 'Low', 'Medium', 'High', 'Maximum'] as const;
export type PolicyLevel = typeof POLICY_LEVELS[number];
export const POLICY_LEVEL_VALUES: Record<PolicyLevel, number> = { Off: 0, Low: 25, Medium: 50, High: 75, Maximum: 100 };
export function valueToPolicyLevel(value: number): PolicyLevel {
  if (value <= 12) return 'Off';
  if (value <= 37) return 'Low';
  if (value <= 62) return 'Medium';
  if (value <= 87) return 'High';
  return 'Maximum';
}
export function policyLevelToValue(level: PolicyLevel): number {
  return POLICY_LEVEL_VALUES[level];
}

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

export type BillStatus = 'pending' | 'drafting' | 'voting' | 'passed' | 'failed' | 'filibustered' | 'vetoed' | 'unconstitutional';

export interface Bill {
  id: string;
  title: string;
  description?: string;           // bill description for UI
  category?: string;              // bill category for filtering
  policyId: string;
  proposedValue: number;
  currentValue: number;
  authorId: string;
  status: BillStatus;
  votesFor: number;
  votesAgainst: number;
  isEmergency: boolean;
  seatVotes?: Record<number, boolean>;  // seatId -> yes/no
  partyVotes?: Record<string, { yes: number; no: number }>;  // partyId -> vote counts
  // Parliament influence system
  lobbyInfluence: Record<string, number>;   // partyId -> lobbying PC spent on this bill
  whipBonus: number;                        // ruling party whip bonus (0-30)
  publicPressure: number;                   // public campaign pressure (-20 to +20)
  // Veto / Constitutional system
  constitutionalScore: number;    // 0-100, how constitutional this bill is (higher = safer)
  turnProposed: number;           // which turn the bill was proposed
  vetoOverrideVotes?: { yes: number; no: number }; // override attempt if vetoed
  fromTemplate?: string;          // bill library template id (if from library)
  filibusterTurns?: number;       // turns remaining on filibuster
}

// ---- Bill Library Template ----

export interface BillTemplate {
  id: string;
  name: string;
  description: string;
  category: 'economy' | 'healthcare' | 'education' | 'environment' | 'security' | 'social' | 'immigration';
  policyChanges: { policyId: string; targetValue: number }[];
  cost: number;                   // PC cost to propose
  constitutionalScore: number;    // 0-100, how constitutionally safe
  popularityEffects: { voterGroup: string; effect: number }[];
  ideologyAlignment: { progressive: number; centrist: number; conservative: number };
}

// Parliament influence actions
export type ParliamentActionType = 'lobby' | 'whip' | 'public_campaign';

export interface ParliamentAction {
  type: ParliamentActionType;
  billId: string;
  pcSpent: number;          // political capital spent
  targetPartyId?: string;   // for lobby: which party to sway
  direction: 'support' | 'oppose';  // lobby for or against
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
  triggerCondition: (policies: Record<string, number>, sim: SimulationState, turnsSinceStart: number, budget?: BudgetState) => boolean;
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
  interestPayments: number;
  deficit: number;        // positive = deficit, negative = surplus
  balance: number;        // revenue - spending - interest (positive = surplus)
  debtTotal: number;      // absolute debt in billions
  debtToGdp: number;      // debt as % of GDP
  creditRating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
  interestRate: number;   // annual %
  creditDowngrade: boolean;
}

// ---- Active Effects ----

export interface ActiveEffect {
  type: 'event' | 'media_attack' | 'coalition' | 'filibuster' | 'dilemma' | 'media_event' | 'voter_group_event';
  id: string;
  turnsRemaining: number;
  data: Record<string, unknown>;
}

// ---- Regional Events (active) ----

export interface ActiveRegionalEvent {
  id: string;
  regionId: string;
  name: string;
  description: string;
  icon: string;
  turnsRemaining: number;
}

// ---- Turn Phases ----

export type TurnPhase =
  | 'waiting'
  | 'party_creation'
  | 'campaigning'        // Pre-first-election campaign phase
  | 'events'
  | 'dilemma'
  | 'ruling'
  | 'bill_voting'
  | 'resolution'
  | 'opposition'
  | 'polling'
  | 'election'
  | 'coalition_negotiation'  // Post-election coalition building
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
  | 'propose_amendment'
  | 'table_motion'
  | 'question_time'
  | 'propose_counter_bill'
  | 'rally_protest'
  | 'leak_scandal'
  | 'form_ngo_alliance'
  | 'senate_veto'
  | 'constitutional_challenge'
  | 'delay_tactics'
  | 'campaign_visit'
  | 'run_ads'
  | 'plant_evidence'
  | 'spin_scandal'
  | 'sign_trade_deal'
  | 'send_foreign_aid'
  | 'attack_broken_promise'
  // D4 Opposition Powers
  | 'call_early_election'
  | 'block_cabinet'
  | 'investigate_government'
  | 'filibuster_bill'
  | 'propose_alt_budget'
  | 'media_campaign_against'
  | 'coalition_poaching'
  | 'emergency_debate';

export interface OppositionAction {
  type: OppositionActionType;
  cost: number;
  targetPolicyId?: string;
  targetGroupId?: string;
  targetSimVar?: SimVarKey;
  proposedPolicyId?: string;
  proposedValue?: number;
  targetBillId?: string;
  targetRegionId?: string;
  topic?: string;
  scandalType?: ScandalType;
  scandalId?: string;
  targetNationId?: string;
  aidAmount?: number;
  targetPledgeIndex?: number;  // for attack_broken_promise: index into state.pledges
  targetBotPartyId?: string;   // for coalition_poaching
}

// Shadow Cabinet
export interface ShadowMinister {
  ministryId: MinistryId;
  politicianId: string;
  effectiveness: number;
}

// Delayed policy effect (D4-style: policies take time to implement)
export interface DelayedPolicy {
  policyId: string;
  originalValue: number;
  newValue: number;
  turnsRemaining: number;
  source?: 'bill' | 'opposition_delay'; // Track why it's delayed
}

// Pledge tracking (campaign promises)
export interface Pledge {
  playerId: string;
  policyId: string;
  direction: 'increase' | 'decrease';
  madeOnTurn: number;
  status: 'pending' | 'kept' | 'broken';
  regionId?: string;      // region the promise was made in
  attackedBy?: string;     // playerId who attacked this promise
  attackedOnTurn?: number; // turn it was attacked
}

// Voter cynicism per group
export type VoterCynicism = Record<string, number>; // groupId -> 0-100

// Pending motion
export interface PendingMotion {
  topic: string;
  targetSimVar: SimVarKey;
  turnsRemaining: number;
}

// NGO Alliance
export interface NGOAlliance {
  groupId: string;
  bonus: number;
}

// ---- Bot Parties ----

export interface BotParty {
  id: string;
  name: string;
  color: string;
  leaderName: string;
  economicAxis: number;   // 0-100
  socialAxis: number;     // 0-100
  manifesto: string[];
  logo: PartyLogo;
  seats: number;
  // Policy preferences — same format as voter groups
  policyPreferences: Record<string, number>;
  // Which sim vars they care about
  concerns: Partial<Record<SimVarKey, number>>;
}

export const BOT_PARTIES: BotParty[] = [
  {
    id: 'bot_green',
    name: 'Green Alliance',
    color: '#22C55E',
    leaderName: 'Petra Lindström',
    economicAxis: 35,
    socialAxis: 80,
    manifesto: ['Environmental protection', 'Green energy', 'Social equality'],
    logo: 'tree',
    seats: 0,
    policyPreferences: {
      env_regulations: 90, renewables: 95, carbon_tax: 85, public_transport: 80,
      civil_rights: 75, press_freedom: 80, healthcare: 70, education: 70,
    },
    concerns: { pollution: -0.9, healthIndex: 0.4, freedomIndex: 0.5 },
  },
  {
    id: 'bot_national',
    name: 'National Front',
    color: '#92400E',
    leaderName: 'Viktor Halvorsen',
    economicAxis: 60,
    socialAxis: 15,
    manifesto: ['National sovereignty', 'Strong military', 'Immigration control'],
    logo: 'shield',
    seats: 0,
    policyPreferences: {
      military: 85, border_security: 90, intelligence: 75, immigration: 15,
      police: 75, religious_freedom: 50, gun_control: 25, foreign_aid: 10,
    },
    concerns: { nationalSecurity: 0.9, crime: -0.6 },
  },
  {
    id: 'bot_workers',
    name: "Workers' Union Party",
    color: '#DC2626',
    leaderName: 'Margareta Brandt',
    economicAxis: 20,
    socialAxis: 50,
    manifesto: ['Workers rights', 'Universal healthcare', 'Job creation'],
    logo: 'fist',
    seats: 0,
    policyPreferences: {
      minimum_wage: 85, unemployment_benefits: 80, healthcare: 85, pensions: 80,
      education: 75, housing_subsidies: 75, income_tax: 55, corporate_tax: 60,
    },
    concerns: { unemployment: -0.8, equality: 0.7, healthIndex: 0.4 },
  },
  {
    id: 'bot_freemarket',
    name: 'Free Market Party',
    color: '#F59E0B',
    leaderName: 'Maximilian Kohl',
    economicAxis: 85,
    socialAxis: 65,
    manifesto: ['Lower taxes', 'Free trade', 'Digital innovation'],
    logo: 'scales',
    seats: 0,
    policyPreferences: {
      corporate_tax: 15, income_tax: 20, trade_openness: 90, tech_research: 85,
      govt_spending: 20, env_regulations: 25, minimum_wage: 20, press_freedom: 70,
    },
    concerns: { gdpGrowth: 0.9, unemployment: -0.3, inflation: -0.4 },
  },
];

// ---- Coalition System ----

export interface CoalitionOffer {
  fromPlayerId: string;
  toBotPartyId: string;
  promises: CoalitionPromise[];
  accepted: boolean;
  rejected: boolean;
}

export interface CoalitionPromise {
  type: 'policy_change';
  policyId: string;
  direction: 'increase' | 'decrease';
  targetLevel: number;   // target policy value
  description: string;
}

export interface CoalitionPartner {
  botPartyId: string;
  seats: number;
  promises: CoalitionPromise[];
  satisfaction: number;  // 0-100, drops if promises broken
  turnsInCoalition: number;
}

export interface CoalitionDemand {
  id: string;
  fromBotPartyId: string;
  description: string;
  policyId: string;
  targetValue: number;
  direction: 'increase' | 'decrease';
  urgency: 'low' | 'medium' | 'high';
  turnsRemaining: number;
}

// ---- Campaign Action (pre-election turns) ----

export type CampaignActionType =
  | 'campaign_rally'
  | 'media_blitz'
  | 'voter_promise'
  | 'target_region'
  | 'state_position';

export interface CampaignAction {
  type: CampaignActionType;
  cost: number;
  targetRegionId?: string;
  targetGroupId?: string;
  targetSimVar?: SimVarKey;
  position?: 'support' | 'oppose';
  promisePolicyId?: string;
  promiseDirection?: 'increase' | 'decrease';
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

// ---- Scandals ----

export type ScandalType = 'corruption' | 'personal' | 'policy';

export interface Scandal {
  id: string;
  type: ScandalType;
  title: string;
  description: string;
  severity: number;
  targetPlayerId: string;
  sourcePlayerId?: string;
  planted: boolean;
  exposed: boolean;
  coveredUp: boolean;
  spun: boolean;
  approvalImpact: number;
  reputationImpact: number;
  turnsRemaining: number;
}

// ---- Reputation ----

export interface ReputationState {
  scores: Record<string, number>;
  promisesKept: Record<string, number>;
  promisesBroken: Record<string, number>;
  scandalCount: Record<string, number>;
}

// ---- Victory ----

export type VictoryType = 'electoral' | 'economic' | 'approval' | 'parliamentary';

export interface VictoryTracker {
  consecutiveHighGDP: number;
  consecutiveHighApproval: number;
  consecutiveSupermajority: number;
}

// ---- Policy Synergies ----

export interface ActiveSynergy {
  synergyId: string;
  name: string;
  icon: string;
  effects: Partial<Record<SimVarKey, number>>;
  approvalBonus: number;
}

// ---- International Relations ----

export interface DiplomaticRelation {
  nationId: string;
  relation: number;
  hasTradeAgreement: boolean;
  hasForeignAid: boolean;
  aidAmount: number;
  warThreat: boolean;
  activeDeal: {
    nationId: string;
    gdpBonus: number;
    unemploymentEffect: number;
    turnsRemaining: number;
  } | null;
}

export interface DiplomaticIncident {
  id: string;
  nationId: string;
  title: string;
  description: string;
  optionA: { label: string; relationDelta: number; effects: Partial<Record<SimVarKey, number>> };
  optionB: { label: string; relationDelta: number; effects: Partial<Record<SimVarKey, number>> };
}

// ---- Game Settings (toggleable features) ----

export interface GameSettings {
  scandalsEnabled: boolean;
  reputationEnabled: boolean;
  victoryCondition: VictoryType;
  internationalRelationsEnabled: boolean;
  policySynergiesEnabled: boolean;
  coalitionMechanicsEnabled: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  scandalsEnabled: true,
  reputationEnabled: true,
  victoryCondition: 'electoral',
  internationalRelationsEnabled: true,
  policySynergiesEnabled: true,
  coalitionMechanicsEnabled: true,
};

// ---- Live Parliament Vote ----

export interface LiveVoteState {
  billId: string;
  bill: Bill;
  /** Per-bot-party vote intention: positive = leaning yes, negative = leaning no */
  partyIntentions: Record<string, number>;
  /** PC spent by each player lobbying */
  lobbySpent: Record<string, number>;
  /** Which players have clicked "Ready to finalize" */
  readyPlayers: string[];
  /** Timestamp when voting started */
  startedAt: number;
  /** Explicit player vote choices (overrides intention-based random voting) */
  playerVotes: Record<string, 'yes' | 'no'>;
  /** Whether the vote has been finalized */
  finalized: boolean;
  /** Final result after finalization */
  result?: { passed: boolean; votesFor: number; votesAgainst: number; partyVotes: Record<string, { yes: number; no: number }> };
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
  voterSatisfaction: Record<string, Record<string, number>>;  // partyId -> { groupId: satisfaction }
  regionalSatisfaction: Record<string, Record<string, number>>;  // regionId -> { partyId: satisfaction }
  approvalRating: Record<string, number>;  // partyId -> overall approval %
  // Legacy compat — ruling party's approval for easy access
  rulingApproval: number;
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
  // Opposition power system
  shadowCabinet: Record<MinistryId, string | null>;
  oppositionCredibility: number;
  delayedPolicies: DelayedPolicy[];
  ngoAlliances: NGOAlliance[];
  motionsPending: PendingMotion[];
  campaignPhase: boolean;
  questionTimeUsed: boolean;
  lastTurnPolicyChanges: PolicyChange[];
  // UI state tracking
  selectedNodeId: string | null;
  // Bot parties & coalition
  botParties: BotParty[];
  coalitionPartners: CoalitionPartner[];
  coalitionOffers: CoalitionOffer[];
  coalitionDemands: CoalitionDemand[];
  pendingCampaignActions: CampaignAction[];
  campaignBonuses: Record<string, Record<string, number>>; // playerId -> { regionId/groupId: bonus }
  isPreElection: boolean;  // true during first 5 turns
  voteShares: Record<string, number>;  // partyId -> vote % (sums to 100)
  campaignActedThisTurn: Record<string, boolean>;  // playerId -> has acted this campaign turn
  turnActedThisTurn: Record<string, boolean>;      // playerId -> has acted this governing turn (ruling/opp)
  phaseReady: Record<string, boolean>;             // playerId -> has clicked "Ready" for current phase
  // D4 Features
  pledges: Pledge[];                                // Campaign promises made by players
  voterCynicism: VoterCynicism;                     // Per voter group cynicism (0-100)
  appliedEvents: string[];                          // Event IDs already applied (prevent stacking)
  consecutiveLowApprovalTurns: number;              // Track consecutive low approval turns for cynicism
  consecutiveRulingPartyElections: number;          // Same party in power counter
  // Regional & Media Events
  activeRegionalEvents: ActiveRegionalEvent[];      // Currently active regional events
  // Opposition auto-pilot
  autoPilotOpposition: boolean;                     // Whether AI controls opposition
  // AI opponent
  isAIGame: boolean;                                // Whether this is a solo vs AI game
  aiPlayerId: string | null;                        // Which player is AI-controlled
  aiIdeology: 'left' | 'center' | 'right' | null;  // AI ideology preset
  aiThinking: boolean;                              // Whether AI is currently "thinking"
  // === NEW FEATURES ===
  // Scandal system
  activeScandals: Scandal[];
  // Party reputation
  reputation: ReputationState;
  // Victory conditions
  gameSettings: GameSettings;
  victoryTrackers: Record<string, VictoryTracker>;
  // Policy synergies
  activeSynergies: ActiveSynergy[];
  // International relations
  diplomaticRelations: DiplomaticRelation[];
  activeDiplomaticIncident: DiplomaticIncident | null;
  // Live parliament voting
  liveVote: LiveVoteState | null;
  // Track which cabinet appointments were blocked
  blockedAppointments: MinistryId[];
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
  appointShadowMinister: (ministryId: MinistryId, politicianId: string) => void;
  resolveDilemma: (option: 'a' | 'b') => void;
  endTurnPhase: () => void;
  acknowledgeEvent: () => void;
  submitCoalitionOffer: (offer: CoalitionOffer) => void;
  submitCampaignActions: (actions: CampaignAction[]) => void;
  poachCoalitionPartner: (botPartyId: string) => void;
}
