using DemocracyGame.Models;
using DemocracyGame.Data;

namespace DemocracyGame.Engine;

/// <summary>
/// Core simulation engine — computes sim variables from policies,
/// voter satisfaction, approval ratings, and budget.
/// Direct port of simulation.ts.
/// </summary>
public static class SimulationEngine
{
    private static readonly Random Rng = new();

    private static double Clamp(double val, double min, double max) =>
        Math.Min(max, Math.Max(min, val));

    // ---- Simulation Core ----

    /// <summary>
    /// Compute simulation state from current policy values and active effects.
    /// Each policy's deviation from center (50) is multiplied by its effect coefficients.
    /// </summary>
    public static SimulationState ComputeSimulation(
        Dictionary<string, int> policies,
        List<ActiveEffect> activeEffects)
    {
        var sim = new SimulationState();

        // Apply policy effects: each policy's deviation from 50 * effect coefficient
        foreach (var policy in PolicyData.All)
        {
            var value = policies.GetValueOrDefault(policy.Id, policy.DefaultValue);
            var deviation = value - 50;
            foreach (var (key, effect) in policy.Effects)
            {
                sim[key] += deviation * effect;
            }
        }

        // Apply active event/dilemma effects
        foreach (var effect in activeEffects)
        {
            if ((effect.Type == EffectType.Event || effect.Type == EffectType.Dilemma)
                && effect.Data.TryGetValue("effects", out var effectsObj)
                && effectsObj is Dictionary<SimVar, double> effectDict)
            {
                foreach (var (key, val) in effectDict)
                {
                    sim[key] += val;
                }
            }
        }

        // Crime subtypes from policies
        var police = policies.GetValueOrDefault("police", 50);
        var gunControl = policies.GetValueOrDefault("gun_control", 50);
        var drugPolicy = policies.GetValueOrDefault("drug_policy", 50);
        var intelligence = policies.GetValueOrDefault("intelligence", 40);
        var inequality = 100 - sim.Equality;

        // Violent crime: driven by inequality, reduced by police + gun control
        sim.ViolentCrime = 35 + (inequality * 0.3) - (police - 50) * 0.3 - (gunControl - 50) * 0.2 + (sim.Unemployment - 8) * 0.5;
        // Property crime: driven by unemployment + inequality, reduced by police
        sim.PropertyCrime = 40 + (sim.Unemployment - 8) * 0.8 + (inequality * 0.2) - (police - 50) * 0.25 - (drugPolicy - 50) * 0.1;
        // White-collar crime: driven by corruption + low regulation, reduced by intelligence
        sim.WhiteCollarCrime = 30 + (sim.Corruption * 0.3) - (intelligence - 40) * 0.3;
        // Overall crime is weighted average
        sim.Crime = sim.ViolentCrime * 0.4 + sim.PropertyCrime * 0.35 + sim.WhiteCollarCrime * 0.25;

        // Clamp all values
        sim.GdpGrowth = Clamp(sim.GdpGrowth, -5, 8);
        sim.Unemployment = Clamp(sim.Unemployment, 0, 30);
        sim.Inflation = Clamp(sim.Inflation, 0, 20);
        sim.ViolentCrime = Clamp(sim.ViolentCrime, 0, 100);
        sim.PropertyCrime = Clamp(sim.PropertyCrime, 0, 100);
        sim.WhiteCollarCrime = Clamp(sim.WhiteCollarCrime, 0, 100);
        sim.Crime = Clamp(sim.Crime, 0, 100);
        sim.Pollution = Clamp(sim.Pollution, 0, 100);
        sim.Equality = Clamp(sim.Equality, 0, 100);
        sim.HealthIndex = Clamp(sim.HealthIndex, 0, 100);
        sim.EducationIndex = Clamp(sim.EducationIndex, 0, 100);
        sim.FreedomIndex = Clamp(sim.FreedomIndex, 0, 100);
        sim.NationalSecurity = Clamp(sim.NationalSecurity, 0, 100);
        sim.Corruption = Clamp(sim.Corruption, 0, 100);

        return sim;
    }

    // ---- Voter Satisfaction ----

