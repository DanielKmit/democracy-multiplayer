using DemocracyGame.Models;
using DemocracyGame.Data;

namespace DemocracyGame.Engine;

/// <summary>
/// AI decision engine — makes decisions for AI-controlled players across all phases.
/// Port of ai.ts.
/// </summary>
public static class AIEngine
{
    private static readonly Random Rng = new();

    public record AIDecision(string Action, object? Payload, string Description);

    /// <summary>
    /// AI personality determines playstyle aggressiveness and ideology.
    /// </summary>
    public record AIPersonality(string Ideology, double Aggressiveness);

    public static AIPersonality CreatePersonality(string? ideology) => new(
        ideology ?? "center",
        ideology switch { "left" => 0.6, "right" => 0.6, _ => 0.4 });

    /// <summary>
    /// Main AI entry point — routes by current game phase.
    /// Returns null if AI should wait/pass.
    /// </summary>
    public static AIDecision? MakeDecision(GameState state, Player aiPlayer, AIPersonality personality)
    {
        return state.Phase switch
        {
            TurnPhase.Ruling when aiPlayer.Role == PlayerRole.Ruling => MakeRulingDecision(state, aiPlayer, personality),
            TurnPhase.Opposition when aiPlayer.Role == PlayerRole.Opposition => MakeOppositionDecision(state, aiPlayer, personality),
            TurnPhase.Campaigning => MakeCampaignDecision(state, aiPlayer, personality),
            TurnPhase.Events => new AIDecision("endTurnPhase", null, "AI acknowledges events"),
            TurnPhase.Dilemma => MakeDilemmaDecision(state, aiPlayer, personality),
            TurnPhase.GovernmentFormation => new AIDecision("endTurnPhase", null, "AI forms government"),
            TurnPhase.CoalitionNegotiation => new AIDecision("endTurnPhase", null, "AI skips coalition"),
            TurnPhase.Polling => new AIDecision("endTurnPhase", null, "AI continues"),
            _ => null,
        };
    }

    // ---- Ruling Phase ----

    private static AIDecision? MakeRulingDecision(GameState state, Player ai, AIPersonality personality)
    {
        if (ai.PoliticalCapital < 1)
            return new AIDecision("endTurnPhase", null, "AI ends turn (no PC)");

        // Find best policy to change based on ideology + crisis response
        var bestChange = FindBestPolicyChange(state, ai, personality);
        if (bestChange != null)
        {
            return new AIDecision("submitPolicyChanges", new List<PolicyChange> { bestChange },
                $"AI adjusts {bestChange.PolicyId} to {bestChange.NewValue}");
        }

        return new AIDecision("endTurnPhase", null, "AI ends ruling turn");
    }

    private static PolicyChange? FindBestPolicyChange(GameState state, Player ai, AIPersonality personality)
    {
        var weakest = FindWeakestSimVar(state.Simulation);
        double bestScore = 0;
        PolicyChange? bestChange = null;

        foreach (var policy in PolicyData.All)
        {
            var currentVal = state.Policies.GetValueOrDefault(policy.Id, policy.DefaultValue);

            // Determine target based on ideology
            var target = personality.Ideology switch
            {
                "left" => GetLeftTarget(policy.Id),
                "right" => GetRightTarget(policy.Id),
                _ => 50, // centrist
            };

            // Crisis response: if a sim var is very bad, prioritize policies that fix it
            foreach (var (simVar, effect) in policy.Effects)
            {
                if (simVar == weakest.simVar)
                {
                    // If the bad var needs to go down (crime, pollution), push policy up if effect is negative
                    if (weakest.needsDecrease && effect < 0) target = Math.Max(target, 75);
                    if (!weakest.needsDecrease && effect > 0) target = Math.Max(target, 75);
                }
            }

            var delta = target - currentVal;
            if (Math.Abs(delta) < 10) continue;

            // Cost: 1 PC per 25 points of change
            var newValue = currentVal + Math.Sign(delta) * 25;
            newValue = Math.Clamp(newValue, 0, 100);
            var cost = 1;

            if (cost > ai.PoliticalCapital) continue;

            var score = Math.Abs(delta) * (1 + personality.Aggressiveness);
            if (score > bestScore)
            {
                bestScore = score;
                bestChange = new PolicyChange
                {
                    PolicyId = policy.Id,
                    OldValue = currentVal,
                    NewValue = newValue,
                    Cost = cost,
                };
            }
        }

        return bestChange;
    }

    // ---- Opposition Phase ----

    private static AIDecision MakeOppositionDecision(GameState state, Player ai, AIPersonality personality)
    {
        var actions = new List<OppositionAction>();

        // Media attack on weakest government metric
        if (ai.PoliticalCapital >= 2)
        {
            var weakest = FindWeakestSimVar(state.Simulation);
            actions.Add(new OppositionAction
            {
                Type = OppositionActionType.MediaAttack,
                Cost = 2,
                TargetSimVar = weakest.simVar,
            });
        }

        // Campaign in a region with low support
        if (ai.PoliticalCapital >= 3)
        {
            var worstRegion = FindWorstRegion(state, ai.Id);
            if (worstRegion != null)
            {
                actions.Add(new OppositionAction
                {
                    Type = OppositionActionType.Campaign,
                    Cost = 1,
                    TargetRegionId = worstRegion,
                });
            }
        }

        if (actions.Count > 0)
            return new AIDecision("submitOppositionActions", actions, "AI opposition actions");

        return new AIDecision("endTurnPhase", null, "AI passes opposition turn");
    }

