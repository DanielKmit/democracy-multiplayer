using DemocracyGame.Models;

namespace DemocracyGame.Data;

public static class RegionData
{
    public static readonly RegionDefinition[] All = new RegionDefinition[]
    {
        new() { Id = "capitalis", Name = "Capitalis",
            Description = "The capital region — urban, wealthy, and cosmopolitan.",
            PopulationShare = 0.25, Seats = 25, EconomicLean = 55, SocialLean = 75,
            DominantGroups = new() { "urban", "business", "liberals", "youth" },
            Characteristics = "Financial hub, tech startups, cultural center",
            KeyIssues = new() { "Housing costs", "Public transport", "Tech economy", "Civil liberties" },
            PolicyWeights = new() { ["urban_dev"] = 2.0, ["public_transport"] = 1.8, ["housing_subsidies"] = 1.6, ["tech_research"] = 1.5, ["civil_rights"] = 1.5, ["press_freedom"] = 1.4, ["corporate_tax"] = 1.3 },
            Demographics = new() { PopulationMillions = 3.2, AgeYoung = 28, AgeMiddle = 45, AgeElderly = 27, AvgIncome = "high", BaseUnemployment = 5.2, UniversityEducated = 52, ReligiousPopulation = 18, UrbanPercent = 95, KeyIndustry = "Finance & Technology",
                VoterGroupBreakdown = new() { ["urban"] = 25, ["liberals"] = 18, ["business"] = 16, ["youth"] = 15, ["workers"] = 12, ["environmentalists"] = 6, ["retirees"] = 8 } } },

        new() { Id = "nordmark", Name = "Nordmark",
            Description = "Industrial heartland — factories, unions, and working-class pride.",
            PopulationShare = 0.20, Seats = 20, EconomicLean = 30, SocialLean = 45,
            DominantGroups = new() { "workers", "retirees", "urban" },
            Characteristics = "Heavy industry, manufacturing, strong unions",
            KeyIssues = new() { "Factory jobs", "Workers rights", "Healthcare", "Pensions" },
            PolicyWeights = new() { ["minimum_wage"] = 2.0, ["unemployment_benefits"] = 1.8, ["healthcare"] = 1.7, ["pensions"] = 1.6, ["education"] = 1.3, ["trade_openness"] = 1.5 },
            Demographics = new() { PopulationMillions = 2.5, AgeYoung = 20, AgeMiddle = 40, AgeElderly = 40, AvgIncome = "medium", BaseUnemployment = 9.5, UniversityEducated = 22, ReligiousPopulation = 30, UrbanPercent = 70, KeyIndustry = "Manufacturing & Heavy Industry",
                VoterGroupBreakdown = new() { ["workers"] = 35, ["retirees"] = 25, ["urban"] = 12, ["youth"] = 8, ["religious"] = 6, ["patriots"] = 6, ["business"] = 4, ["liberals"] = 4 } } },

        new() { Id = "sudfeld", Name = "Sudfeld",
            Description = "Southern agricultural heartland — traditional values, farming communities.",
            PopulationShare = 0.18, Seats = 18, EconomicLean = 60, SocialLean = 30,
            DominantGroups = new() { "rural", "religious", "retirees" },
            Characteristics = "Farmland, vineyards, traditional culture",
            KeyIssues = new() { "Agriculture subsidies", "Religious values", "Immigration control", "Rural infrastructure" },
            PolicyWeights = new() { ["agriculture"] = 2.5, ["religious_freedom"] = 2.0, ["immigration"] = 1.8, ["border_security"] = 1.6, ["roads_rail"] = 1.5, ["gun_control"] = 1.3 },
            Demographics = new() { PopulationMillions = 2.3, AgeYoung = 16, AgeMiddle = 38, AgeElderly = 46, AvgIncome = "low", BaseUnemployment = 7.8, UniversityEducated = 15, ReligiousPopulation = 62, UrbanPercent = 25, KeyIndustry = "Agriculture & Viticulture",
                VoterGroupBreakdown = new() { ["rural"] = 30, ["religious"] = 22, ["retirees"] = 20, ["workers"] = 10, ["patriots"] = 8, ["business"] = 5, ["environmentalists"] = 3, ["liberals"] = 2 } } },

        new() { Id = "ostwald", Name = "Ostwald",
            Description = "Eastern swing region — diverse economy, university towns.",
            PopulationShare = 0.15, Seats = 15, EconomicLean = 50, SocialLean = 50,
            DominantGroups = new() { "workers", "youth", "business" },
            Characteristics = "Mixed economy, university towns, diverse demographics",
            KeyIssues = new() { "Education", "Employment", "Development", "Healthcare" },
            PolicyWeights = new() { ["education"] = 1.8, ["healthcare"] = 1.5, ["govt_spending"] = 1.4, ["tech_research"] = 1.3, ["unemployment_benefits"] = 1.3 },
            Demographics = new() { PopulationMillions = 1.9, AgeYoung = 30, AgeMiddle = 42, AgeElderly = 28, AvgIncome = "medium", BaseUnemployment = 8.1, UniversityEducated = 38, ReligiousPopulation = 25, UrbanPercent = 55, KeyIndustry = "Education & Mixed Services",
                VoterGroupBreakdown = new() { ["youth"] = 22, ["workers"] = 20, ["business"] = 12, ["urban"] = 12, ["liberals"] = 10, ["retirees"] = 10, ["environmentalists"] = 8, ["religious"] = 6 } } },

        new() { Id = "westhafen", Name = "Westhafen",
            Description = "Western coastal region — major port city, international trade hub.",
            PopulationShare = 0.13, Seats = 13, EconomicLean = 65, SocialLean = 60,
            DominantGroups = new() { "business", "liberals", "workers" },
            Characteristics = "Major port city, international trade, shipping industry",
            KeyIssues = new() { "Trade agreements", "Port infrastructure", "Foreign policy", "Environment" },
            PolicyWeights = new() { ["trade_openness"] = 2.5, ["foreign_aid"] = 1.5, ["roads_rail"] = 1.4, ["env_regulations"] = 1.3, ["corporate_tax"] = 1.5, ["immigration"] = 1.2 },
            Demographics = new() { PopulationMillions = 1.6, AgeYoung = 25, AgeMiddle = 48, AgeElderly = 27, AvgIncome = "high", BaseUnemployment = 4.8, UniversityEducated = 40, ReligiousPopulation = 20, UrbanPercent = 85, KeyIndustry = "Trade & Shipping",
                VoterGroupBreakdown = new() { ["business"] = 22, ["workers"] = 18, ["liberals"] = 15, ["urban"] = 15, ["youth"] = 10, ["environmentalists"] = 8, ["retirees"] = 8, ["patriots"] = 4 } } },

        new() { Id = "bergland", Name = "Bergland",
            Description = "Mountainous rural region — traditional, self-reliant, and proud.",
            PopulationShare = 0.09, Seats = 9, EconomicLean = 55, SocialLean = 25,
            DominantGroups = new() { "rural", "religious", "patriots" },
            Characteristics = "Mountain villages, mining, timber, tourism",
            KeyIssues = new() { "Agriculture", "Military/defense", "Traditional values", "Border security" },
            PolicyWeights = new() { ["agriculture"] = 2.0, ["military"] = 1.8, ["border_security"] = 1.7, ["religious_freedom"] = 1.6, ["env_regulations"] = 1.5, ["gun_control"] = 1.5, ["immigration"] = 1.4 },
            Demographics = new() { PopulationMillions = 1.1, AgeYoung = 14, AgeMiddle = 36, AgeElderly = 50, AvgIncome = "low", BaseUnemployment = 11.2, UniversityEducated = 12, ReligiousPopulation = 70, UrbanPercent = 15, KeyIndustry = "Mining, Timber & Tourism",
                VoterGroupBreakdown = new() { ["rural"] = 28, ["religious"] = 20, ["patriots"] = 18, ["retirees"] = 16, ["workers"] = 10, ["business"] = 4, ["environmentalists"] = 2, ["liberals"] = 2 } } },
    };

    public static readonly Dictionary<string, RegionDefinition> ById =
        All.ToDictionary(r => r.Id);
}
