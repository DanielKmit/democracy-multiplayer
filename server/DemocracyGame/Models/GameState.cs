namespace DemocracyGame.Models;

public class GameDate
{
    public int Month { get; set; } = 1;
    public int Year { get; set; } = 2025;
}

public class GameState
{
    public string RoomId { get; set; } = "";
    public List<Player> Players { get; set; } = new();
    public int Turn { get; set; } = 1;
    public TurnPhase Phase { get; set; } = TurnPhase.Waiting;
    public GameDate Date { get; set; } = new();

    // Core state
    public Dictionary<string, int> Policies { get; set; } = new();
    public SimulationState Simulation { get; set; } = new();
    public BudgetState Budget { get; set; } = new();

    // Satisfaction & approval
    /// <summary>partyId -> { groupId: satisfaction }</summary>
    public Dictionary<string, Dictionary<string, double>> VoterSatisfaction { get; set; } = new();
    /// <summary>regionId -> { partyId: satisfaction }</summary>
    public Dictionary<string, Dictionary<string, double>> RegionalSatisfaction { get; set; } = new();
    public Dictionary<string, double> ApprovalRating { get; set; } = new();
    public double RulingApproval { get; set; }

    // Parliament & cabinet
    public ParliamentState Parliament { get; set; } = new();
    public CabinetState Cabinet { get; set; } = new();

    // Bills & situations
    public List<Bill> ActiveBills { get; set; } = new();
    public List<ActiveSituation> ActiveSituations { get; set; } = new();
    public ActiveDilemma? ActiveDilemma { get; set; }
    public ExtremismState Extremism { get; set; } = new();
    public List<ActiveEffect> ActiveEffects { get; set; } = new();
    public GameEvent? CurrentEvent { get; set; }

    // Logs
    public List<ActionLogEntry> ActionLog { get; set; } = new();
    public List<NewsItem> NewsTicker { get; set; } = new();

    // Pending actions
    public List<PolicyChange> PendingPolicyChanges { get; set; } = new();
    public List<OppositionAction> PendingOppositionActions { get; set; } = new();
    public List<string> FilibusteredPolicies { get; set; } = new();

    // History
    public List<ElectionResult> ElectionHistory { get; set; } = new();
    public List<TurnSnapshot> TurnHistory { get; set; } = new();
    public int TurnsUntilElection { get; set; } = 5;

    // Situation tracking
    public int ConsecutiveLowEnvRegulations { get; set; }
    public int ConsecutiveHighSpending { get; set; }

    // Opposition system
    public Dictionary<MinistryId, string?> ShadowCabinet { get; set; } = new();
    public double OppositionCredibility { get; set; }
    public List<DelayedPolicy> DelayedPolicies { get; set; } = new();
    public List<NGOAlliance> NgoAlliances { get; set; } = new();
    public List<PendingMotion> MotionsPending { get; set; } = new();
    public bool CampaignPhase { get; set; }
    public bool QuestionTimeUsed { get; set; }
    public List<PolicyChange> LastTurnPolicyChanges { get; set; } = new();

    // UI state
    public string? SelectedNodeId { get; set; }

    // Bot parties & coalition
    public List<BotParty> BotParties { get; set; } = new();
    public List<CoalitionPartner> CoalitionPartners { get; set; } = new();
    public List<CoalitionOffer> CoalitionOffers { get; set; } = new();
    public List<CoalitionDemand> CoalitionDemands { get; set; } = new();
    public List<CampaignAction> PendingCampaignActions { get; set; } = new();
    /// <summary>playerId -> { regionId/groupId: bonus }</summary>
    public Dictionary<string, Dictionary<string, double>> CampaignBonuses { get; set; } = new();
    public bool IsPreElection { get; set; } = true;
    public Dictionary<string, double> VoteShares { get; set; } = new();
    public Dictionary<string, bool> CampaignActedThisTurn { get; set; } = new();
    public Dictionary<string, bool> TurnActedThisTurn { get; set; } = new();
    public Dictionary<string, bool> PhaseReady { get; set; } = new();

    // D4 features
    public List<Pledge> Pledges { get; set; } = new();
    public Dictionary<string, double> VoterCynicism { get; set; } = new();
    public List<string> AppliedEvents { get; set; } = new();
    public int ConsecutiveLowApprovalTurns { get; set; }
    public int ConsecutiveRulingPartyElections { get; set; }
    public List<ActiveRegionalEvent> ActiveRegionalEvents { get; set; } = new();

    // AI
    public bool AutoPilotOpposition { get; set; }
    public bool IsAIGame { get; set; }
    public string? AiPlayerId { get; set; }
    public string? AiIdeology { get; set; }
    public bool AiThinking { get; set; }

    // Scandals & reputation
    public List<Scandal> ActiveScandals { get; set; } = new();
    public ReputationState Reputation { get; set; } = new();

    // Settings & victory
    public GameSettings GameSettings { get; set; } = new();
    public Dictionary<string, VictoryTracker> VictoryTrackers { get; set; } = new();

    // Synergies & diplomacy
    public List<ActiveSynergy> ActiveSynergies { get; set; } = new();
    public List<DiplomaticRelation> DiplomaticRelations { get; set; } = new();
    public DiplomaticIncident? ActiveDiplomaticIncident { get; set; }

    // Live parliament voting
    public LiveVoteState? LiveVote { get; set; }
    public List<MinistryId> BlockedAppointments { get; set; } = new();

    // Advanced D4
    public Dictionary<string, double> VoterMemory { get; set; } = new();
    public Dictionary<string, List<int>> PolicyChangeHistory { get; set; } = new();
    public Dictionary<string, double> FlipFlopPenalty { get; set; } = new();
    public object? FocusGroupResult { get; set; }

    // Debate & media
    public DebateState? Debate { get; set; }
    public List<MediaOutlet> MediaLandscape { get; set; } = new();
    public Dictionary<string, double> Perception { get; set; } = new();
    public Dictionary<string, int> PolicyStability { get; set; } = new();
}
