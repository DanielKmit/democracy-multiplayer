using DemocracyGame.Models;
using DemocracyGame.Data;

namespace DemocracyGame.Engine;

/// <summary>
/// Phase advancement logic — manages the turn flow state machine.
/// Port of advancePhase() from simulation.ts.
/// </summary>
public static class PhaseEngine
{
    private static readonly TurnPhase[] PhaseOrder = new[]
    {
        TurnPhase.Events, TurnPhase.Dilemma, TurnPhase.Ruling, TurnPhase.BillVoting,
        TurnPhase.Resolution, TurnPhase.Opposition, TurnPhase.Polling, TurnPhase.Election
    };

    /// <summary>
    /// Advance the game to the next phase. Handles special transitions
    /// (skip dilemma if none, skip bill_voting if no bills, polling end-of-turn).
    /// </summary>
    public static void AdvancePhase(GameState state)
    {
        // Clear phase-ready tracking
        state.PhaseReady = new();

        // Waiting → Party creation
        if (state.Phase == TurnPhase.Waiting)
        {
            state.Phase = TurnPhase.PartyCreation;
            return;
        }

        // Party creation → Campaign or Events
        if (state.Phase == TurnPhase.PartyCreation)
        {
            state.Phase = state.IsPreElection ? TurnPhase.Campaigning : TurnPhase.Events;
            return;
        }

        // Debate → Election
        if (state.Phase == TurnPhase.Debate)
        {
            state.Phase = TurnPhase.Election;
            return;
        }

        // Campaign → Polling
        if (state.Phase == TurnPhase.Campaigning)
        {
            state.Phase = TurnPhase.Polling;
            return;
        }

        // Coalition → Government formation
        if (state.Phase == TurnPhase.CoalitionNegotiation)
        {
            state.Phase = TurnPhase.GovernmentFormation;
            return;
        }

        // Government formation → Events
        if (state.Phase == TurnPhase.GovernmentFormation)
        {
            state.Phase = TurnPhase.Events;
            return;
        }

        // Skip dilemma if none active
        if (state.Phase == TurnPhase.Events && state.ActiveDilemma == null)
        {
            state.Phase = TurnPhase.Ruling;
            return;
        }

        // After ruling: go to bill_voting if bills exist, else skip to resolution
        if (state.Phase == TurnPhase.Ruling)
        {
            if (state.ActiveBills.Any(b => b.Status == BillStatus.Drafting || b.Status == BillStatus.Voting))
                state.Phase = TurnPhase.BillVoting;
            else
                state.Phase = TurnPhase.Resolution;
            return;
        }

        // Polling: end-of-turn processing
        if (state.Phase == TurnPhase.Polling)
        {
            ProcessEndOfTurn(state);
            return;
        }

        // Election: post-election processing
        if (state.Phase == TurnPhase.Election)
        {
            ProcessPostElection(state);
            return;
        }

        // Default: advance to next in phase order
        var idx = Array.IndexOf(PhaseOrder, state.Phase);
        if (idx >= 0 && idx < PhaseOrder.Length - 1)
        {
            state.Phase = PhaseOrder[idx + 1];
        }
    }

