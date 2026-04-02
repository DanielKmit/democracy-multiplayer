using DemocracyGame.Models;

namespace DemocracyGame.Engine;

/// <summary>
/// Party reputation system — tracks promise-keeping, scandals, and trustworthiness.
/// Port of reputation.ts.
/// </summary>
public static class ReputationEngine
{
    public static ReputationState CreateInitial(IEnumerable<string> partyIds)
    {
        var state = new ReputationState();
        foreach (var id in partyIds)
        {
            state.Scores[id] = 60;
            state.PromisesKept[id] = 0;
            state.PromisesBroken[id] = 0;
            state.ScandalCount[id] = 0;
        }
        return state;
    }

    /// <summary>
    /// Update reputation based on scandals, promises, and approval.
    /// </summary>
    public static void UpdateReputation(
        ReputationState rep, string partyId,
        int activeScandalCount, bool brokenPromise, bool keptPromise,
        double approval, bool isRuling, double cabinetCompetence)
    {
        var score = rep.Scores.GetValueOrDefault(partyId, 60.0);

        // Scandals: -3 per active scandal
        score -= activeScandalCount * 3;

        // Promises
        if (brokenPromise) { score -= 8; rep.PromisesBroken[partyId] = rep.PromisesBroken.GetValueOrDefault(partyId) + 1; }
        if (keptPromise) { score += 5; rep.PromisesKept[partyId] = rep.PromisesKept.GetValueOrDefault(partyId) + 1; }

        // Approval effects (ruling party only)
        if (isRuling)
        {
            if (approval > 75) score += 2;
            else if (approval > 60) score += 1;
            else if (approval < 30) score -= 2;

            if (cabinetCompetence > 7) score += 1;
        }

        // Natural drift toward 50
        if (score > 60) score -= 0.5;
        else if (score < 40) score += 0.5;

        rep.Scores[partyId] = Math.Clamp(score, 0, 100);
    }

    /// <summary>
    /// Get gameplay effects derived from reputation score.
    /// </summary>
    public static (double voterTrustMultiplier, int ministerRecruitPenalty,
                    double scandalExposureModifier, double approvalModifier)
        GetEffects(double reputation)
    {
        return (
            voterTrustMultiplier: 0.5 + (reputation / 100),      // 0.5 to 1.5
            ministerRecruitPenalty: reputation < 30 ? 3 : reputation < 50 ? 1 : 0,
            scandalExposureModifier: reputation < 30 ? 1.5 : reputation > 70 ? 0.7 : 1.0,
            approvalModifier: (reputation - 50) / 10              // -5 to +5
        );
    }
}
