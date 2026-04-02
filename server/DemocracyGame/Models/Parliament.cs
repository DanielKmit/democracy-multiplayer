namespace DemocracyGame.Models;

public class ParliamentSeat
{
    public int Id { get; set; }
    public string RegionId { get; set; } = "";
    public string PartyId { get; set; } = "";
    public string PartyColor { get; set; } = "";
}

public class ParliamentState
{
    public List<ParliamentSeat> Seats { get; set; } = new();
    public Dictionary<string, int> SeatsByParty { get; set; } = new();
    public string? CoalitionPartner { get; set; }
    public int? SpeakerId { get; set; }
}

public class Bill
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string PolicyId { get; set; } = "";
    public int ProposedValue { get; set; }
    public int CurrentValue { get; set; }
    public string AuthorId { get; set; } = "";
    public BillStatus Status { get; set; } = BillStatus.Pending;
    public int VotesFor { get; set; }
    public int VotesAgainst { get; set; }
    public bool IsEmergency { get; set; }
    public Dictionary<int, bool> SeatVotes { get; set; } = new();
    public Dictionary<string, PartyVoteCount> PartyVotes { get; set; } = new();
    public Dictionary<string, double> LobbyInfluence { get; set; } = new();
    public double WhipBonus { get; set; }
    public double PublicPressure { get; set; }
    public int ConstitutionalScore { get; set; }
    public int TurnProposed { get; set; }
    public PartyVoteCount? VetoOverrideVotes { get; set; }
    public string? FromTemplate { get; set; }
    public int? FilibusterTurns { get; set; }
}

public class PartyVoteCount
{
    public int Yes { get; set; }
    public int No { get; set; }
}

public class BillTemplate
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public List<BillPolicyChange> PolicyChanges { get; set; } = new();
    public int Cost { get; set; }
    public int ConstitutionalScore { get; set; }
    public List<PopularityEffect> PopularityEffects { get; set; } = new();
    public IdeologyAlignment IdeologyAlignment { get; set; } = new();
}

public class BillPolicyChange
{
    public string PolicyId { get; set; } = "";
    public int TargetValue { get; set; }
}

public class PopularityEffect
{
    public string VoterGroup { get; set; } = "";
    public double Effect { get; set; }
}

public class IdeologyAlignment
{
    public double Progressive { get; set; }
    public double Centrist { get; set; }
    public double Conservative { get; set; }
}

public class LiveVoteState
{
    public string BillId { get; set; } = "";
    public Bill Bill { get; set; } = new();
    public Dictionary<string, double> PartyIntentions { get; set; } = new();
    public Dictionary<string, double> LobbySpent { get; set; } = new();
    public List<string> ReadyPlayers { get; set; } = new();
    public long StartedAt { get; set; }
    public Dictionary<string, string> PlayerVotes { get; set; } = new(); // "yes" | "no"
    public bool Finalized { get; set; }
    public LiveVoteResult? Result { get; set; }
}

public class LiveVoteResult
{
    public bool Passed { get; set; }
    public int VotesFor { get; set; }
    public int VotesAgainst { get; set; }
    public Dictionary<string, PartyVoteCount> PartyVotes { get; set; } = new();
}
