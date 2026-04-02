using DemocracyGame.Models;

namespace DemocracyGame.Data;

/// <summary>
/// 25 dilemmas — binary choice events with tradeoffs.
/// Port of dilemmas.ts.
/// </summary>
public static class DilemmaData
{
    private static readonly Random Rng = new();
    private static readonly HashSet<string> UsedDilemmas = new();
    private static int _dilemmaIndex = 0;

    public static readonly DilemmaDefinition[] All = new DilemmaDefinition[]
    {
        new() { Id = "fracking_bergland", Title = "Fracking in Bergland", Icon = "⛏️",
            Description = "Energy companies want to frack in Bergland's mountains. Economic boost vs environmental damage.",
            OptionA = new() { Label = "Approve Fracking", Description = "Jobs and energy independence",
                Effects = new() { [SimVar.GdpGrowth] = 1.5, [SimVar.Pollution] = 10 },
                VoterEffects = new() { ["business"] = 15, ["environmentalists"] = -25, ["rural"] = 10 } },
            OptionB = new() { Label = "Ban Fracking", Description = "Protect the environment",
                Effects = new() { [SimVar.Pollution] = -5 },
                VoterEffects = new() { ["environmentalists"] = 20, ["business"] = -15, ["rural"] = -10 } },
            DefaultOption = "b", TimeoutSeconds = 30 },

        new() { Id = "whistleblower", Title = "Government Whistleblower", Icon = "🔔",
            Description = "A civil servant leaks evidence of government waste. Protect or prosecute?",
            OptionA = new() { Label = "Prosecute Leaker", Description = "Send a message about loyalty",
                Effects = new() { [SimVar.FreedomIndex] = -5, [SimVar.Corruption] = 5 },
                VoterEffects = new() { ["liberals"] = -20, ["patriots"] = 10 } },
            OptionB = new() { Label = "Protect Whistleblower", Description = "Embrace transparency",
                Effects = new() { [SimVar.FreedomIndex] = 5, [SimVar.Corruption] = -8 },
                VoterEffects = new() { ["liberals"] = 20, ["patriots"] = -10 } },
            DefaultOption = "b", TimeoutSeconds = 30 },

        new() { Id = "refugee_crisis", Title = "Refugee Crisis", Icon = "🚢",
            Description = "Thousands of refugees arrive at the border. Open doors or close them?",
            OptionA = new() { Label = "Welcome Refugees", Description = "Humanitarian duty",
                Effects = new() { [SimVar.FreedomIndex] = 5, [SimVar.Unemployment] = 1 },
                VoterEffects = new() { ["liberals"] = 25, ["patriots"] = -30, ["religious"] = 10 } },
            OptionB = new() { Label = "Close Borders", Description = "Protect domestic interests",
                Effects = new() { [SimVar.NationalSecurity] = 3, [SimVar.FreedomIndex] = -3 },
                VoterEffects = new() { ["patriots"] = 25, ["liberals"] = -25, ["religious"] = -5 } },
            DefaultOption = "a", TimeoutSeconds = 30 },

        new() { Id = "nuclear_plant", Title = "Nuclear Power Plant", Icon = "☢️",
            Description = "Build a nuclear plant? Cheap energy vs safety concerns.",
            OptionA = new() { Label = "Build Plant", Description = "Clean, cheap energy",
                Effects = new() { [SimVar.GdpGrowth] = 1, [SimVar.Pollution] = -8 },
                VoterEffects = new() { ["business"] = 15, ["environmentalists"] = -20 } },
            OptionB = new() { Label = "Invest in Renewables", Description = "Safer green energy",
                Effects = new() { [SimVar.Pollution] = -5, [SimVar.GdpGrowth] = -0.5 },
                VoterEffects = new() { ["environmentalists"] = 20, ["business"] = -10 } },
            DefaultOption = "b", TimeoutSeconds = 30 },

        new() { Id = "teachers_strike", Title = "Teachers' Strike", Icon = "📚",
            Description = "Teachers demand higher pay. Concede or stand firm?",
            OptionA = new() { Label = "Meet Demands", Description = "Invest in education",
                Effects = new() { [SimVar.EducationIndex] = 5, [SimVar.GdpGrowth] = -0.5 },
                VoterEffects = new() { ["workers"] = 15, ["youth"] = 20, ["business"] = -10 } },
            OptionB = new() { Label = "Hold the Line", Description = "Control spending",
                Effects = new() { [SimVar.EducationIndex] = -3 },
                VoterEffects = new() { ["workers"] = -20, ["youth"] = -15, ["business"] = 10 } },
            DefaultOption = "a", TimeoutSeconds = 30 },

        new() { Id = "factory_pollution", Title = "Factory Pollution", Icon = "🏭",
            Description = "Major factory caught illegally dumping waste. Shut it down or fine?",
            OptionA = new() { Label = "Shut Down Factory", Description = "Zero tolerance for pollution",
                Effects = new() { [SimVar.Pollution] = -10, [SimVar.Unemployment] = 2 },
                VoterEffects = new() { ["environmentalists"] = 25, ["workers"] = -20, ["business"] = -15 } },
            OptionB = new() { Label = "Heavy Fine Only", Description = "Punish but preserve jobs",
                Effects = new() { [SimVar.Pollution] = -3, [SimVar.Corruption] = 2 },
                VoterEffects = new() { ["environmentalists"] = -15, ["workers"] = 10, ["business"] = 5 } },
            DefaultOption = "b", TimeoutSeconds = 30 },

        new() { Id = "social_media_ban", Title = "Social Media Regulation", Icon = "📱",
            Description = "Ban a controversial social media platform for spreading misinformation?",
            OptionA = new() { Label = "Ban Platform", Description = "Protect from misinformation",
                Effects = new() { [SimVar.FreedomIndex] = -8, [SimVar.Corruption] = -3 },
                VoterEffects = new() { ["retirees"] = 10, ["liberals"] = -25, ["youth"] = -20 } },
            OptionB = new() { Label = "Regulate, Don't Ban", Description = "Balance freedom and safety",
                Effects = new() { [SimVar.FreedomIndex] = 2 },
                VoterEffects = new() { ["youth"] = 10, ["liberals"] = 15, ["retirees"] = -5 } },
            DefaultOption = "b", TimeoutSeconds = 30 },

        new() { Id = "medical_breakthrough", Title = "Medical Breakthrough", Icon = "💊",
            Description = "Fund experimental treatment — revolutionary but costly and unproven.",
            OptionA = new() { Label = "Fund Treatment", Description = "Invest in breakthrough medicine",
                Effects = new() { [SimVar.HealthIndex] = 8, [SimVar.GdpGrowth] = -1 },
                VoterEffects = new() { ["retirees"] = 15, ["liberals"] = 10 } },
            OptionB = new() { Label = "Wait for Evidence", Description = "Fiscal responsibility",
                Effects = new() { [SimVar.HealthIndex] = 1 },
                VoterEffects = new() { ["business"] = 5, ["retirees"] = -10 } },
            DefaultOption = "a", TimeoutSeconds = 30 },

        new() { Id = "military_intervention", Title = "Foreign Military Intervention", Icon = "⚔️",
            Description = "Ally requests military support against insurgents. Deploy troops or stay out?",
            OptionA = new() { Label = "Deploy Troops", Description = "Support our allies",
                Effects = new() { [SimVar.NationalSecurity] = 5, [SimVar.GdpGrowth] = -1 },
                VoterEffects = new() { ["patriots"] = 25, ["liberals"] = -20, ["youth"] = -15 } },
            OptionB = new() { Label = "Stay Neutral", Description = "Avoid foreign entanglements",
                Effects = new() { [SimVar.NationalSecurity] = -3 },
                VoterEffects = new() { ["patriots"] = -15, ["liberals"] = 15, ["youth"] = 10 } },
            DefaultOption = "b", TimeoutSeconds = 30 },

        new() { Id = "ubi_pilot", Title = "Universal Basic Income Pilot", Icon = "💰",
            Description = "Launch a UBI pilot program in one region?",
            OptionA = new() { Label = "Launch UBI Pilot", Description = "Bold social experiment",
                Effects = new() { [SimVar.Equality] = 5, [SimVar.GdpGrowth] = -0.5, [SimVar.Unemployment] = -1 },
                VoterEffects = new() { ["workers"] = 15, ["youth"] = 10, ["business"] = -20 } },
            OptionB = new() { Label = "Too Risky", Description = "Stick to proven programs",
                Effects = new(),
                VoterEffects = new() { ["workers"] = -5, ["business"] = 10 } },
            DefaultOption = "b", TimeoutSeconds = 30 },

        new() { Id = "surveillance_system", Title = "Mass Surveillance Proposal", Icon = "👁️",
            Description = "Intelligence agencies want to expand surveillance after a security threat.",
            OptionA = new() { Label = "Expand Surveillance", Description = "National security first",
                Effects = new() { [SimVar.NationalSecurity] = 8, [SimVar.FreedomIndex] = -10, [SimVar.Crime] = -5 },
                VoterEffects = new() { ["patriots"] = 20, ["retirees"] = 10, ["liberals"] = -30, ["youth"] = -20 } },
            OptionB = new() { Label = "Protect Privacy", Description = "Civil liberties matter",
                Effects = new() { [SimVar.FreedomIndex] = 5, [SimVar.NationalSecurity] = -3 },
                VoterEffects = new() { ["liberals"] = 25, ["youth"] = 15, ["patriots"] = -15 } },
            DefaultOption = "b", TimeoutSeconds = 30 },

        new() { Id = "pandemic_response", Title = "Pandemic Response", Icon = "🦠",
            Description = "New virus variant detected. Lock down or keep economy open?",
            OptionA = new() { Label = "Full Lockdown", Description = "Save lives at any cost",
                Effects = new() { [SimVar.HealthIndex] = 10, [SimVar.GdpGrowth] = -3, [SimVar.Unemployment] = 3 },
                VoterEffects = new() { ["retirees"] = 20, ["workers"] = -15, ["business"] = -25 } },
            OptionB = new() { Label = "Keep Economy Open", Description = "Balance health and economy",
                Effects = new() { [SimVar.HealthIndex] = -5, [SimVar.GdpGrowth] = -0.5 },
                VoterEffects = new() { ["business"] = 15, ["workers"] = 5, ["retirees"] = -20 } },
            DefaultOption = "a", TimeoutSeconds = 30 },

        new() { Id = "constitutional_reform", Title = "Constitutional Reform", Icon = "📜",
            Description = "Proposal to reform the constitution to strengthen executive power.",
            OptionA = new() { Label = "Strengthen Executive", Description = "Faster decision-making",
                Effects = new() { [SimVar.FreedomIndex] = -8, [SimVar.Corruption] = 3 },
                VoterEffects = new() { ["patriots"] = 15, ["liberals"] = -30 } },
            OptionB = new() { Label = "Protect Checks & Balances", Description = "Preserve democracy",
                Effects = new() { [SimVar.FreedomIndex] = 3, [SimVar.Corruption] = -2 },
                VoterEffects = new() { ["liberals"] = 20, ["patriots"] = -10 } },
            DefaultOption = "b", TimeoutSeconds = 30 },

        new() { Id = "ai_automation", Title = "AI Automation Wave", Icon = "🤖",
            Description = "AI threatens millions of jobs. Regulate or embrace?",
            OptionA = new() { Label = "Regulate AI", Description = "Protect workers from displacement",
                Effects = new() { [SimVar.Unemployment] = -1, [SimVar.GdpGrowth] = -1 },
                VoterEffects = new() { ["workers"] = 20, ["business"] = -15, ["youth"] = -5 } },
            OptionB = new() { Label = "Embrace AI", Description = "Ride the innovation wave",
                Effects = new() { [SimVar.GdpGrowth] = 2, [SimVar.Unemployment] = 3 },
                VoterEffects = new() { ["business"] = 20, ["youth"] = 10, ["workers"] = -20 } },
            DefaultOption = "b", TimeoutSeconds = 30 },

        new() { Id = "drug_legalization", Title = "Drug Legalization Debate", Icon = "🌿",
            Description = "Growing movement to legalize recreational drugs nationwide.",
            OptionA = new() { Label = "Legalize", Description = "Tax and regulate",
                Effects = new() { [SimVar.FreedomIndex] = 5, [SimVar.Crime] = -8, [SimVar.HealthIndex] = -3 },
                VoterEffects = new() { ["youth"] = 20, ["liberals"] = 25, ["religious"] = -25, ["retirees"] = -15 } },
            OptionB = new() { Label = "Keep Prohibition", Description = "Protect public health",
                Effects = new() { [SimVar.Crime] = 3 },
                VoterEffects = new() { ["religious"] = 15, ["retirees"] = 10, ["youth"] = -15, ["liberals"] = -15 } },
            DefaultOption = "b", TimeoutSeconds = 30 },
    };

    public static readonly Dictionary<string, DilemmaDefinition> ById =
        All.ToDictionary(d => d.Id);

    public static void ResetTracker() { UsedDilemmas.Clear(); _dilemmaIndex = 0; }

    /// <summary>25% chance per turn (starting turn 3) to trigger a dilemma.</summary>
    public static DilemmaDefinition? RollForDilemma(int turn)
    {
        if (turn < 3) return null;
        if (Rng.NextDouble() > 0.25) return null;

        var available = All.Where(d => !UsedDilemmas.Contains(d.Id)).ToList();
        if (available.Count == 0) { UsedDilemmas.Clear(); available = All.ToList(); }

        var dilemma = available[Rng.Next(available.Count)];
        UsedDilemmas.Add(dilemma.Id);
        return dilemma;
    }
}
