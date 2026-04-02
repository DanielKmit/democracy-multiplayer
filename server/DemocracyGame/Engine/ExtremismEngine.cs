using DemocracyGame.Models;

namespace DemocracyGame.Engine;

/// <summary>
/// Extremism tracking — 4 extremist groups driven by policy conditions.
/// Assassination mechanics when threat > 80.
/// Port of extremism.ts.
/// </summary>
public static class ExtremismEngine
{
    private static readonly Random Rng = new();

    public static ExtremismState CreateInitial() => new()
    {
        FarLeft = 10, FarRight = 10, Religious = 10, Eco = 10,
        AssassinationAttempted = false, AssassinationSucceeded = false,
    };

    /// <summary>
    /// Update extremism levels based on policies and simulation state.
    /// Each group has drivers that increase/decrease their threat level.
    /// </summary>
    public static ExtremismState Update(
        ExtremismState current,
        Dictionary<string, int> policies,
        SimulationState sim)
    {
        var intel = policies.GetValueOrDefault("intelligence", 30);
        var suppression = intel * 0.3; // Intelligence spending reduces all extremism

        // Far Left: rises with inequality, low wages, corporate power
        var farLeftDrivers = (100 - sim.Equality) * 0.15
            + (100 - policies.GetValueOrDefault("minimum_wage", 50)) * 0.1
            + policies.GetValueOrDefault("corporate_tax", 30) < 20 ? 5 : 0;
        current.FarLeft = Clamp(current.FarLeft + farLeftDrivers * 0.1 - suppression * 0.05, 0, 100);

        // Far Right: rises with immigration, low security, crime
        var farRightDrivers = policies.GetValueOrDefault("immigration", 50) * 0.15
            + sim.Crime * 0.1
            + (100 - policies.GetValueOrDefault("border_security", 45)) * 0.1;
        current.FarRight = Clamp(current.FarRight + farRightDrivers * 0.1 - suppression * 0.05, 0, 100);

        // Religious extremism: rises with religious tension, inequality
        var religiousDrivers = (100 - sim.FreedomIndex) * 0.1
            + (100 - sim.Equality) * 0.1
            + policies.GetValueOrDefault("religious_freedom", 70) > 85 ? 3 : 0;
        current.Religious = Clamp(current.Religious + religiousDrivers * 0.1 - suppression * 0.05, 0, 100);

        // Eco-terrorism: rises with pollution, weak environmental policy
        var ecoDrivers = sim.Pollution * 0.15
            + (100 - policies.GetValueOrDefault("env_regulations", 40)) * 0.1
            + (100 - policies.GetValueOrDefault("renewables", 30)) * 0.05;
        current.Eco = Clamp(current.Eco + ecoDrivers * 0.1 - suppression * 0.05, 0, 100);

        return current;
    }

    /// <summary>
    /// Check if any group attempts assassination (threat > 80).
    /// Intelligence budget provides protection (max 70%).
    /// </summary>
    public static (bool attempted, bool succeeded, string? group) CheckAssassination(
        ExtremismState extremism, int intelligenceBudget)
    {
        var groups = new (ExtremistGroup group, string name, double level)[]
        {
            (ExtremistGroup.FarLeft, "Far-Left Extremists", extremism.FarLeft),
            (ExtremistGroup.FarRight, "Far-Right Extremists", extremism.FarRight),
            (ExtremistGroup.Religious, "Religious Extremists", extremism.Religious),
            (ExtremistGroup.Eco, "Eco-Terrorists", extremism.Eco),
        };

        foreach (var (group, name, level) in groups)
        {
            if (level <= 80) continue;

            // Attempt probability scales with level above 80
            var attemptChance = (level - 80) * 0.025; // 0-50% at levels 80-100
            if (Rng.NextDouble() > attemptChance) continue;

            // Intelligence protection: max 70%
            var protection = Math.Min(0.7, intelligenceBudget / 100.0);
            var succeeded = Rng.NextDouble() > protection;

            return (true, succeeded, name);
        }

        return (false, false, null);
    }

    private static double Clamp(double val, double min, double max) =>
        Math.Min(max, Math.Max(min, val));
}
