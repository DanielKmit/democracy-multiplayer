using DemocracyGame.Models;
using DemocracyGame.Data;

namespace DemocracyGame.Engine;

/// <summary>
/// Victory conditions — 4 paths to win the game.
/// Port of victoryConditions.ts.
/// </summary>
public static class VictoryEngine
{
    public static VictoryTracker CreateTracker() => new();

    /// <summary>
    /// Called each turn to update GDP and approval trackers.
    /// Resets counter if conditions not met.
    /// </summary>
    public static void UpdateTrackers(GameState state)
    {
        foreach (var player in state.Players)
        {
            if (!state.VictoryTrackers.TryGetValue(player.Id, out var tracker))
            {
                tracker = new VictoryTracker();
                state.VictoryTrackers[player.Id] = tracker;
            }

            if (player.Role != PlayerRole.Ruling) continue;

            // Economic Miracle: GDP > 4% AND unemployment < 6%
            if (state.Simulation.GdpGrowth > 4 && state.Simulation.Unemployment < 6)
                tracker.ConsecutiveHighGDP++;
            else
                tracker.ConsecutiveHighGDP = 0;

            // People's Champion: Approval > 65%
            var approval = state.ApprovalRating.GetValueOrDefault(player.Id, 50);
            if (approval > 65)
                tracker.ConsecutiveHighApproval++;
            else
                tracker.ConsecutiveHighApproval = 0;
        }
    }

    /// <summary>
    /// Called after elections to check supermajority condition.
    /// 65+ seats AND lead in 5+ regions.
    /// </summary>
    public static void UpdateSupermajorityTracker(GameState state)
    {
        if (state.ElectionHistory.Count == 0) return;
        var lastElection = state.ElectionHistory[^1];

        foreach (var player in state.Players)
        {
            if (!state.VictoryTrackers.TryGetValue(player.Id, out var tracker))
            {
                tracker = new VictoryTracker();
                state.VictoryTrackers[player.Id] = tracker;
            }

            var seats = lastElection.TotalSeats.GetValueOrDefault(player.Id);
            var leadingRegions = 0;
            foreach (var (regionId, partyId) in lastElection.RegionWinners)
            {
                if (partyId == player.Id) leadingRegions++;
            }

            if (seats >= 65 && leadingRegions >= 5)
                tracker.ConsecutiveSupermajority++;
            else
                tracker.ConsecutiveSupermajority = 0;
        }
    }

    /// <summary>
    /// Check if any player has met the victory condition.
    /// Returns (winnerId, conditionName) or (null, null).
    /// </summary>
    public static (string? winnerId, string? condition) CheckVictory(
        GameState state, VictoryType victoryType)
    {
        foreach (var player in state.Players)
        {
            var tracker = state.VictoryTrackers.GetValueOrDefault(player.Id) ?? new();

            switch (victoryType)
            {
                case VictoryType.Electoral:
                    if (player.TermsWon >= 3)
                        return (player.Id, "Electoral Dominance — Won 3 elections");
                    break;

                case VictoryType.Economic:
                    if (tracker.ConsecutiveHighGDP >= 4)
                        return (player.Id, "Economic Miracle — 4 turns of GDP>4%, Unemployment<6%");
                    break;

                case VictoryType.Approval:
                    if (tracker.ConsecutiveHighApproval >= 6)
                        return (player.Id, "People's Champion — 6 turns of >65% approval");
                    break;

                case VictoryType.Parliamentary:
                    if (tracker.ConsecutiveSupermajority >= 1)
                        return (player.Id, "Total Dominance — 65+ seats and 5+ region leads");
                    break;
            }
        }

        return (null, null);
    }

    /// <summary>Get progress toward victory for a specific player.</summary>
    public static (int current, int required) GetProgress(
        GameState state, string playerId, VictoryType victoryType)
    {
        var player = state.Players.Find(p => p.Id == playerId);
        var tracker = state.VictoryTrackers.GetValueOrDefault(playerId) ?? new();

        return victoryType switch
        {
            VictoryType.Electoral => (player?.TermsWon ?? 0, 3),
            VictoryType.Economic => (tracker.ConsecutiveHighGDP, 4),
            VictoryType.Approval => (tracker.ConsecutiveHighApproval, 6),
            VictoryType.Parliamentary => (tracker.ConsecutiveSupermajority, 1),
            _ => (0, 1)
        };
    }
}
