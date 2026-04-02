using DemocracyGame.Models;

namespace DemocracyGame.Engine;

/// <summary>
/// Scandal system — random/planted scandals that damage approval and reputation.
/// Port of scandals.ts.
/// </summary>
public static class ScandalEngine
{
    private static readonly Random Rng = new();
    private static int _scandalCounter = 0;

    private static readonly (string title, ScandalType type, double severity, string description)[] Templates = new[]
    {
        ("Embezzlement Scandal", ScandalType.Corruption, 7.0, "Government funds diverted to private accounts."),
        ("Lobbyist Payments Exposed", ScandalType.Corruption, 6.0, "Secret payments from lobbyists revealed."),
        ("Nepotism in Contracts", ScandalType.Corruption, 8.0, "Government contracts awarded to family members."),
        ("Tax Evasion by Officials", ScandalType.Corruption, 5.0, "Senior officials caught evading taxes."),
        ("Personal Affair Exposed", ScandalType.Personal, 4.0, "Leader's private affair becomes public."),
        ("Substance Abuse Allegation", ScandalType.Personal, 5.0, "Allegations of substance abuse surface."),
        ("Plagiarism Scandal", ScandalType.Personal, 3.0, "Academic plagiarism in leader's past revealed."),
        ("Lavish Spending Exposed", ScandalType.Personal, 6.0, "Extravagant lifestyle funded by public money."),
        ("Secret Policy Negotiations", ScandalType.Policy, 5.0, "Backdoor deals discovered in policy process."),
        ("Falsified Statistics", ScandalType.Policy, 7.0, "Government caught manipulating economic data."),
        ("Environmental Cover-Up", ScandalType.Policy, 6.0, "Pollution data suppressed by officials."),
        ("Healthcare Data Manipulation", ScandalType.Policy, 5.0, "Health statistics altered to look better."),
    };

    /// <summary>
    /// 15% base chance per turn, modified by press freedom and corruption.
    /// </summary>
    public static Scandal? RollForScandal(string targetPlayerId, SimulationState sim, int pressFreedom)
    {
        var baseChance = 0.15;
        baseChance += (pressFreedom - 50) * 0.003;  // Press freedom increases exposure
        baseChance += (sim.Corruption - 30) * 0.003; // Corruption increases scandal chance

        if (Rng.NextDouble() > baseChance) return null;

        var template = Templates[Rng.Next(Templates.Length)];
        return new Scandal
        {
            Id = $"scandal_{_scandalCounter++}",
            Type = template.type,
            Title = template.title,
            Description = template.description,
            Severity = template.severity,
            TargetPlayerId = targetPlayerId,
            Planted = false,
            Exposed = true,
            ApprovalImpact = -template.severity * 1.5,
            ReputationImpact = -template.severity,
            TurnsRemaining = 3 + (int)(template.severity / 3),
        };
    }

    /// <summary>
    /// Opposition plants evidence — 40% chance to backfire.
    /// </summary>
    public static (Scandal scandal, bool backfired) PlantEvidence(
        string targetPlayerId, string sourcePlayerId, ScandalType type)
    {
        var backfired = Rng.NextDouble() < 0.4;
        var actualTarget = backfired ? sourcePlayerId : targetPlayerId;
        var severity = 4.0 + Rng.NextDouble() * 4;
        if (backfired) severity += 2; // Backfire = worse

        var scandal = new Scandal
        {
            Id = $"planted_{_scandalCounter++}",
            Type = type,
            Title = backfired ? "Planted Evidence Exposed" : "Opposition Leak",
            Description = backfired
                ? "Attempt to plant evidence backfires spectacularly."
                : "Damaging information leaked about the government.",
            Severity = severity,
            TargetPlayerId = actualTarget,
            SourcePlayerId = sourcePlayerId,
            Planted = true,
            Exposed = true,
            ApprovalImpact = -severity * 1.5,
            ReputationImpact = -severity,
            TurnsRemaining = 3,
        };

        return (scandal, backfired);
    }

    /// <summary>Spin a scandal — halves impact, reduces duration.</summary>
    public static void SpinScandal(Scandal scandal)
    {
        scandal.Spun = true;
        scandal.ApprovalImpact = Math.Max(-1, scandal.ApprovalImpact / 2);
        scandal.ReputationImpact = Math.Max(-1, scandal.ReputationImpact / 2);
        scandal.TurnsRemaining = Math.Max(1, scandal.TurnsRemaining - 1);
    }

    /// <summary>Tick scandals — decrement turns, remove expired.</summary>
    public static List<Scandal> TickScandals(List<Scandal> scandals)
    {
        foreach (var s in scandals) s.TurnsRemaining--;
        return scandals.Where(s => s.TurnsRemaining > 0).ToList();
    }
}
