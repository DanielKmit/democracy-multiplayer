namespace DemocracyGame.Models;

public class VoterGroupDefinition
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public double PopulationShare { get; set; }
    public Dictionary<SimVar, double> Concerns { get; set; } = new();
    public Dictionary<string, double> PolicyPreferences { get; set; } = new();
}
