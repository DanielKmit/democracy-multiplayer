namespace DemocracyGame.Models;

public class PartyConfig
{
    public string PartyName { get; set; } = "";
    public PartyColor PartyColor { get; set; } = PartyColor.Blue;
    public string LeaderName { get; set; } = "";
    public int EconomicAxis { get; set; } = 50;  // 0 (far left) to 100 (far right)
    public int SocialAxis { get; set; } = 50;     // 0 (authoritarian) to 100 (liberal)
    public PartyLogo Logo { get; set; } = PartyLogo.Star;
    public List<string> Manifesto { get; set; } = new();  // exactly 3
}

public class Player
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public PlayerRole Role { get; set; } = PlayerRole.Ruling;
    public int PoliticalCapital { get; set; } = 6;
    public int TermsWon { get; set; }
    public PartyConfig Party { get; set; } = new();
}

public class BotParty
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#3B82F6";
    public string LeaderName { get; set; } = "";
    public int EconomicAxis { get; set; } = 50;
    public int SocialAxis { get; set; } = 50;
    public List<string> Manifesto { get; set; } = new();
    public PartyLogo Logo { get; set; } = PartyLogo.Star;
    public int Seats { get; set; }
    public Dictionary<string, double> PolicyPreferences { get; set; } = new();
    public Dictionary<SimVar, double> Concerns { get; set; } = new();
}

public static class PartyColors
{
    public static readonly Dictionary<PartyColor, string> Hex = new()
    {
        [PartyColor.Red] = "#EF4444",
        [PartyColor.Blue] = "#3B82F6",
        [PartyColor.Green] = "#22C55E",
        [PartyColor.Yellow] = "#EAB308",
        [PartyColor.Orange] = "#F97316",
        [PartyColor.Purple] = "#A855F7",
        [PartyColor.Cyan] = "#06B6D4",
        [PartyColor.Pink] = "#EC4899",
    };
}
