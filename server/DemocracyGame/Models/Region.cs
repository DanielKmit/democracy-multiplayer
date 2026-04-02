namespace DemocracyGame.Models;

public class RegionDemographics
{
    public double PopulationMillions { get; set; }
    public double AgeYoung { get; set; }
    public double AgeMiddle { get; set; }
    public double AgeElderly { get; set; }
    public Dictionary<string, double> VoterGroupBreakdown { get; set; } = new();
    public string AvgIncome { get; set; } = "medium";  // "low" | "medium" | "high"
    public double BaseUnemployment { get; set; }
    public double UniversityEducated { get; set; }
    public double ReligiousPopulation { get; set; }
    public double UrbanPercent { get; set; }
    public string KeyIndustry { get; set; } = "";
}

public class RegionDefinition
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public double PopulationShare { get; set; }
    public int Seats { get; set; }
    public int EconomicLean { get; set; }
    public int SocialLean { get; set; }
    public List<string> DominantGroups { get; set; } = new();
    public string Characteristics { get; set; } = "";
    public List<string> KeyIssues { get; set; } = new();
    public Dictionary<string, double> PolicyWeights { get; set; } = new();
    public RegionDemographics Demographics { get; set; } = new();
}
