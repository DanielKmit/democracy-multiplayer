using DemocracyGame.Models;

namespace DemocracyGame.Engine;

/// <summary>
/// International relations — 3 foreign nations with trade, diplomacy, incidents.
/// Port of internationalRelations.ts.
/// </summary>
public static class DiplomacyEngine
{
    private static readonly Random Rng = new();

    private record ForeignNation(string Id, string Name, string Description,
        int EconomicPower, int MilitaryPower, double DefaultRelation, double TradeWeight);

    private static readonly ForeignNation[] Nations = new ForeignNation[]
    {
        new("westland", "Westland", "Wealthy liberal democracy with strong trade ties", 85, 60, 65, 0.4),
        new("eastland", "Eastland", "Authoritarian power with massive military", 60, 90, 40, 0.3),
        new("southland", "Southland", "Developing nation with abundant natural resources", 35, 30, 55, 0.2),
    };

    private static readonly DiplomaticIncident[] IncidentPool = new DiplomaticIncident[]
    {
        new() { Id = "westland_trade_dispute", NationId = "westland", Title = "Trade Dispute with Westland",
            Description = "Westland threatens tariffs over trade imbalance.",
            OptionA = new() { Label = "Negotiate", RelationDelta = 5, Effects = new() { [SimVar.GdpGrowth] = -0.5 } },
            OptionB = new() { Label = "Retaliate", RelationDelta = -15, Effects = new() { [SimVar.GdpGrowth] = -1 } } },
        new() { Id = "eastland_border", NationId = "eastland", Title = "Border Tension with Eastland",
            Description = "Eastland mobilizes troops near the border.",
            OptionA = new() { Label = "Diplomatic Protest", RelationDelta = -5, Effects = new() { [SimVar.NationalSecurity] = -3 } },
            OptionB = new() { Label = "Mobilize Military", RelationDelta = -20, Effects = new() { [SimVar.NationalSecurity] = 5, [SimVar.GdpGrowth] = -1 } } },
        new() { Id = "southland_aid", NationId = "southland", Title = "Humanitarian Crisis in Southland",
            Description = "Southland requests emergency aid after natural disaster.",
            OptionA = new() { Label = "Send Aid", RelationDelta = 20, Effects = new() { [SimVar.GdpGrowth] = -0.3 } },
            OptionB = new() { Label = "Express Sympathy", RelationDelta = -10, Effects = new() } },
        new() { Id = "westland_alliance", NationId = "westland", Title = "Alliance Request from Westland",
            Description = "Westland proposes a formal military alliance.",
            OptionA = new() { Label = "Accept Alliance", RelationDelta = 15, Effects = new() { [SimVar.NationalSecurity] = 5, [SimVar.FreedomIndex] = -2 } },
            OptionB = new() { Label = "Remain Neutral", RelationDelta = -5, Effects = new() } },
        new() { Id = "eastland_spy", NationId = "eastland", Title = "Spy Scandal with Eastland",
            Description = "Eastland spies caught in the capital.",
            OptionA = new() { Label = "Expel Diplomats", RelationDelta = -25, Effects = new() { [SimVar.NationalSecurity] = 3, [SimVar.Corruption] = -2 } },
            OptionB = new() { Label = "Quiet Channel", RelationDelta = -5, Effects = new() { [SimVar.Corruption] = 2 } } },
        new() { Id = "southland_resources", NationId = "southland", Title = "Resource Deal with Southland",
            Description = "Southland offers exclusive access to rare minerals.",
            OptionA = new() { Label = "Accept Deal", RelationDelta = 10, Effects = new() { [SimVar.GdpGrowth] = 1 } },
            OptionB = new() { Label = "Demand Better Terms", RelationDelta = -5, Effects = new() { [SimVar.GdpGrowth] = 0.5 } } },
    };

    public static List<DiplomaticRelation> CreateInitialRelations()
    {
        return Nations.Select(n => new DiplomaticRelation
        {
            NationId = n.Id,
            Relation = n.DefaultRelation,
        }).ToList();
    }

