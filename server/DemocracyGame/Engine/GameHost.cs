using DemocracyGame.Models;
using DemocracyGame.Data;

namespace DemocracyGame.Engine;

/// <summary>
/// Game host — manages game state, processes player actions, controls turn flow.
/// Port of gameHost.ts handleAction + handleEndTurnPhase.
/// </summary>
public class GameHost
{
    private static readonly Random Rng = new();

    public GameState State { get; private set; }

    public event Action<GameState>? OnStateChanged;

    public GameHost(string roomId, string hostPlayerName)
    {
        State = CreateInitialGameState(roomId);
        AddPlayer(hostPlayerName, "host");
    }

    // ---- Initialization ----

    private static GameState CreateInitialGameState(string roomId)
    {
        var policies = new Dictionary<string, int>();
        foreach (var p in PolicyData.All)
            policies[p.Id] = p.DefaultValue;

        var state = new GameState
        {
            RoomId = roomId,
            Phase = TurnPhase.Waiting,
            Turn = 1,
            Policies = policies,
            Date = new GameDate { Month = 1, Year = 2025 },
            IsPreElection = true,
            TurnsUntilElection = 5,
            Perception = new()
            {
                ["GdpGrowth"] = 2, ["Unemployment"] = 8, ["Inflation"] = 3, ["Crime"] = 40,
                ["ViolentCrime"] = 35, ["PropertyCrime"] = 40, ["WhiteCollarCrime"] = 30,
                ["Pollution"] = 50, ["Equality"] = 50, ["HealthIndex"] = 50, ["EducationIndex"] = 50,
                ["FreedomIndex"] = 50, ["NationalSecurity"] = 50, ["Corruption"] = 30,
            },
        };

        state.Simulation = SimulationEngine.ComputeSimulation(state.Policies, state.ActiveEffects);
        state.Budget = BudgetEngine.CalculateBudget(state.Policies, state.Simulation);

        // Add bot parties
        state.BotParties = BotPartyData.All.Select(b => new BotParty
        {
            Id = b.Id, Name = b.Name, Color = b.Color, LeaderName = b.LeaderName,
            EconomicAxis = b.EconomicAxis, SocialAxis = b.SocialAxis,
            Manifesto = new(b.Manifesto), Logo = b.Logo,
            PolicyPreferences = new(b.PolicyPreferences),
            Concerns = new(b.Concerns),
        }).ToList();

        return state;
    }

    public Player AddPlayer(string name, string id)
    {
        var player = new Player
        {
            Id = id,
            Name = name,
            Role = State.Players.Count == 0 ? PlayerRole.Ruling : PlayerRole.Opposition,
            PoliticalCapital = State.Players.Count == 0 ? 6 : 4,
            Party = new PartyConfig { PartyName = "Default Party", LeaderName = name },
        };
        State.Players.Add(player);
        return player;
    }

    // ---- Action Dispatch ----

    public void HandleAction(string playerId, string action, object? payload = null)
    {
        switch (action)
        {
            case "submitPartyConfig":
                HandleSubmitPartyConfig(playerId, payload);
                break;
            case "submitPolicyChanges":
                HandleSubmitPolicyChanges(playerId, payload);
                break;
            case "submitOppositionActions":
                HandleSubmitOppositionActions(playerId, payload);
                break;
            case "endTurnPhase":
                HandleEndTurnPhase(playerId);
                break;
            case "acknowledgeEvent":
                HandleEndTurnPhase(playerId);
                break;
            case "resolveDilemma":
                HandleResolveDilemma(playerId, payload);
                break;
            case "submitBill":
                HandleSubmitBill(playerId, payload);
                break;
            case "startLiveVote":
                HandleStartLiveVote(playerId, payload);
                break;
            case "submitCampaignActions":
                HandleSubmitCampaignActions(playerId, payload);
                break;
            case "submitCoalitionOffer":
                HandleSubmitCoalitionOffer(playerId, payload);
                break;
        }
    }

    // ---- Phase Flow ----

