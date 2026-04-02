namespace DemocracyGame.Models;

public class PolicyDefinition
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public PolicyCategory Category { get; set; }
    public string Description { get; set; } = "";
    public int DefaultValue { get; set; } = 50;
    public Dictionary<SimVar, double> Effects { get; set; } = new();
    public double BudgetCostPerPoint { get; set; }
}

public class PolicyChange
{
    public string PolicyId { get; set; } = "";
    public int OldValue { get; set; }
    public int NewValue { get; set; }
    public int Cost { get; set; }
}

public class DelayedPolicy
{
    public string PolicyId { get; set; } = "";
    public int OriginalValue { get; set; }
    public int NewValue { get; set; }
    public int TurnsRemaining { get; set; }
    public string? Source { get; set; }  // "bill" | "opposition_delay"
}

public static class PolicyLevels
{
    public static PolicyLevel FromValue(int value) => value switch
    {
        <= 12 => PolicyLevel.Off,
        <= 37 => PolicyLevel.Low,
        <= 62 => PolicyLevel.Medium,
        <= 87 => PolicyLevel.High,
        _ => PolicyLevel.Maximum,
    };

    public static int ToValue(PolicyLevel level) => level switch
    {
        PolicyLevel.Off => 0,
        PolicyLevel.Low => 25,
        PolicyLevel.Medium => 50,
        PolicyLevel.High => 75,
        PolicyLevel.Maximum => 100,
        _ => 50
    };
}
