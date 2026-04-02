using DemocracyGame.Models;

namespace DemocracyGame.Data;

/// <summary>
/// 14 random events that can occur each turn (30% chance).
/// Port of events.ts.
/// </summary>
public static class EventData
{
    private static readonly Random Rng = new();
    private static int _eventCounter = 0;

    public static readonly GameEvent[] Pool = new GameEvent[]
    {
        new() { Id = "economic_boom", Name = "Economic Boom", Description = "Markets surge as investor confidence peaks.",
            Effects = new() { [SimVar.GdpGrowth] = 2, [SimVar.Unemployment] = -1 }, Duration = 3, ApprovalImpact = 5 },
        new() { Id = "recession", Name = "Recession", Description = "Economic downturn grips the nation.",
            Effects = new() { [SimVar.GdpGrowth] = -3, [SimVar.Unemployment] = 3 }, Duration = 4, ApprovalImpact = -8 },
        new() { Id = "pandemic", Name = "Pandemic Outbreak", Description = "A dangerous virus spreads across the country.",
            Effects = new() { [SimVar.HealthIndex] = -15, [SimVar.GdpGrowth] = -2 }, Duration = 5, ApprovalImpact = -10 },
        new() { Id = "scandal", Name = "Political Scandal", Description = "Corruption exposed in government ranks.",
            Effects = new() { [SimVar.Corruption] = 10 }, Duration = 3, ApprovalImpact = -12 },
        new() { Id = "disaster", Name = "Natural Disaster", Description = "Earthquake devastates a major city.",
            Effects = new() { [SimVar.GdpGrowth] = -1, [SimVar.HealthIndex] = -5 }, Duration = 3, ApprovalImpact = -5 },
        new() { Id = "tech_break", Name = "Tech Breakthrough", Description = "A major tech company announces revolutionary innovation.",
            Effects = new() { [SimVar.GdpGrowth] = 1.5, [SimVar.EducationIndex] = 3 }, Duration = 3, ApprovalImpact = 4 },
        new() { Id = "border_crisis", Name = "Border Crisis", Description = "Massive influx of migrants at the border.",
            Effects = new() { [SimVar.Crime] = 5, [SimVar.NationalSecurity] = -5 }, Duration = 4, ApprovalImpact = -7 },
        new() { Id = "energy_crisis", Name = "Energy Crisis", Description = "Power shortages cause rolling blackouts.",
            Effects = new() { [SimVar.GdpGrowth] = -1.5, [SimVar.Inflation] = 3 }, Duration = 3, ApprovalImpact = -6 },
        new() { Id = "market_crash", Name = "Market Crash", Description = "Stock market loses 30% in a single week.",
            Effects = new() { [SimVar.GdpGrowth] = -4, [SimVar.Unemployment] = 2 }, Duration = 4, ApprovalImpact = -10 },
        new() { Id = "renaissance", Name = "Cultural Renaissance", Description = "Arts and culture flourish across the nation.",
            Effects = new() { [SimVar.EducationIndex] = 5, [SimVar.FreedomIndex] = 3 }, Duration = 3, ApprovalImpact = 3 },
        new() { Id = "crime_wave", Name = "Crime Wave", Description = "Organized crime surges in major cities.",
            Effects = new() { [SimVar.Crime] = 15, [SimVar.ViolentCrime] = 10 }, Duration = 4, ApprovalImpact = -8 },
        new() { Id = "trade_deal", Name = "Trade Deal", Description = "Favorable trade agreement signed with major partner.",
            Effects = new() { [SimVar.GdpGrowth] = 1, [SimVar.Unemployment] = -0.5 }, Duration = 3, ApprovalImpact = 3 },
        new() { Id = "diplomatic_incident", Name = "Diplomatic Incident", Description = "International relations sour after leaked documents.",
            Effects = new() { [SimVar.NationalSecurity] = -5 }, Duration = 2, ApprovalImpact = -4 },
        new() { Id = "oil_discovery", Name = "Oil Discovery", Description = "Massive oil reserves found in national waters.",
            Effects = new() { [SimVar.GdpGrowth] = 2, [SimVar.Pollution] = 5 }, Duration = 5, ApprovalImpact = 6 },
    };

    public static void ResetEventCounter() => _eventCounter = 0;

    /// <summary>30% chance per turn to trigger a random event.</summary>
    public static GameEvent? RollForEvent()
    {
        if (Rng.NextDouble() > 0.30) return null;
        var template = Pool[Rng.Next(Pool.Length)];
        return new GameEvent
        {
            Id = $"{template.Id}_{_eventCounter++}",
            Name = template.Name,
            Description = template.Description,
            Effects = new(template.Effects),
            Duration = template.Duration,
            ApprovalImpact = template.ApprovalImpact,
        };
    }
}
