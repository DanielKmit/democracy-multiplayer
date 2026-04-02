using DemocracyGame.Models;
using DemocracyGame.Data;

namespace DemocracyGame.Engine;

/// <summary>
/// Election mechanics — vote share calculation, seat allocation, results.
/// Port of elections.ts + parliament.ts.
/// </summary>
public static class ElectionEngine
{
    private static readonly Random Rng = new();

    /// <summary>
    /// Run a full election: compute vote shares per region, allocate seats, determine winner.
    /// </summary>
    public static ElectionResult RunElection(
        Dictionary<string, Dictionary<string, double>> regionalSatisfaction,
        List<Player> players,
        int turn,
        List<ActiveEffect> activeEffects,
        Dictionary<string, Dictionary<string, double>> campaignBonuses,
        Dictionary<string, Dictionary<string, double>> voterSatisfaction,
        List<BotParty> botParties)
    {
        var voteShares = new Dictionary<string, Dictionary<string, double>>();
        var seatResults = new Dictionary<string, Dictionary<string, int>>();
        var totalSeats = new Dictionary<string, int>();
        var regionWinners = new Dictionary<string, string>();

        // Initialize totals
        foreach (var p in players) totalSeats[p.Id] = 0;
        foreach (var b in botParties) totalSeats[b.Id] = 0;

        foreach (var region in RegionData.All)
        {
            var regionShares = new Dictionary<string, double>();
            double total = 0;

            // Human players
            foreach (var player in players)
            {
                var sat = regionalSatisfaction.GetValueOrDefault(region.Id)
                    ?.GetValueOrDefault(player.Id, 50) ?? 50;
                var campaignBonus = campaignBonuses.GetValueOrDefault(player.Id)
                    ?.GetValueOrDefault(region.Id, 0) ?? 0;
                var rawShare = Math.Max(5, sat + campaignBonus + Rng.NextDouble() * 5 - 2.5);
                regionShares[player.Id] = rawShare;
                total += rawShare;
            }

            // Bot parties
            foreach (var bot in botParties)
            {
                var botShare = ComputeBotRegionShare(bot, region);
                regionShares[bot.Id] = botShare;
                total += botShare;
            }

            // Normalize to 100%
            foreach (var key in regionShares.Keys.ToList())
                regionShares[key] = total > 0 ? regionShares[key] / total * 100 : 0;

            voteShares[region.Id] = regionShares;

            // Allocate seats using D'Hondt method
            var seats = AllocateRegionSeats(regionShares, region.Seats);
            seatResults[region.Id] = seats;

            foreach (var (partyId, s) in seats)
                totalSeats[partyId] = totalSeats.GetValueOrDefault(partyId) + s;

            // Region winner = most seats
            var maxSeats = 0;
            var winner = "";
            foreach (var (partyId, s) in seats)
            {
                if (s > maxSeats) { maxSeats = s; winner = partyId; }
            }
            regionWinners[region.Id] = winner;
        }

        // Overall winner = most total seats (human players only)
        var humanWinner = players.OrderByDescending(p => totalSeats.GetValueOrDefault(p.Id)).First();
        var prevWinner = ""; // Would need election history for swapped detection

        // Overall vote share
        var overallVoteShare = new Dictionary<string, double>();
        foreach (var partyId in totalSeats.Keys)
        {
            double regionWeightedShare = 0;
            foreach (var region in RegionData.All)
            {
                if (voteShares.TryGetValue(region.Id, out var rv))
                    regionWeightedShare += rv.GetValueOrDefault(partyId) * region.PopulationShare;
            }
            overallVoteShare[partyId] = regionWeightedShare;
        }

        return new ElectionResult
        {
            Turn = turn,
            SeatResults = seatResults,
            TotalSeats = totalSeats,
            VoteShares = voteShares,
            OverallVoteShare = overallVoteShare,
            Winner = humanWinner.Id,
            Swapped = false,
            RegionWinners = regionWinners,
        };
    }