    private void HandleEndTurnPhase(string? playerId)
    {
        if (State.Phase == TurnPhase.Ruling)
        {
            // Only ruling player can end ruling phase
            var rulingPlayer = State.Players.Find(p => p.Role == PlayerRole.Ruling);
            if (playerId != null && rulingPlayer != null && playerId != rulingPlayer.Id)
                return;

            State.PendingPolicyChanges.Clear();

            // Advance ruling → opposition (accounting for bill_voting skip)
            PhaseEngine.AdvancePhase(State); // → bill_voting or resolution
            if (State.Phase == TurnPhase.BillVoting)
                PhaseEngine.AdvancePhase(State); // → resolution
            SimulationEngine.Recalculate(State);
            PhaseEngine.AdvancePhase(State); // → opposition

            AddLog("Opposition phase.", LogEntryType.Info);
            BroadcastState();
        }
        else if (State.Phase == TurnPhase.Opposition)
        {
            // Only opposition player can end opposition phase
            var oppPlayer = State.Players.Find(p => p.Role == PlayerRole.Opposition);
            if (playerId != null && oppPlayer != null && playerId != oppPlayer.Id)
                return;

            State.PendingOppositionActions.Clear();
            SimulationEngine.Recalculate(State);
            State.TurnActedThisTurn = new();
            PhaseEngine.AdvancePhase(State); // → polling (runs end-of-turn)

            AddLog($"Ruling Approval: {State.RulingApproval}%", LogEntryType.Info);
            BroadcastState();
        }
        else if (State.Phase == TurnPhase.Events)
        {
            // Only ruling player advances events
            var eventRuler = State.Players.Find(p => p.Role == PlayerRole.Ruling);
            if (playerId != null && eventRuler != null && playerId != eventRuler.Id)
                return;

            State.CurrentEvent = null;
            // Skip dilemma check for now (can add later)
            PhaseEngine.AdvancePhase(State);
            BroadcastState();
        }
        else if (State.Phase == TurnPhase.Polling)
        {
            if (State.TurnsUntilElection <= 0)
            {
                // Election time
                PhaseEngine.AdvancePhase(State); // → election

                SimulationEngine.Recalculate(State);
                var result = ElectionEngine.RunElection(
                    State.RegionalSatisfaction, State.Players, State.Turn,
                    State.ActiveEffects, State.CampaignBonuses,
                    State.VoterSatisfaction, State.BotParties);
                State.ElectionHistory.Add(result);
                State.Debate = null;

                // Update parliament
                var regionVoteShares = new Dictionary<string, Dictionary<string, double>>();
                foreach (var (regionId, shares) in result.VoteShares)
                    regionVoteShares[regionId] = shares;
                State.Parliament = ElectionEngine.AllocateSeats(regionVoteShares, State.Players, State.BotParties);

                // Assign roles based on results
                int maxSeats = 0;
                Player? formateur = null;
                foreach (var player in State.Players)
                {
                    var seats = result.TotalSeats.GetValueOrDefault(player.Id);
                    if (seats > maxSeats) { maxSeats = seats; formateur = player; }
                }

                foreach (var p in State.Players)
                {
                    if (formateur != null && p.Id == formateur.Id)
                    {
                        p.Role = PlayerRole.Ruling;
                        p.TermsWon++;
                        p.PoliticalCapital = 6;
                    }
                    else
                    {
                        p.Role = PlayerRole.Opposition;
                        p.PoliticalCapital = 4;
                    }
                }

                if (formateur != null)
                    AddLog($"{formateur.Party.PartyName} forms the government!", LogEntryType.Election);

                PhaseEngine.AdvancePhase(State); // → coalition_negotiation or game_over
                BroadcastState();
            }
            else
            {
                PhaseEngine.AdvancePhase(State); // → end-of-turn processing → events
                BroadcastState();
            }
        }
        else if (State.Phase == TurnPhase.GovernmentFormation)
        {
            PhaseEngine.AdvancePhase(State); // → events
            BroadcastState();
        }
        else if (State.Phase == TurnPhase.CoalitionNegotiation)
        {
            PhaseEngine.AdvancePhase(State); // → government_formation
            BroadcastState();
        }
        else if (State.Phase == TurnPhase.Campaigning)
        {
            if (playerId != null)
            {
                State.CampaignActedThisTurn[playerId] = true;
                if (State.Players.All(p => State.CampaignActedThisTurn.GetValueOrDefault(p.Id)))
                {
                    State.CampaignActedThisTurn = new();
                    SimulationEngine.Recalculate(State);
                    PhaseEngine.AdvancePhase(State); // → polling
                    BroadcastState();
                }
                else
                {
                    BroadcastState();
                }
            }
        }
    }

