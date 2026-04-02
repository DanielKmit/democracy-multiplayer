using DemocracyGame.Models;

namespace DemocracyGame.Data;

/// <summary>
/// 53 situation definitions with trigger conditions, effects, and voter impacts.
/// Port of situations.ts.
/// </summary>
public static class SituationData
{
    public static readonly SituationDefinition[] All;

    static SituationData()
    {
        All = new SituationDefinition[]
        {
            // === ECONOMIC ===
            Sit("debt_crisis", "Debt Crisis", "💸", SituationCategory.Economic, SituationSeverity.Critical,
                (p, s, t, b) => b != null && b.DebtToGdp > 150,
                new() { [SimVar.GdpGrowth] = -3, [SimVar.Inflation] = 5 },
                new() { ["business"] = -20, ["workers"] = -15 }, new[] { "brain_drain" }),

            Sit("economic_boom", "Economic Boom", "📈", SituationCategory.Economic, SituationSeverity.Mild,
                (p, s, t, b) => s.GdpGrowth > 4,
                new() { [SimVar.GdpGrowth] = 1 },
                new() { ["business"] = 15, ["workers"] = 10 }),

            Sit("housing_crisis", "Housing Crisis", "🏠", SituationCategory.Economic, SituationSeverity.Severe,
                (p, s, t, b) => p.GetValueOrDefault("urban_dev", 40) < 35 && p.GetValueOrDefault("housing_subsidies", 30) < 30,
                new() { [SimVar.Equality] = -5 },
                new() { ["youth"] = -15, ["workers"] = -10, ["urban"] = -15 }, new[] { "homelessness" }),

            Sit("brain_drain", "Brain Drain", "🧠", SituationCategory.Economic, SituationSeverity.Moderate,
                (p, s, t, b) => s.EducationIndex > 60 && p.GetValueOrDefault("income_tax", 40) > 65 && s.GdpGrowth < 1,
                new() { [SimVar.EducationIndex] = -5, [SimVar.GdpGrowth] = -1 },
                new() { ["youth"] = -10, ["business"] = -10 }),

            Sit("tech_boom", "Tech Boom", "💻", SituationCategory.Economic, SituationSeverity.Mild,
                (p, s, t, b) => p.GetValueOrDefault("tech_research", 35) > 70 && p.GetValueOrDefault("education", 50) > 60,
                new() { [SimVar.GdpGrowth] = 2, [SimVar.EducationIndex] = 3 },
                new() { ["business"] = 15, ["youth"] = 10 }),

            Sit("hyperinflation", "Hyperinflation", "🔥", SituationCategory.Economic, SituationSeverity.Critical,
                (p, s, t, b) => s.Inflation > 12,
                new() { [SimVar.GdpGrowth] = -4, [SimVar.Equality] = -10 },
                new() { ["workers"] = -25, ["retirees"] = -25, ["business"] = -20 }, new[] { "debt_crisis" }),

            Sit("stock_market_crash", "Stock Market Crash", "📉", SituationCategory.Economic, SituationSeverity.Severe,
                (p, s, t, b) => s.GdpGrowth < -3 && s.Inflation > 8,
                new() { [SimVar.GdpGrowth] = -3, [SimVar.Unemployment] = 3 },
                new() { ["business"] = -25, ["workers"] = -15 }, new[] { "debt_crisis" }),

            Sit("trade_deficit", "Trade Deficit", "⚖️", SituationCategory.Economic, SituationSeverity.Moderate,
                (p, s, t, b) => p.GetValueOrDefault("trade_openness", 60) > 75 && p.GetValueOrDefault("agriculture", 35) < 25,
                new() { [SimVar.GdpGrowth] = -1 },
                new() { ["rural"] = -10, ["business"] = -5 }),

            Sit("wage_stagnation", "Wage Stagnation", "😞", SituationCategory.Economic, SituationSeverity.Moderate,
                (p, s, t, b) => p.GetValueOrDefault("minimum_wage", 40) < 30 && s.Inflation > 5,
                new() { [SimVar.Equality] = -5 },
                new() { ["workers"] = -15, ["youth"] = -10 }),

            Sit("startup_boom", "Startup Boom", "🚀", SituationCategory.Economic, SituationSeverity.Mild,
                (p, s, t, b) => p.GetValueOrDefault("corporate_tax", 30) < 25 && p.GetValueOrDefault("tech_research", 35) > 55,
                new() { [SimVar.GdpGrowth] = 1.5, [SimVar.Unemployment] = -1 },
                new() { ["business"] = 15, ["youth"] = 10 }),

            Sit("economic_miracle", "Economic Miracle", "✨", SituationCategory.Economic, SituationSeverity.Mild,
                (p, s, t, b) => s.GdpGrowth > 6,
                new() { [SimVar.GdpGrowth] = 2 },
                new() { ["business"] = 20, ["workers"] = 15, ["youth"] = 10 }),

            Sit("trade_war", "Trade War", "🏴", SituationCategory.Economic, SituationSeverity.Severe,
                (p, s, t, b) => p.GetValueOrDefault("trade_openness", 60) < 25,
                new() { [SimVar.GdpGrowth] = -2, [SimVar.Inflation] = 3 },
                new() { ["business"] = -20, ["workers"] = -10 }),

            Sit("infrastructure_boom", "Infrastructure Boom", "🏗️", SituationCategory.Economic, SituationSeverity.Mild,
                (p, s, t, b) => p.GetValueOrDefault("roads_rail", 50) > 65 && p.GetValueOrDefault("urban_dev", 40) > 60,
                new() { [SimVar.GdpGrowth] = 1, [SimVar.Unemployment] = -1 },
                new() { ["workers"] = 10, ["urban"] = 10, ["rural"] = 5 }),

            // === SOCIAL ===
            Sit("homelessness", "Homelessness Crisis", "🏚️", SituationCategory.Social, SituationSeverity.Severe,
                (p, s, t, b) => p.GetValueOrDefault("housing_subsidies", 30) < 25 && s.Unemployment > 12,
                new() { [SimVar.Crime] = 5, [SimVar.HealthIndex] = -5 },
                new() { ["workers"] = -10, ["liberals"] = -10, ["urban"] = -15 }),

            Sit("obesity_epidemic", "Obesity Epidemic", "🍔", SituationCategory.Social, SituationSeverity.Moderate,
                (p, s, t, b) => p.GetValueOrDefault("healthcare", 50) < 30,
                new() { [SimVar.HealthIndex] = -10 },
                new() { ["retirees"] = -10, ["workers"] = -5 }),

            Sit("drug_epidemic", "Drug Epidemic", "💉", SituationCategory.Social, SituationSeverity.Severe,
                (p, s, t, b) => p.GetValueOrDefault("drug_policy", 30) < 15 || p.GetValueOrDefault("drug_policy", 30) > 85,
                new() { [SimVar.Crime] = 10, [SimVar.HealthIndex] = -8 },
                new() { ["retirees"] = -15, ["workers"] = -10, ["religious"] = -10 }),

            Sit("religious_tension", "Religious Tension", "⛪", SituationCategory.Social, SituationSeverity.Moderate,
                (p, s, t, b) => p.GetValueOrDefault("religious_freedom", 70) < 25 || p.GetValueOrDefault("religious_freedom", 70) > 90,
                new() { [SimVar.Crime] = 3, [SimVar.FreedomIndex] = -3 },
                new() { ["religious"] = -15, ["liberals"] = -10 }, new[] { "terrorism_threat" }),

            Sit("immigration_crisis", "Immigration Crisis", "🚢", SituationCategory.Social, SituationSeverity.Severe,
                (p, s, t, b) => p.GetValueOrDefault("immigration", 50) > 75 && p.GetValueOrDefault("border_security", 45) < 25,
                new() { [SimVar.Crime] = 5, [SimVar.Unemployment] = 2 },
                new() { ["patriots"] = -25, ["rural"] = -15, ["retirees"] = -10 }),

            Sit("education_crisis", "Education Crisis", "📕", SituationCategory.Social, SituationSeverity.Moderate,
                (p, s, t, b) => p.GetValueOrDefault("education", 50) < 25,
                new() { [SimVar.EducationIndex] = -10 },
                new() { ["youth"] = -20, ["urban"] = -10 }, new[] { "brain_drain" }),

            Sit("healthcare_collapse", "Healthcare Collapse", "🏥", SituationCategory.Social, SituationSeverity.Critical,
                (p, s, t, b) => p.GetValueOrDefault("healthcare", 50) < 20,
                new() { [SimVar.HealthIndex] = -20 },
                new() { ["retirees"] = -30, ["workers"] = -15, ["youth"] = -10 }),

            Sit("media_censorship", "Media Censorship", "🔇", SituationCategory.Social, SituationSeverity.Moderate,
                (p, s, t, b) => p.GetValueOrDefault("press_freedom", 65) < 25,
                new() { [SimVar.FreedomIndex] = -8, [SimVar.Corruption] = 5 },
                new() { ["liberals"] = -25, ["youth"] = -15 }),

            Sit("labor_strikes", "Labor Strikes", "✊", SituationCategory.Social, SituationSeverity.Moderate,
                (p, s, t, b) => p.GetValueOrDefault("minimum_wage", 40) < 20 && p.GetValueOrDefault("unemployment_benefits", 40) < 20,
                new() { [SimVar.GdpGrowth] = -2, [SimVar.Unemployment] = 1 },
                new() { ["workers"] = -20, ["business"] = -10 }),

            Sit("pension_crisis", "Pension Crisis", "👴", SituationCategory.Social, SituationSeverity.Severe,
                (p, s, t, b) => p.GetValueOrDefault("pensions", 45) < 20,
                new() { [SimVar.Equality] = -5 },
                new() { ["retirees"] = -30 }),

            Sit("youth_unemployment", "Youth Unemployment Crisis", "🎓", SituationCategory.Social, SituationSeverity.Severe,
                (p, s, t, b) => s.Unemployment > 15 && s.EducationIndex < 40,
                new() { [SimVar.Crime] = 5, [SimVar.Equality] = -5 },
                new() { ["youth"] = -25 }, new[] { "brain_drain" }),

            Sit("healthcare_excellence_sit", "Healthcare Excellence", "💚", SituationCategory.Social, SituationSeverity.Mild,
                (p, s, t, b) => s.HealthIndex > 85,
                new() { [SimVar.HealthIndex] = 3 },
                new() { ["retirees"] = 15, ["workers"] = 10 }),

            Sit("education_golden_age", "Education Golden Age", "🎓", SituationCategory.Social, SituationSeverity.Mild,
                (p, s, t, b) => s.EducationIndex > 85,
                new() { [SimVar.EducationIndex] = 3, [SimVar.GdpGrowth] = 1 },
                new() { ["youth"] = 15, ["urban"] = 10 }),

            Sit("social_harmony", "Social Harmony", "🕊️", SituationCategory.Social, SituationSeverity.Mild,
                (p, s, t, b) => s.Crime < 10 && s.FreedomIndex > 70,
                new() { [SimVar.Crime] = -3, [SimVar.Equality] = 3 },
                new() { ["liberals"] = 15, ["workers"] = 10, ["youth"] = 10 }),

            // === SECURITY ===
            Sit("terrorism_threat", "Terrorism Threat", "💣", SituationCategory.Security, SituationSeverity.Critical,
                (p, s, t, b) => p.GetValueOrDefault("border_security", 45) < 25 && p.GetValueOrDefault("intelligence", 30) < 20,
                new() { [SimVar.NationalSecurity] = -15, [SimVar.Crime] = 10 },
                new() { ["retirees"] = -20, ["patriots"] = -25, ["rural"] = -10 }),

            Sit("organized_crime", "Organized Crime", "🕵️", SituationCategory.Security, SituationSeverity.Severe,
                (p, s, t, b) => p.GetValueOrDefault("police", 50) < 30 && s.Corruption > 60,
                new() { [SimVar.Crime] = 15, [SimVar.Corruption] = 5 },
                new() { ["business"] = -15, ["urban"] = -15, ["retirees"] = -10 }),

            Sit("military_coup_risk", "Military Coup Risk", "⚔️", SituationCategory.Security, SituationSeverity.Critical,
                (p, s, t, b) => p.GetValueOrDefault("military", 40) > 80 && s.FreedomIndex < 25,
                new() { [SimVar.FreedomIndex] = -10, [SimVar.NationalSecurity] = -5 },
                new() { ["liberals"] = -30, ["youth"] = -20 }),

            Sit("cyberattacks", "Cyberattacks", "💻", SituationCategory.Security, SituationSeverity.Moderate,
                (p, s, t, b) => p.GetValueOrDefault("tech_research", 35) < 20 && p.GetValueOrDefault("intelligence", 30) < 25,
                new() { [SimVar.NationalSecurity] = -8, [SimVar.GdpGrowth] = -1 },
                new() { ["business"] = -10, ["urban"] = -10 }),

            Sit("police_brutality", "Police Brutality", "👮", SituationCategory.Security, SituationSeverity.Moderate,
                (p, s, t, b) => p.GetValueOrDefault("police", 50) > 80 && s.FreedomIndex < 40,
                new() { [SimVar.FreedomIndex] = -5, [SimVar.Crime] = 3 },
                new() { ["liberals"] = -20, ["youth"] = -15, ["patriots"] = 5 }),

            Sit("border_conflict", "Border Conflict", "🛡️", SituationCategory.Security, SituationSeverity.Severe,
                (p, s, t, b) => p.GetValueOrDefault("military", 40) < 20 && p.GetValueOrDefault("border_security", 45) < 20,
                new() { [SimVar.NationalSecurity] = -15 },
                new() { ["patriots"] = -25, ["retirees"] = -15 }),

            Sit("prison_overcrowding", "Prison Overcrowding", "🏢", SituationCategory.Security, SituationSeverity.Moderate,
                (p, s, t, b) => s.Crime > 70,
                new() { [SimVar.Crime] = 5 },
                new() { ["liberals"] = -10, ["religious"] = -5 }),

            Sit("spy_scandal", "Spy Scandal", "🕵️", SituationCategory.Security, SituationSeverity.Severe,
                (p, s, t, b) => p.GetValueOrDefault("intelligence", 30) < 15,
                new() { [SimVar.NationalSecurity] = -10 },
                new() { ["patriots"] = -20, ["retirees"] = -10 }),

            // === ENVIRONMENT ===
            Sit("climate_disaster", "Climate Disaster", "🌊", SituationCategory.Environment, SituationSeverity.Critical,
                (p, s, t, b) => p.GetValueOrDefault("env_regulations", 40) < 25 && t >= 6,
                new() { [SimVar.Pollution] = 10, [SimVar.GdpGrowth] = -2, [SimVar.HealthIndex] = -5 },
                new() { ["environmentalists"] = -25, ["workers"] = -10, ["rural"] = -15 }),

            Sit("water_crisis", "Water Crisis", "💧", SituationCategory.Environment, SituationSeverity.Severe,
                (p, s, t, b) => s.Pollution > 75,
                new() { [SimVar.HealthIndex] = -10, [SimVar.Pollution] = 5 },
                new() { ["rural"] = -15, ["workers"] = -10, ["retirees"] = -10 }),

            Sit("energy_crisis", "Energy Crisis", "⚡", SituationCategory.Environment, SituationSeverity.Severe,
                (p, s, t, b) => p.GetValueOrDefault("renewables", 30) < 15 && p.GetValueOrDefault("carbon_tax", 20) < 10,
                new() { [SimVar.GdpGrowth] = -2, [SimVar.Inflation] = 3 },
                new() { ["business"] = -15, ["workers"] = -10 }),

            Sit("deforestation", "Deforestation", "🌲", SituationCategory.Environment, SituationSeverity.Moderate,
                (p, s, t, b) => p.GetValueOrDefault("env_regulations", 40) < 20 && p.GetValueOrDefault("agriculture", 35) > 70,
                new() { [SimVar.Pollution] = 8 },
                new() { ["environmentalists"] = -20, ["rural"] = 5 }),

            Sit("air_pollution", "Air Pollution Alert", "😷", SituationCategory.Environment, SituationSeverity.Moderate,
                (p, s, t, b) => s.Pollution > 65,
                new() { [SimVar.HealthIndex] = -5 },
                new() { ["urban"] = -10, ["environmentalists"] = -15, ["retirees"] = -10 }),

            Sit("environmental_leader", "Environmental Leader", "🌍", SituationCategory.Environment, SituationSeverity.Mild,
                (p, s, t, b) => s.Pollution < 20 && p.GetValueOrDefault("renewables", 30) > 70,
                new() { [SimVar.Pollution] = -3 },
                new() { ["environmentalists"] = 20, ["youth"] = 10, ["liberals"] = 10 }),

            Sit("green_transition_success", "Green Transition", "🌱", SituationCategory.Environment, SituationSeverity.Mild,
                (p, s, t, b) => p.GetValueOrDefault("renewables", 30) > 75 && p.GetValueOrDefault("carbon_tax", 20) > 60,
                new() { [SimVar.Pollution] = -5, [SimVar.GdpGrowth] = 0.5 },
                new() { ["environmentalists"] = 20, ["business"] = 5 }),
        };
    }

