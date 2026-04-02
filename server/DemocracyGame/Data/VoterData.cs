using DemocracyGame.Models;

namespace DemocracyGame.Data;

public static class VoterData
{
    public static readonly VoterGroupDefinition[] All = new VoterGroupDefinition[]
    {
        new() { Id = "workers", Name = "Workers", PopulationShare = 0.18,
            Concerns = new() { [SimVar.Unemployment] = -0.9, [SimVar.Inflation] = -0.5, [SimVar.Equality] = 0.5, [SimVar.PropertyCrime] = -0.3, [SimVar.GdpGrowth] = 0.2, [SimVar.HealthIndex] = 0.3 },
            PolicyPreferences = new() { ["minimum_wage"] = 80, ["unemployment_benefits"] = 75, ["healthcare"] = 80, ["pensions"] = 70, ["education"] = 60, ["income_tax"] = 30, ["corporate_tax"] = 65, ["housing_subsidies"] = 70, ["trade_openness"] = 35, ["env_regulations"] = 35 } },

        new() { Id = "business", Name = "Business Owners", PopulationShare = 0.12,
            Concerns = new() { [SimVar.GdpGrowth] = 0.9, [SimVar.Inflation] = -0.4, [SimVar.WhiteCollarCrime] = -0.6, [SimVar.Corruption] = -0.5, [SimVar.Unemployment] = -0.2 },
            PolicyPreferences = new() { ["corporate_tax"] = 15, ["income_tax"] = 20, ["trade_openness"] = 85, ["govt_spending"] = 25, ["env_regulations"] = 20, ["tech_research"] = 75, ["minimum_wage"] = 20, ["renewables"] = 30, ["carbon_tax"] = 10, ["press_freedom"] = 55, ["civil_rights"] = 45 } },

        new() { Id = "youth", Name = "Youth & Students", PopulationShare = 0.14,
            Concerns = new() { [SimVar.FreedomIndex] = 0.7, [SimVar.EducationIndex] = 0.8, [SimVar.Unemployment] = -0.6, [SimVar.Pollution] = -0.5 },
            PolicyPreferences = new() { ["education"] = 90, ["civil_rights"] = 85, ["drug_policy"] = 70, ["press_freedom"] = 80, ["tech_research"] = 75, ["renewables"] = 80, ["env_regulations"] = 75, ["housing_subsidies"] = 75, ["income_tax"] = 40, ["military"] = 20, ["immigration"] = 70, ["carbon_tax"] = 60 } },

        new() { Id = "retirees", Name = "Retirees & Elderly", PopulationShare = 0.15,
            Concerns = new() { [SimVar.HealthIndex] = 0.9, [SimVar.ViolentCrime] = -0.7, [SimVar.Inflation] = -0.7, [SimVar.NationalSecurity] = 0.3 },
            PolicyPreferences = new() { ["pensions"] = 90, ["healthcare"] = 90, ["police"] = 70, ["military"] = 55, ["immigration"] = 30, ["income_tax"] = 35, ["drug_policy"] = 20, ["gun_control"] = 55, ["civil_rights"] = 40, ["religious_freedom"] = 65, ["border_security"] = 60 } },

        new() { Id = "urban", Name = "Urban Professionals", PopulationShare = 0.11,
            Concerns = new() { [SimVar.GdpGrowth] = 0.5, [SimVar.PropertyCrime] = -0.5, [SimVar.Pollution] = -0.5, [SimVar.FreedomIndex] = 0.4, [SimVar.EducationIndex] = 0.4 },
            PolicyPreferences = new() { ["public_transport"] = 80, ["urban_dev"] = 75, ["tech_research"] = 70, ["education"] = 70, ["housing_subsidies"] = 50, ["env_regulations"] = 60, ["income_tax"] = 30, ["corporate_tax"] = 35, ["press_freedom"] = 70, ["civil_rights"] = 65, ["trade_openness"] = 65 } },

        new() { Id = "rural", Name = "Rural Communities", PopulationShare = 0.10,
            Concerns = new() { [SimVar.Unemployment] = -0.6, [SimVar.ViolentCrime] = -0.3, [SimVar.Crime] = -0.4, [SimVar.GdpGrowth] = 0.3 },
            PolicyPreferences = new() { ["agriculture"] = 90, ["roads_rail"] = 80, ["border_security"] = 65, ["gun_control"] = 15, ["immigration"] = 25, ["religious_freedom"] = 75, ["income_tax"] = 25, ["corporate_tax"] = 40, ["env_regulations"] = 25, ["public_transport"] = 30, ["civil_rights"] = 35, ["trade_openness"] = 40, ["minimum_wage"] = 35 } },

        new() { Id = "environmentalists", Name = "Environmentalists", PopulationShare = 0.06,
            Concerns = new() { [SimVar.Pollution] = -0.95, [SimVar.HealthIndex] = 0.4, [SimVar.FreedomIndex] = 0.2 },
            PolicyPreferences = new() { ["env_regulations"] = 95, ["renewables"] = 95, ["carbon_tax"] = 90, ["public_transport"] = 80, ["agriculture"] = 35, ["roads_rail"] = 30, ["urban_dev"] = 50, ["military"] = 15, ["trade_openness"] = 40, ["corporate_tax"] = 60, ["tech_research"] = 60 } },

        new() { Id = "religious", Name = "Religious Communities", PopulationShare = 0.05,
            Concerns = new() { [SimVar.ViolentCrime] = -0.4, [SimVar.Crime] = -0.6, [SimVar.FreedomIndex] = -0.3, [SimVar.Equality] = 0.2 },
            PolicyPreferences = new() { ["religious_freedom"] = 95, ["drug_policy"] = 10, ["immigration"] = 35, ["civil_rights"] = 30, ["gun_control"] = 40, ["police"] = 65, ["pensions"] = 65, ["healthcare"] = 60, ["education"] = 55, ["press_freedom"] = 40, ["minimum_wage"] = 55 } },

        new() { Id = "liberals", Name = "Liberals & Progressives", PopulationShare = 0.05,
            Concerns = new() { [SimVar.FreedomIndex] = 0.95, [SimVar.Equality] = 0.7, [SimVar.WhiteCollarCrime] = -0.3, [SimVar.Corruption] = -0.5 },
            PolicyPreferences = new() { ["civil_rights"] = 95, ["press_freedom"] = 90, ["immigration"] = 80, ["drug_policy"] = 80, ["police"] = 25, ["military"] = 20, ["intelligence"] = 15, ["gun_control"] = 75, ["border_security"] = 20, ["income_tax"] = 60, ["corporate_tax"] = 70, ["env_regulations"] = 75, ["healthcare"] = 80, ["education"] = 80 } },

        new() { Id = "patriots", Name = "Patriots & Nationalists", PopulationShare = 0.04,
            Concerns = new() { [SimVar.NationalSecurity] = 0.95, [SimVar.ViolentCrime] = -0.6, [SimVar.PropertyCrime] = -0.4, [SimVar.Crime] = -0.3 },
            PolicyPreferences = new() { ["military"] = 90, ["border_security"] = 90, ["intelligence"] = 80, ["immigration"] = 10, ["foreign_aid"] = 10, ["police"] = 80, ["gun_control"] = 10, ["civil_rights"] = 25, ["press_freedom"] = 30, ["trade_openness"] = 30, ["corporate_tax"] = 30, ["income_tax"] = 30, ["religious_freedom"] = 60 } },
    };

    public static readonly Dictionary<string, VoterGroupDefinition> ById =
        All.ToDictionary(v => v.Id);
}
