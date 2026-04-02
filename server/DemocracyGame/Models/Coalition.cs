namespace DemocracyGame.Models;

public class CoalitionOffer
{
    public string FromPlayerId { get; set; } = "";
    public string ToBotPartyId { get; set; } = "";
    public List<CoalitionPromise> Promises { get; set; } = new();
    public bool Accepted { get; set; }
    public bool Rejected { get; set; }
}

public class CoalitionPromise
{
    public string Type { get; set; } = "policy_change";
    public string PolicyId { get; set; } = "";
    public string Direction { get; set; } = "increase";
    public int TargetLevel { get; set; }
    public string Description { get; set; } = "";
}

public class CoalitionPartner
{
    public string BotPartyId { get; set; } = "";
    public int Seats { get; set; }
    public List<CoalitionPromise> Promises { get; set; } = new();
    public double Satisfaction { get; set; } = 100;
    public int TurnsInCoalition { get; set; }
}

public class CoalitionDemand
{
    public string Id { get; set; } = "";
    public string FromBotPartyId { get; set; } = "";
    public string Description { get; set; } = "";
    public string PolicyId { get; set; } = "";
    public int TargetValue { get; set; }
    public string Direction { get; set; } = "increase";
    public string Urgency { get; set; } = "medium";
    public int TurnsRemaining { get; set; }
}