    /// <summary>
    /// D'Hondt seat allocation for a single region.
    /// </summary>
    private static Dictionary<string, int> AllocateRegionSeats(
        Dictionary<string, double> voteShares, int totalSeats)
    {
        var seats = new Dictionary<string, int>();
        foreach (var key in voteShares.Keys) seats[key] = 0;

        for (int i = 0; i < totalSeats; i++)
        {
            var maxQuotient = -1.0;
            var winner = "";
            foreach (var (partyId, share) in voteShares)
            {
                var quotient = share / (seats[partyId] + 1);
                if (quotient > maxQuotient)
                {
                    maxQuotient = quotient;
                    winner = partyId;
                }
            }
            if (winner != "") seats[winner]++;
        }

        return seats;
    }

    /// <summary>
    /// Compute a bot party's regional vote share based on ideology alignment.
    /// </summary>
    private static double ComputeBotRegionShare(BotParty bot, RegionDefinition region)
    {
        var econDist = Math.Abs(bot.EconomicAxis - region.EconomicLean);
        var socialDist = Math.Abs(bot.SocialAxis - region.SocialLean);
        var alignment = 100 - (econDist + socialDist) / 2.0;
        return Math.Max(3, alignment * 0.3 + Rng.NextDouble() * 5);
    }

    /// <summary>
    /// Create initial parliament with default seat distribution.
    /// </summary>
    public static ParliamentState CreateInitialParliament(List<Player> players, List<BotParty> botParties)
    {
        var seats = new List<ParliamentSeat>();
        var seatsByParty = new Dictionary<string, int>();
        int seatId = 0;

        // Simple initial allocation: split evenly among all parties
        var allParties = new List<(string id, string color)>();
        foreach (var p in players) allParties.Add((p.Id, PartyColors.Hex.GetValueOrDefault(p.Party.PartyColor, "#3B82F6")));
        foreach (var b in botParties) allParties.Add((b.Id, b.Color));

        int totalSeats = 100;
        int perParty = totalSeats / allParties.Count;
        int remainder = totalSeats % allParties.Count;

        foreach (var (id, color) in allParties)
        {
            int count = perParty + (remainder-- > 0 ? 1 : 0);
            seatsByParty[id] = count;
            for (int i = 0; i < count; i++)
            {
                seats.Add(new ParliamentSeat { Id = seatId++, PartyId = id, PartyColor = color });
            }
        }

        return new ParliamentState
        {
            Seats = seats,
            SeatsByParty = seatsByParty,
        };
    }

    /// <summary>
    /// Allocate parliament seats based on election vote shares.
    /// </summary>
    public static ParliamentState AllocateSeats(
        Dictionary<string, Dictionary<string, double>> regionVoteShares,
        List<Player> players,
        List<BotParty> botParties)
    {
        var seats = new List<ParliamentSeat>();
        var seatsByParty = new Dictionary<string, int>();
        int seatId = 0;

        foreach (var region in RegionData.All)
        {
            if (!regionVoteShares.TryGetValue(region.Id, out var shares)) continue;
            var allocation = AllocateRegionSeats(shares, region.Seats);
            foreach (var (partyId, count) in allocation)
            {
                seatsByParty[partyId] = seatsByParty.GetValueOrDefault(partyId) + count;
                var color = GetPartyColor(partyId, players, botParties);
                for (int i = 0; i < count; i++)
                {
                    seats.Add(new ParliamentSeat
                    {
                        Id = seatId++,
                        RegionId = region.Id,
                        PartyId = partyId,
                        PartyColor = color,
                    });
                }
            }
        }

        return new ParliamentState { Seats = seats, SeatsByParty = seatsByParty };
    }

    private static string GetPartyColor(string partyId, List<Player> players, List<BotParty> bots)
    {
        var player = players.Find(p => p.Id == partyId);
        if (player != null) return PartyColors.Hex.GetValueOrDefault(player.Party.PartyColor, "#3B82F6");
        var bot = bots.Find(b => b.Id == partyId);
        return bot?.Color ?? "#888888";
    }
}
