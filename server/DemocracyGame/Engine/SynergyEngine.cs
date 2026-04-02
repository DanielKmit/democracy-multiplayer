using DemocracyGame.Models;

namespace DemocracyGame.Engine;

/// <summary>
/// Policy synergies — 10 combos that trigger bonus/penalty effects.
/// Port of policySynergies.ts.
/// </summary>
public static class SynergyEngine
{
    private record SynergyDef(
        string Id, string Name, string Icon,
        Func<Dictionary<string, int>, bool> Condition,
        Dictionary<SimVar, double> Effects,
        double ApprovalBonus);

    private static readonly SynergyDef[] Synergies = new SynergyDef[]
    {
        new("innovation_hub", "Innovation Hub", "💡",
            p => p.GetValueOrDefault("education", 50) >= 70 && p.GetValueOrDefault("tech_research", 35) >= 70,
            new() { [SimVar.GdpGrowth] = 2, [SimVar.EducationIndex] = 5 }, 3),

        new("police_state", "Police State", "🔒",
            p => p.GetValueOrDefault("military", 40) >= 70 && p.GetValueOrDefault("police", 50) >= 70 && p.GetValueOrDefault("civil_rights", 60) <= 30,
            new() { [SimVar.Crime] = -15, [SimVar.FreedomIndex] = -10 }, -5),

        new("social_democracy", "Social Democracy", "🏥",
            p => p.GetValueOrDefault("healthcare", 50) >= 70 && p.GetValueOrDefault("income_tax", 40) >= 60 && p.GetValueOrDefault("unemployment_benefits", 40) >= 60,
            new() { [SimVar.Equality] = 10, [SimVar.HealthIndex] = 5, [SimVar.GdpGrowth] = -1 }, 2),

        new("green_revolution", "Green Revolution", "🌱",
            p => p.GetValueOrDefault("env_regulations", 40) >= 70 && p.GetValueOrDefault("renewables", 30) >= 70 && p.GetValueOrDefault("carbon_tax", 20) >= 50,
            new() { [SimVar.Pollution] = -15, [SimVar.GdpGrowth] = -1, [SimVar.HealthIndex] = 5 }, 2),

        new("free_market_paradise", "Free Market Paradise", "📈",
            p => p.GetValueOrDefault("income_tax", 40) <= 30 && p.GetValueOrDefault("corporate_tax", 30) <= 25 && p.GetValueOrDefault("trade_openness", 60) >= 75,
            new() { [SimVar.GdpGrowth] = 3, [SimVar.Equality] = -8, [SimVar.Unemployment] = -2 }, 1),

        new("fortress_nation", "Fortress Nation", "🏰",
            p => p.GetValueOrDefault("border_security", 45) >= 75 && p.GetValueOrDefault("military", 40) >= 70 && p.GetValueOrDefault("immigration", 50) <= 25,
            new() { [SimVar.NationalSecurity] = 10, [SimVar.GdpGrowth] = -2, [SimVar.FreedomIndex] = -5 }, -1),

        new("welfare_state_crisis", "Welfare State Crisis", "💸",
            p => p.GetValueOrDefault("govt_spending", 50) >= 75 && p.GetValueOrDefault("income_tax", 40) <= 30 && p.GetValueOrDefault("corporate_tax", 30) <= 25,
            new() { [SimVar.Inflation] = 5, [SimVar.GdpGrowth] = -2 }, -3),

        new("digital_society", "Digital Society", "💻",
            p => p.GetValueOrDefault("tech_research", 35) >= 70 && p.GetValueOrDefault("education", 50) >= 65 && p.GetValueOrDefault("press_freedom", 65) >= 70,
            new() { [SimVar.GdpGrowth] = 1.5, [SimVar.Corruption] = -5, [SimVar.EducationIndex] = 3 }, 2),

        new("crime_wave", "Crime Wave", "🔫",
            p => p.GetValueOrDefault("police", 50) <= 30 && p.GetValueOrDefault("drug_policy", 30) >= 75,
            new() { [SimVar.Crime] = 15, [SimVar.FreedomIndex] = 3 }, -4),

        new("healthcare_excellence", "Healthcare Excellence", "❤️",
            p => p.GetValueOrDefault("healthcare", 50) >= 75 && p.GetValueOrDefault("housing_subsidies", 30) >= 60,
            new() { [SimVar.HealthIndex] = 10, [SimVar.Equality] = 3 }, 3),
    };

    /// <summary>Check which synergies are active given current policies.</summary>
    public static List<ActiveSynergy> CheckActiveSynergies(Dictionary<string, int> policies)
    {
        var result = new List<ActiveSynergy>();
        foreach (var s in Synergies)
        {
            if (s.Condition(policies))
            {
                result.Add(new ActiveSynergy
                {
                    SynergyId = s.Id,
                    Name = s.Name,
                    Icon = s.Icon,
                    Effects = new(s.Effects),
                    ApprovalBonus = s.ApprovalBonus,
                });
            }
        }
        return result;
    }

    /// <summary>Apply active synergy effects to simulation state.</summary>
    public static void ApplyEffects(SimulationState sim, List<ActiveSynergy> synergies)
    {
        foreach (var synergy in synergies)
        {
            foreach (var (key, val) in synergy.Effects)
                sim[key] += val;
        }
    }
}