    /// <summary>
    /// End-of-turn processing when polling phase completes.
    /// Increments turn, decrements election counter, processes effects.
    /// </summary>
    private static void ProcessEndOfTurn(GameState state)
    {
        // Record snapshot
        var ruling = state.Players.Find(p => p.Role == PlayerRole.Ruling);
        state.TurnHistory.Add(new TurnSnapshot
        {
            Turn = state.Turn,
            Approval = state.RulingApproval,
            Gdp = state.Simulation.GdpGrowth,
            Unemployment = state.Simulation.Unemployment,
            DebtToGdp = state.Budget.DebtToGdp,
        });

        if (state.TurnsUntilElection <= 0)
        {
            state.Phase = TurnPhase.Election;
        }
        else
        {
            // New turn
            state.Turn++;
            state.TurnsUntilElection--;
            AdvanceDate(state);
            state.FilibusteredPolicies.Clear();
            state.PendingPolicyChanges.Clear();
            state.PendingOppositionActions.Clear();

            // Keep active bills
            state.ActiveBills = state.ActiveBills
                .Where(b => b.Status == BillStatus.Pending || b.Status == BillStatus.Voting
                    || b.Status == BillStatus.Passed || b.Status == BillStatus.Filibustered)
                .ToList();

            // Tick active effects
            TickActiveEffects(state);

            // Flip-flop penalty decay
            foreach (var pid in state.FlipFlopPenalty.Keys.ToList())
                state.FlipFlopPenalty[pid] = Math.Max(0, state.FlipFlopPenalty[pid] - 1);

            // Perception drift toward reality (20% per turn)
            var simVars = new[] { SimVar.GdpGrowth, SimVar.Unemployment, SimVar.Inflation, SimVar.Crime,
                SimVar.Pollution, SimVar.Equality, SimVar.HealthIndex, SimVar.EducationIndex,
                SimVar.FreedomIndex, SimVar.NationalSecurity, SimVar.Corruption };
            foreach (var key in simVars)
            {
                var actual = state.Simulation[key];
                var perceived = state.Perception.GetValueOrDefault(key.ToString(), actual);
                state.Perception[key.ToString()] = perceived + (actual - perceived) * 0.2;
            }

            // PC generation
            foreach (var player in state.Players)
            {
                int pc = player.Role == PlayerRole.Ruling ? 3 : 2;
                if (state.CampaignPhase) pc += 2;
                if (state.IsPreElection) pc = 5;
                player.PoliticalCapital += pc;
            }

            // Pre-election → campaigning, else → events
            if (state.IsPreElection)
            {
                state.Phase = TurnPhase.Campaigning;
                state.CampaignActedThisTurn = new();
            }
            else
            {
                state.Phase = TurnPhase.Events;
            }

            // Campaign phase check
            state.CampaignPhase = state.TurnsUntilElection <= 3;

            // Recalculate
            SimulationEngine.Recalculate(state);
        }
    }

    /// <summary>
    /// Post-election processing: assign roles, update parliament.
    /// </summary>
    private static void ProcessPostElection(GameState state)
    {
        var electoralLimit = state.GameSettings.VictoryCondition == VictoryType.Electoral ? 3 : 5;
        if (state.ElectionHistory.Count >= electoralLimit)
        {
            state.Phase = TurnPhase.GameOver;
        }
        else
        {
            state.Turn++;
            state.TurnsUntilElection = 8;
            state.FilibusteredPolicies.Clear();
            AdvanceDate(state);
            state.Phase = TurnPhase.CoalitionNegotiation;
        }
    }

    /// <summary>Tick down active effects, removing expired ones.</summary>
    public static void TickActiveEffects(GameState state)
    {
        for (int i = state.ActiveEffects.Count - 1; i >= 0; i--)
        {
            state.ActiveEffects[i].TurnsRemaining--;
            if (state.ActiveEffects[i].TurnsRemaining <= 0)
                state.ActiveEffects.RemoveAt(i);
        }

        // Tick delayed policies
        for (int i = state.DelayedPolicies.Count - 1; i >= 0; i--)
        {
            state.DelayedPolicies[i].TurnsRemaining--;
            if (state.DelayedPolicies[i].TurnsRemaining <= 0)
            {
                var dp = state.DelayedPolicies[i];
                state.Policies[dp.PolicyId] = dp.NewValue;
                state.DelayedPolicies.RemoveAt(i);
            }
        }
    }

    /// <summary>Advance the in-game calendar by one month.</summary>
    private static void AdvanceDate(GameState state)
    {
        state.Date.Month++;
        if (state.Date.Month > 12)
        {
            state.Date.Month = 1;
            state.Date.Year++;
        }
    }
}