    // ---- Action Handlers ----

    private void HandleSubmitPartyConfig(string playerId, object? payload)
    {
        if (payload is not PartyConfig config) return;
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        player.Party = config;

        // Check if all players have configured parties
        if (State.Players.Count >= 2 && State.Players.All(p => p.Party.PartyName != "Default Party"))
        {
            State.Parliament = ElectionEngine.CreateInitialParliament(State.Players, State.BotParties);
            State.RegionalSatisfaction = SimulationEngine.ComputeRegionalSatisfaction(
                State.Policies, State.VoterSatisfaction, State.Players);
            State.TurnsUntilElection = 5;
            State.IsPreElection = true;
            State.Phase = TurnPhase.Campaigning;
        }

        BroadcastState();
    }

    private void HandleSubmitPolicyChanges(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.Ruling) return;
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null || player.Role != PlayerRole.Ruling) return;

        if (payload is List<PolicyChange> changes)
        {
            foreach (var change in changes)
            {
                if (change.Cost > player.PoliticalCapital) continue;
                player.PoliticalCapital -= change.Cost;
                State.Policies[change.PolicyId] = change.NewValue;

                // Track flip-flop
                if (!State.PolicyChangeHistory.ContainsKey(change.PolicyId))
                    State.PolicyChangeHistory[change.PolicyId] = new();
                State.PolicyChangeHistory[change.PolicyId].Add(State.Turn);

                AddLog($"Policy changed: {change.PolicyId} → {change.NewValue}", LogEntryType.Ruling);
            }
            SimulationEngine.Recalculate(State);
            BroadcastState();
        }
    }

    private void HandleSubmitOppositionActions(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.Opposition) return;
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null || player.Role != PlayerRole.Opposition) return;

        if (payload is List<OppositionAction> actions)
        {
            foreach (var action in actions)
            {
                if (action.Cost > player.PoliticalCapital) continue;
                player.PoliticalCapital -= action.Cost;
                AddLog($"Opposition action: {action.Type}", LogEntryType.Opposition);
            }
            SimulationEngine.Recalculate(State);

            // Advance to polling
            PhaseEngine.AdvancePhase(State);
            AddLog($"Ruling Approval: {State.RulingApproval}%", LogEntryType.Info);
            BroadcastState();
        }
    }

    private void HandleResolveDilemma(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.Dilemma || State.ActiveDilemma == null) return;
        var option = payload?.ToString();
        if (option != "a" && option != "b") return;

        State.ActiveDilemma.Resolved = true;
        State.ActiveDilemma.ChosenOption = option;

        // Apply dilemma effects (would need DilemmaData lookup)
        PhaseEngine.AdvancePhase(State); // → ruling
        BroadcastState();
    }

    private void HandleSubmitBill(string playerId, object? payload)
    {
        // Simplified bill submission
        if (State.Phase != TurnPhase.Ruling && State.Phase != TurnPhase.Opposition) return;
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        // Bill creation logic would go here
        BroadcastState();
    }

    private void HandleStartLiveVote(string playerId, object? payload)
    {
        // Live vote logic would go here
        BroadcastState();
    }

    private void HandleSubmitCampaignActions(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.Campaigning) return;
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        if (payload is List<CampaignAction> actions)
        {
            foreach (var action in actions)
            {
                if (action.Cost > player.PoliticalCapital) continue;
                player.PoliticalCapital -= action.Cost;

                // Apply campaign effects
                if (action.TargetRegionId != null)
                {
                    if (!State.CampaignBonuses.ContainsKey(player.Id))
                        State.CampaignBonuses[player.Id] = new();
                    var current = State.CampaignBonuses[player.Id].GetValueOrDefault(action.TargetRegionId);
                    State.CampaignBonuses[player.Id][action.TargetRegionId] = current + 3;
                }
            }
            BroadcastState();
        }
    }

    private void HandleSubmitCoalitionOffer(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.CoalitionNegotiation) return;
        // Coalition logic would go here
        BroadcastState();
    }

    // ---- Helpers ----

    private void AddLog(string message, LogEntryType type)
    {
        State.ActionLog.Add(new ActionLogEntry
        {
            Turn = State.Turn,
            Phase = State.Phase,
            Message = message,
            Type = type,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        });
    }

    private void BroadcastState()
    {
        OnStateChanged?.Invoke(State);
    }
}
