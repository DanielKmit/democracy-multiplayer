namespace DemocracyGame.Models;

// ---- Game Events ----

public class GameEvent
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public Dictionary<SimVar, double> Effects { get; set; } = new();
    public Dictionary<string, int>? PolicyEffects { get; set; }
    public int Duration { get; set; }
    public int ApprovalImpact { get; set; }
}

// ---- Dilemmas ----

public class DilemmaOption
{
    public string Label { get; set; } = "";
    public string Description { get; set; } = "";
    public Dictionary<SimVar, double> Effects { get; set; } = new();
    public Dictionary<string, int>? PolicyEffects { get; set; }
    public Dictionary<string, double>? VoterEffects { get; set; }
    public Dictionary<string, double>? RegionEffects { get; set; }
}

public class DilemmaDefinition
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Icon { get; set; } = "";
    public DilemmaOption OptionA { get; set; } = new();
    public DilemmaOption OptionB { get; set; } = new();
    public string DefaultOption { get; set; } = "a";
    public int TimeoutSeconds { get; set; } = 30;
}

public class ActiveDilemma
{
    public string DilemmaId { get; set; } = "";
    public long StartedAt { get; set; }
    public bool Resolved { get; set; }
    public string? ChosenOption { get; set; }  // "a" | "b" | null
}

// ---- Situations ----

public class SituationDefinition
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Icon { get; set; } = "";
    public SituationCategory Category { get; set; }
    public SituationSeverity Severity { get; set; }
    public Func<Dictionary<string, int>, SimulationState, int, BudgetState?, bool> TriggerCondition { get; set; } = (_, _, _, _) => false;
    public Dictionary<SimVar, double> Effects { get; set; } = new();
    public Dictionary<string, double> VoterEffects { get; set; } = new();
    public List<string>? Cascades { get; set; }
}

public class ActiveSituation
{
    public string Id { get; set; } = "";
    public int TurnsActive { get; set; }
    public bool Acknowledged { get; set; }
}

// ---- Active Effects ----

public class ActiveEffect
{
    public EffectType Type { get; set; }
    public string Id { get; set; } = "";
    public int TurnsRemaining { get; set; }
    public Dictionary<string, object> Data { get; set; } = new();
}

// ---- Regional Events ----

public class ActiveRegionalEvent
{
    public string Id { get; set; } = "";
    public string RegionId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Icon { get; set; } = "";
    public int TurnsRemaining { get; set; }
}

// ---- Extremism ----

public class ExtremismState
{
    public double FarLeft { get; set; }
    public double FarRight { get; set; }
    public double Religious { get; set; }
    public double Eco { get; set; }
    public bool AssassinationAttempted { get; set; }
    public bool AssassinationSucceeded { get; set; }

    public double this[ExtremistGroup group]
    {
        get => group switch
        {
            ExtremistGroup.FarLeft => FarLeft,
            ExtremistGroup.FarRight => FarRight,
            ExtremistGroup.Religious => Religious,
            ExtremistGroup.Eco => Eco,
            _ => 0
        };
        set
        {
            switch (group)
            {
                case ExtremistGroup.FarLeft: FarLeft = value; break;
                case ExtremistGroup.FarRight: FarRight = value; break;
                case ExtremistGroup.Religious: Religious = value; break;
                case ExtremistGroup.Eco: Eco = value; break;
            }
        }
    }
}
