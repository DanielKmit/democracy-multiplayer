using DemocracyGame.Models;

namespace DemocracyGame.Data;

public static class BotPartyData
{
    public static readonly BotParty[] All = new BotParty[]
    {
        new() { Id = "bot_green", Name = "Green Alliance", Color = "#22C55E", LeaderName = "Petra Lindström",
            EconomicAxis = 35, SocialAxis = 80, Logo = PartyLogo.Tree,
            Manifesto = new() { "Environmental protection", "Green energy", "Social equality" },
            PolicyPreferences = new() { ["env_regulations"] = 90, ["renewables"] = 95, ["carbon_tax"] = 85, ["public_transport"] = 80, ["civil_rights"] = 75, ["press_freedom"] = 80, ["healthcare"] = 70, ["education"] = 70 },
            Concerns = new() { [SimVar.Pollution] = -0.9, [SimVar.HealthIndex] = 0.4, [SimVar.FreedomIndex] = 0.5 } },

        new() { Id = "bot_national", Name = "National Front", Color = "#92400E", LeaderName = "Viktor Halvorsen",
            EconomicAxis = 60, SocialAxis = 15, Logo = PartyLogo.Shield,
            Manifesto = new() { "National sovereignty", "Strong military", "Immigration control" },
            PolicyPreferences = new() { ["military"] = 85, ["border_security"] = 90, ["intelligence"] = 75, ["immigration"] = 15, ["police"] = 75, ["religious_freedom"] = 50, ["gun_control"] = 25, ["foreign_aid"] = 10 },
            Concerns = new() { [SimVar.NationalSecurity] = 0.9, [SimVar.Crime] = -0.6 } },

        new() { Id = "bot_workers", Name = "Workers' Union Party", Color = "#DC2626", LeaderName = "Margareta Brandt",
            EconomicAxis = 20, SocialAxis = 50, Logo = PartyLogo.Fist,
            Manifesto = new() { "Workers rights", "Universal healthcare", "Job creation" },
            PolicyPreferences = new() { ["minimum_wage"] = 85, ["unemployment_benefits"] = 80, ["healthcare"] = 85, ["pensions"] = 80, ["education"] = 75, ["housing_subsidies"] = 75, ["income_tax"] = 55, ["corporate_tax"] = 60 },
            Concerns = new() { [SimVar.Unemployment] = -0.8, [SimVar.Equality] = 0.7, [SimVar.HealthIndex] = 0.4 } },

        new() { Id = "bot_freemarket", Name = "Free Market Party", Color = "#F59E0B", LeaderName = "Maximilian Kohl",
            EconomicAxis = 85, SocialAxis = 65, Logo = PartyLogo.Scales,
            Manifesto = new() { "Lower taxes", "Free trade", "Digital innovation" },
            PolicyPreferences = new() { ["corporate_tax"] = 15, ["income_tax"] = 20, ["trade_openness"] = 90, ["tech_research"] = 85, ["govt_spending"] = 20, ["env_regulations"] = 25, ["minimum_wage"] = 20, ["press_freedom"] = 70 },
            Concerns = new() { [SimVar.GdpGrowth] = 0.9, [SimVar.Unemployment] = -0.3, [SimVar.Inflation] = -0.4 } },

        new() { Id = "bot_centrist", Name = "Democratic Center", Color = "#8B5CF6", LeaderName = "Anna Hoffmann",
            EconomicAxis = 50, SocialAxis = 55, Logo = PartyLogo.Dove,
            Manifesto = new() { "Anti-corruption", "Education reform", "Housing for all" },
            PolicyPreferences = new() { ["education"] = 80, ["housing_subsidies"] = 75, ["healthcare"] = 70, ["civil_rights"] = 65, ["income_tax"] = 45, ["corporate_tax"] = 40, ["press_freedom"] = 75, ["police"] = 55 },
            Concerns = new() { [SimVar.EducationIndex] = 0.7, [SimVar.Corruption] = -0.6, [SimVar.HealthIndex] = 0.4 } },

        new() { Id = "bot_rural", Name = "Farmers' Alliance", Color = "#854D0E", LeaderName = "Georg Mayer",
            EconomicAxis = 55, SocialAxis = 35, Logo = PartyLogo.Wheat,
            Manifesto = new() { "Rural development", "Lower taxes", "Religious freedom" },
            PolicyPreferences = new() { ["agriculture"] = 90, ["roads_rail"] = 80, ["trade_openness"] = 40, ["income_tax"] = 30, ["religious_freedom"] = 70, ["immigration"] = 30, ["gun_control"] = 20, ["env_regulations"] = 30 },
            Concerns = new() { [SimVar.GdpGrowth] = 0.4, [SimVar.Unemployment] = -0.5 } },
    };
}