    // ---- Campaign Phase ----

    private static AIDecision MakeCampaignDecision(GameState state, Player ai, AIPersonality personality)
    {
        var actions = new List<CampaignAction>();

        // Target the weakest region
        if (ai.PoliticalCapital >= 2)
        {
            var worstRegion = FindWorstRegion(state, ai.Id);
            if (worstRegion != null)
            {
                actions.Add(new CampaignAction
                {
                    Type = CampaignActionType.CampaignRally,
                    Cost = 2,
                    TargetRegionId = worstRegion,
                });
            }
        }

        // Media blitz in a swing region
        if (ai.PoliticalCapital >= 3)
        {
            actions.Add(new CampaignAction
            {
                Type = CampaignActionType.MediaBlitz,
                Cost = 3,
            });
        }

        if (actions.Count > 0)
            return new AIDecision("submitCampaignActions", actions, "AI campaigns");

        return new AIDecision("endTurnPhase", null, "AI ends campaign turn");
    }

    // ---- Dilemma Phase ----

    private static AIDecision MakeDilemmaDecision(GameState state, Player ai, AIPersonality personality)
    {
        if (state.ActiveDilemma == null)
            return new AIDecision("endTurnPhase", null, "No dilemma");

        // Choose based on ideology alignment
        var dilemma = DilemmaData.ById.GetValueOrDefault(state.ActiveDilemma.DilemmaId);
        if (dilemma == null)
            return new AIDecision("resolveDilemma", "a", "AI picks option A (default)");

        // Left-leaning AI prefers option with higher equality/freedom effects
        // Right-leaning AI prefers option with higher GDP/security effects
        var scoreA = ScoreDilemmaOption(dilemma.OptionA, personality);
        var scoreB = ScoreDilemmaOption(dilemma.OptionB, personality);

        var choice = scoreA >= scoreB ? "a" : "b";
        return new AIDecision("resolveDilemma", choice, $"AI picks option {choice.ToUpper()}");
    }

    private static double ScoreDilemmaOption(DilemmaOption option, AIPersonality personality)
    {
        double score = 0;
        foreach (var (simVar, effect) in option.Effects)
        {
            var weight = personality.Ideology switch
            {
                "left" => simVar switch
                {
                    SimVar.Equality => 2, SimVar.FreedomIndex => 1.5, SimVar.HealthIndex => 1.5,
                    SimVar.GdpGrowth => 0.5, SimVar.NationalSecurity => 0.3, _ => 1
                },
                "right" => simVar switch
                {
                    SimVar.GdpGrowth => 2, SimVar.NationalSecurity => 1.5, SimVar.Crime => -1.5,
                    SimVar.Equality => 0.3, SimVar.FreedomIndex => 0.5, _ => 1
                },
                _ => 1.0 // center weights all equally
            };
            score += effect * weight;
        }
        return score;
    }

    // ---- Helpers ----

    private static (SimVar simVar, bool needsDecrease) FindWeakestSimVar(SimulationState sim)
    {
        // Vars that are bad when HIGH: crime, pollution, corruption, unemployment, inflation
        var badWhenHigh = new[] { SimVar.Crime, SimVar.Pollution, SimVar.Corruption, SimVar.Unemployment, SimVar.Inflation };
        double worstScore = 0;
        SimVar worstVar = SimVar.GdpGrowth;
        bool needsDecrease = false;

        foreach (var sv in badWhenHigh)
        {
            var val = sim[sv];
            if (val > worstScore) { worstScore = val; worstVar = sv; needsDecrease = true; }
        }

        // Vars that are bad when LOW: gdpGrowth, healthIndex, educationIndex, freedomIndex, nationalSecurity, equality
        var badWhenLow = new[] { SimVar.GdpGrowth, SimVar.HealthIndex, SimVar.EducationIndex, SimVar.FreedomIndex, SimVar.NationalSecurity, SimVar.Equality };
        foreach (var sv in badWhenLow)
        {
            var val = 100 - sim[sv]; // Invert so higher = worse
            if (val > worstScore) { worstScore = val; worstVar = sv; needsDecrease = false; }
        }

        return (worstVar, needsDecrease);
    }

    private static string? FindWorstRegion(GameState state, string playerId)
    {
        string? worst = null;
        double worstSat = 100;

        foreach (var (regionId, sats) in state.RegionalSatisfaction)
        {
            var sat = sats.GetValueOrDefault(playerId, 50);
            if (sat < worstSat) { worstSat = sat; worst = regionId; }
        }

        return worst;
    }

    private static int GetLeftTarget(string policyId) => policyId switch
    {
        "income_tax" => 55, "corporate_tax" => 55, "healthcare" => 80, "education" => 80,
        "minimum_wage" => 70, "unemployment_benefits" => 70, "civil_rights" => 80,
        "press_freedom" => 80, "env_regulations" => 75, "renewables" => 75,
        "police" => 35, "military" => 30, "immigration" => 65, "drug_policy" => 65,
        _ => 50,
    };

    private static int GetRightTarget(string policyId) => policyId switch
    {
        "income_tax" => 25, "corporate_tax" => 20, "trade_openness" => 80,
        "military" => 70, "police" => 70, "border_security" => 75,
        "intelligence" => 60, "gun_control" => 25, "immigration" => 25,
        "env_regulations" => 25, "govt_spending" => 30, "minimum_wage" => 25,
        _ => 50,
    };
}