    /// <summary>
    /// Compute voter satisfaction for a single party across all voter groups.
    /// Combines policy alignment, sim var concerns, ideological distance, and campaign bonuses.
    /// </summary>
    public static Dictionary<string, double> ComputePartySatisfaction(
        string partyId,
        PartyConfig party,
        bool isRuling,
        Dictionary<string, int> policies,
        SimulationState sim,
        List<ActiveEffect> activeEffects,
        List<NGOAlliance> ngoAlliances,
        Dictionary<string, double>? campaignBonuses,
        Dictionary<string, double>? perception)
    {
        var result = new Dictionary<string, double>();

        foreach (var group in VoterData.All)
        {
            double satisfaction = 50; // Base

            // 1. Policy alignment (ruling party only)
            if (isRuling)
            {
                double policyScore = 0;
                int policyCount = 0;
                foreach (var (policyId, preferred) in group.PolicyPreferences)
                {
                    var actual = policies.GetValueOrDefault(policyId, 50);
                    var distance = Math.Abs(actual - preferred);
                    // Each point of distance reduces satisfaction
                    policyScore -= distance * 0.15;
                    policyCount++;
                }
                if (policyCount > 0)
                    satisfaction += policyScore / policyCount;
            }

            // 2. Sim var concerns — use perception if available
            foreach (var (simVar, weight) in group.Concerns)
            {
                var actual = sim[simVar];
                var perceived = perception?.GetValueOrDefault(simVar.ToString(), actual) ?? actual;
                // Positive weight = voter wants this high; negative = wants it low
                var normalizedValue = (perceived - 50) / 50.0; // -1 to +1
                satisfaction += normalizedValue * weight * 20;
            }

            // 3. Ideological alignment
            var econDist = Math.Abs(party.EconomicAxis - GetGroupEconomicLean(group));
            var socialDist = Math.Abs(party.SocialAxis - GetGroupSocialLean(group));
            var ideologyPenalty = (econDist + socialDist) / 200.0 * 15;
            satisfaction -= ideologyPenalty;

            // 4. Campaign bonuses
            if (campaignBonuses != null && campaignBonuses.TryGetValue(group.Id, out var bonus))
                satisfaction += bonus;

            // 5. NGO alliances
            foreach (var alliance in ngoAlliances)
            {
                if (alliance.GroupId == group.Id)
                    satisfaction += alliance.Bonus;
            }

            // 6. Complacency penalty — high satisfaction leads to voter apathy
            if (satisfaction > 70)
            {
                var complacencyPenalty = (satisfaction - 70) * 0.008;
                satisfaction -= complacencyPenalty * 100; // Scale to percentage
            }

            result[group.Id] = Clamp(satisfaction, 0, 100);
        }

        return result;
    }

    /// <summary>
    /// Compute satisfaction for ALL parties (human players + bots).
    /// </summary>
    public static Dictionary<string, Dictionary<string, double>> ComputeAllVoterSatisfaction(
        List<Player> players,
        Dictionary<string, int> policies,
        SimulationState sim,
        List<ActiveEffect> activeEffects,
        List<NGOAlliance> ngoAlliances,
        List<BotParty> botParties,
        Dictionary<string, Dictionary<string, double>> campaignBonuses,
        Dictionary<string, double> perception)
    {
        var result = new Dictionary<string, Dictionary<string, double>>();

        foreach (var player in players)
        {
            var bonuses = campaignBonuses.GetValueOrDefault(player.Id);
            result[player.Id] = ComputePartySatisfaction(
                player.Id, player.Party, player.Role == PlayerRole.Ruling,
                policies, sim, activeEffects, ngoAlliances, bonuses, perception);
        }

        foreach (var bot in botParties)
        {
            var botParty = new PartyConfig
            {
                EconomicAxis = bot.EconomicAxis,
                SocialAxis = bot.SocialAxis,
            };
            result[bot.Id] = ComputePartySatisfaction(
                bot.Id, botParty, false,
                policies, sim, activeEffects, ngoAlliances, null, perception);
        }

        return result;
    }

    // ---- Approval Rating ----

    /// <summary>
    /// Compute overall approval rating for each party as weighted average of group satisfactions.
    /// </summary>
    public static Dictionary<string, double> ComputeApprovalRatings(
        Dictionary<string, Dictionary<string, double>> voterSatisfaction)
    {
        var result = new Dictionary<string, double>();
        foreach (var (partyId, groupSats) in voterSatisfaction)
        {
            double weightedSum = 0;
            double totalWeight = 0;
            foreach (var group in VoterData.All)
            {
                if (groupSats.TryGetValue(group.Id, out var sat))
                {
                    weightedSum += sat * group.PopulationShare;
                    totalWeight += group.PopulationShare;
                }
            }
            result[partyId] = totalWeight > 0 ? weightedSum / totalWeight : 50;
        }
        return result;
    }

