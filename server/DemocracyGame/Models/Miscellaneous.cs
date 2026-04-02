namespace DemocracyGame.Models;

// ---- Debate ----

public class DebateTopic
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Icon { get; set; } = "";
    public SimVar SimVar { get; set; }
}

public class DebateState
{
    public List<DebateTopic> Topics { get; set; } = new();
    /// <summary>playerId -> { topicId: choice }</summary>
    public Dictionary<string, Dictionary<string, DebateChoice>> PlayerChoices { get; set; } = new();
    public Dictionary<string, int> Scores { get; set; } = new();
    public bool Resolved { get; set; }
    public string? Winner { get; set; }
}

// ---- Media ----

public class MediaOutlet
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public MediaBias Bias { get; set; }
    public double Influence { get; set; }
    public double CurrentStance { get; set; }
    public int InfluencedUntil { get; set; }
}

// ---- Cabinet ----

public class Politician
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int Competence { get; set; }
    public int Loyalty { get; set; }
    public int EconomicLean { get; set; }
    public int SocialLean { get; set; }
    public MinistryId Specialty { get; set; }
    public string AvatarColor { get; set; } = "";
    public string Initials { get; set; } = "";
}

public class CabinetState
{
    public Dictionary<MinistryId, string?> Ministers { get; set; } = new();
    public List<Politician> AvailablePool { get; set; } = new();
}

// ---- Pledges ----

public class Pledge
{
    public string PlayerId { get; set; } = "";
    public string PolicyId { get; set; } = "";
    public string Direction { get; set; } = "increase";
    public int MadeOnTurn { get; set; }
    public string Status { get; set; } = "pending";
    public string? RegionId { get; set; }
    public string? AttackedBy { get; set; }
    public int? AttackedOnTurn { get; set; }
}

// ---- NGO Alliance ----

public class NGOAlliance
{
    public string GroupId { get; set; } = "";
    public double Bonus { get; set; }
}

// ---- Pending Motion ----

public class PendingMotion
{
    public string Topic { get; set; } = "";
    public SimVar TargetSimVar { get; set; }
    public int TurnsRemaining { get; set; }
}

// ---- Scandals ----

public class Scandal
{
    public string Id { get; set; } = "";
    public ScandalType Type { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public double Severity { get; set; }
    public string TargetPlayerId { get; set; } = "";
    public string? SourcePlayerId { get; set; }
    public bool Planted { get; set; }
    public bool Exposed { get; set; }
    public bool CoveredUp { get; set; }
    public bool Spun { get; set; }
    public double ApprovalImpact { get; set; }
    public double ReputationImpact { get; set; }
    public int TurnsRemaining { get; set; }
}

// ---- Reputation ----

public class ReputationState
{
    public Dictionary<string, double> Scores { get; set; } = new();
    public Dictionary<string, int> PromisesKept { get; set; } = new();
    public Dictionary<string, int> PromisesBroken { get; set; } = new();
    public Dictionary<string, int> ScandalCount { get; set; } = new();
}

// ---- Victory ----

public class VictoryTracker
{
    public int ConsecutiveHighGDP { get; set; }
    public int ConsecutiveHighApproval { get; set; }
    public int ConsecutiveSupermajority { get; set; }
}

// ---- Policy Synergies ----

public class ActiveSynergy
{
    public string SynergyId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Icon { get; set; } = "";
    public Dictionary<SimVar, double> Effects { get; set; } = new();
    public double ApprovalBonus { get; set; }
}

// ---- International Relations ----

public class DiplomaticRelation
{
    public string NationId { get; set; } = "";
    public double Relation { get; set; }
    public bool HasTradeAgreement { get; set; }
    public bool HasForeignAid { get; set; }
    public double AidAmount { get; set; }
    public bool WarThreat { get; set; }
    public TradeDeal? ActiveDeal { get; set; }
}

public class TradeDeal
{
    public string NationId { get; set; } = "";
    public double GdpBonus { get; set; }
    public double UnemploymentEffect { get; set; }
    public int TurnsRemaining { get; set; }
}

public class DiplomaticIncident
{
    public string Id { get; set; } = "";
    public string NationId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public DiplomaticOption OptionA { get; set; } = new();
    public DiplomaticOption OptionB { get; set; } = new();
}

public class DiplomaticOption
{
    public string Label { get; set; } = "";
    public double RelationDelta { get; set; }
    public Dictionary<SimVar, double> Effects { get; set; } = new();
}

// ---- Game Settings ----

public class GameSettings
{
    public bool ScandalsEnabled { get; set; } = true;
    public bool ReputationEnabled { get; set; } = true;
    public VictoryType VictoryCondition { get; set; } = VictoryType.Electoral;
    public bool InternationalRelationsEnabled { get; set; } = true;
    public bool PolicySynergiesEnabled { get; set; } = true;
    public bool CoalitionMechanicsEnabled { get; set; } = true;
}

// ---- News & Logs ----

public class NewsItem
{
    public string Id { get; set; } = "";
    public int Turn { get; set; }
    public string Text { get; set; } = "";
    public NewsType Type { get; set; }
    public long Timestamp { get; set; }
}

public class ActionLogEntry
{
    public int Turn { get; set; }
    public TurnPhase Phase { get; set; }
    public string Message { get; set; } = "";
    public LogEntryType Type { get; set; }
    public long Timestamp { get; set; }
}

// ---- Election ----

public class ElectionResult
{
    public int Turn { get; set; }
    /// <summary>regionId -> { partyId: seats }</summary>
    public Dictionary<string, Dictionary<string, int>> SeatResults { get; set; } = new();
    public Dictionary<string, int> TotalSeats { get; set; } = new();
    /// <summary>regionId -> { partyId: voteShare% }</summary>
    public Dictionary<string, Dictionary<string, double>> VoteShares { get; set; } = new();
    public Dictionary<string, double> OverallVoteShare { get; set; } = new();
    public string Winner { get; set; } = "";
    public bool Swapped { get; set; }
    public Dictionary<string, string> RegionWinners { get; set; } = new();
}