    /// <summary>Update relations each turn based on policies.</summary>
    public static void UpdateRelations(
        List<DiplomaticRelation> relations,
        Dictionary<string, int> policies,
        SimulationState sim)
    {
        var foreignAid = policies.GetValueOrDefault("foreign_aid", 25);
        var tradeOpenness = policies.GetValueOrDefault("trade_openness", 60);
        var military = policies.GetValueOrDefault("military", 40);

        foreach (var rel in relations)
        {
            var nation = Nations.FirstOrDefault(n => n.Id == rel.NationId);
            if (nation == null) continue;

            // Foreign aid improves all relations
            if (foreignAid > 50) rel.Relation += 1;

            // Trade openness helps
            if (tradeOpenness > 60) rel.Relation += 0.5;

            // Military effects vary by nation
            if (military > 60 && nation.Id == "eastland") rel.Relation += 0.5; // Respects strength
            if (military > 75 && nation.Id == "westland") rel.Relation -= 0.5; // Worries about militarism

            // Active trade deals improve relations
            if (rel.ActiveDeal != null)
            {
                rel.Relation += 0.5;
                rel.ActiveDeal.TurnsRemaining--;
                if (rel.ActiveDeal.TurnsRemaining <= 0) rel.ActiveDeal = null;
            }

            // Natural drift toward default
            var diff = nation.DefaultRelation - rel.Relation;
            rel.Relation += Math.Sign(diff) * Math.Min(0.3, Math.Abs(diff));

            // War threat check
            rel.WarThreat = rel.Relation < 20 && nation.MilitaryPower > 50;

            rel.Relation = Math.Clamp(rel.Relation, 0, 100);
        }
    }

    /// <summary>Sign a trade deal (requires relation >= 40).</summary>
    public static TradeDeal? SignTradeDeal(List<DiplomaticRelation> relations, string nationId)
    {
        var rel = relations.Find(r => r.NationId == nationId);
        var nation = Nations.FirstOrDefault(n => n.Id == nationId);
        if (rel == null || nation == null || rel.Relation < 40) return null;

        var deal = new TradeDeal
        {
            NationId = nationId,
            GdpBonus = nation.TradeWeight * (rel.Relation / 100.0) * 2,
            UnemploymentEffect = nation.EconomicPower > 60 ? 0.5 : -0.3,
            TurnsRemaining = 8,
        };
        rel.ActiveDeal = deal;
        rel.HasTradeAgreement = true;
        return deal;
    }

    /// <summary>Send foreign aid — improves relation by amount * 5.</summary>
    public static void SendForeignAid(List<DiplomaticRelation> relations, string nationId, double amount)
    {
        var rel = relations.Find(r => r.NationId == nationId);
        if (rel == null) return;
        rel.Relation = Math.Min(100, rel.Relation + amount * 5);
        rel.HasForeignAid = true;
        rel.AidAmount += amount;
    }

    /// <summary>15% chance per turn to trigger a diplomatic incident.</summary>
    public static DiplomaticIncident? RollForIncident(List<DiplomaticRelation> relations)
    {
        if (Rng.NextDouble() > 0.15) return null;
        var eligible = IncidentPool.Where(i =>
            relations.Any(r => r.NationId == i.NationId)).ToList();
        return eligible.Count > 0 ? eligible[Rng.Next(eligible.Count)] : null;
    }

    /// <summary>Get GDP/unemployment effects from all active trade deals.</summary>
    public static (double gdpBonus, double unemploymentEffect) GetTradeEffects(List<DiplomaticRelation> relations)
    {
        double gdp = 0, unemp = 0;
        foreach (var rel in relations)
        {
            if (rel.ActiveDeal == null) continue;
            gdp += rel.ActiveDeal.GdpBonus;
            unemp += rel.ActiveDeal.UnemploymentEffect;
        }
        return (gdp, unemp);
    }
}