    // ---- Full Recalculate ----

    /// <summary>
    /// Master recalculate — updates simulation, satisfaction, approval, and budget.
    /// Called after every action that modifies policies or effects.
    /// </summary>
    public static void Recalculate(GameState state)
    {
        // 1. Recompute simulation from policies
        state.Simulation = ComputeSimulation(state.Policies, state.ActiveEffects);

        // 2. Recompute voter satisfaction for all parties
        state.VoterSatisfaction = ComputeAllVoterSatisfaction(
            state.Players, state.Policies, state.Simulation,
            state.ActiveEffects, state.NgoAlliances, state.BotParties,
            state.CampaignBonuses, state.Perception);

        // 3. Compute approval ratings
        state.ApprovalRating = ComputeApprovalRatings(state.VoterSatisfaction);

        // 4. Update ruling approval shorthand
        var ruling = state.Players.Find(p => p.Role == PlayerRole.Ruling);
        if (ruling != null)
            state.RulingApproval = Math.Round(state.ApprovalRating.GetValueOrDefault(ruling.Id, 50), 0);

        // 5. Compute regional satisfaction
        state.RegionalSatisfaction = ComputeRegionalSatisfaction(
            state.Policies, state.VoterSatisfaction, state.Players);

        // 6. Recompute budget
        state.Budget = BudgetEngine.CalculateBudget(state.Policies, state.Simulation, state.Budget);

        // 7. Update vote shares
        state.VoteShares = ComputeVoteShares(state);
    }

    // ---- Regional Satisfaction ----

    public static Dictionary<string, Dictionary<string, double>> ComputeRegionalSatisfaction(
        Dictionary<string, int> policies,
        Dictionary<string, Dictionary<string, double>> voterSatisfaction,
        List<Player> players)
    {
        var result = new Dictionary<string, Dictionary<string, double>>();
        foreach (var region in RegionData.All)
        {
            var regionSats = new Dictionary<string, double>();
            foreach (var player in players)
            {
                if (!voterSatisfaction.TryGetValue(player.Id, out var groupSats)) continue;
                double weightedSat = 0;
                double totalWeight = 0;
                foreach (var (groupId, share) in region.Demographics.VoterGroupBreakdown)
                {
                    if (groupSats.TryGetValue(groupId, out var sat))
                    {
                        weightedSat += sat * share;
                        totalWeight += share;
                    }
                }
                regionSats[player.Id] = totalWeight > 0 ? weightedSat / totalWeight : 50;
            }
            result[region.Id] = regionSats;
        }
        return result;
    }

    // ---- Vote Shares ----

    public static Dictionary<string, double> ComputeVoteShares(GameState state)
    {
        var shares = new Dictionary<string, double>();
        double total = 0;

        foreach (var player in state.Players)
        {
            var approval = state.ApprovalRating.GetValueOrDefault(player.Id, 50);
            shares[player.Id] = approval;
            total += approval;
        }
        foreach (var bot in state.BotParties)
        {
            var approval = state.ApprovalRating.GetValueOrDefault(bot.Id, 20);
            shares[bot.Id] = approval;
            total += approval;
        }

        // Normalize to 100%
        if (total > 0)
        {
            foreach (var key in shares.Keys.ToList())
                shares[key] = shares[key] / total * 100;
        }

        return shares;
    }

    // ---- Helper: estimate voter group ideology ----

    private static int GetGroupEconomicLean(VoterGroupDefinition group)
    {
        // Infer from policy preferences — high corporate_tax pref = left, low = right
        var corpTax = group.PolicyPreferences.GetValueOrDefault("corporate_tax", 50);
        var tradePref = group.PolicyPreferences.GetValueOrDefault("trade_openness", 50);
        return (int)((100 - corpTax + tradePref) / 2);
    }

    private static int GetGroupSocialLean(VoterGroupDefinition group)
    {
        var civilRights = group.PolicyPreferences.GetValueOrDefault("civil_rights", 50);
        var drugPolicy = group.PolicyPreferences.GetValueOrDefault("drug_policy", 50);
        return (int)((civilRights + drugPolicy) / 2);
    }
}