    /// <summary>Check which situations should trigger based on current conditions.</summary>
    public static List<string> CheckSituations(
        Dictionary<string, int> policies, SimulationState sim,
        List<string> activeSituationIds, int turn, BudgetState? budget)
    {
        var triggered = new List<string>();
        foreach (var sit in All)
        {
            if (activeSituationIds.Contains(sit.Id)) continue;
            if (sit.TriggerCondition(policies, sim, turn, budget))
                triggered.Add(sit.Id);
        }
        return triggered;
    }

    /// <summary>Check if a situation should resolve (trigger no longer met).</summary>
    public static bool ShouldResolve(string id, Dictionary<string, int> policies, SimulationState sim, int turn, BudgetState? budget)
    {
        var sit = All.FirstOrDefault(s => s.Id == id);
        return sit != null && !sit.TriggerCondition(policies, sim, turn, budget);
    }

    public static SituationDefinition? GetById(string id) => All.FirstOrDefault(s => s.Id == id);

    // Helper to reduce boilerplate
    private static SituationDefinition Sit(
        string id, string name, string icon,
        SituationCategory cat, SituationSeverity sev,
        Func<Dictionary<string, int>, SimulationState, int, BudgetState?, bool> trigger,
        Dictionary<SimVar, double> effects,
        Dictionary<string, double> voterEffects,
        string[]? cascades = null)
    {
        return new SituationDefinition
        {
            Id = id, Name = name, Icon = icon, Category = cat, Severity = sev,
            TriggerCondition = trigger, Effects = effects, VoterEffects = voterEffects,
            Cascades = cascades?.ToList(),
        };
    }
}
