using System.Text.Json;
using DemocracyGame.Models;
using DemocracyGame.Data;

namespace DemocracyGame.Engine;

/// <summary>
/// Game host - manages game state, processes player actions, controls turn flow.
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
            case "acknowledgeEvent":
                HandleAcknowledgeEvent(playerId);
                break;
            case "resolveDilemma":
                HandleResolveDilemma(playerId, payload);
                break;
            case "submitPolicyChanges":
                HandleSubmitPolicyChanges(playerId, payload);
                break;
            case "submitBill":
                HandleSubmitBill(playerId, payload);
                break;
            case "proposeBillFromLibrary":
                HandleProposeBillFromLibrary(playerId, payload);
                break;
            case "submitOppositionActions":
                HandleSubmitOppositionActions(playerId, payload);
                break;
            case "appointMinister":
                HandleAppointMinister(playerId, payload);
                break;
            case "fireMinister":
                HandleFireMinister(playerId, payload);
                break;
            case "appointShadowMinister":
                HandleAppointShadowMinister(playerId, payload);
                break;
            case "submitCampaignActions":
                HandleSubmitCampaignActions(playerId, payload);
                break;
            case "submitCoalitionOffer":
                HandleSubmitCoalitionOffer(playerId, payload);
                break;
            case "spinScandal":
                HandleSpinScandal(playerId, payload);
                break;
            case "resolveDiplomaticIncident":
                HandleResolveDiplomaticIncident(playerId, payload);
                break;
            case "updateGameSettings":
                HandleUpdateGameSettings(playerId, payload);
                break;
            case "poachCoalitionPartner":
                HandlePoachCoalitionPartner(playerId, payload);
                break;
            case "lobbyBill":
                HandleLobbyBill(playerId, payload);
                break;
            case "whipVotes":
                HandleWhipVotes(playerId, payload);
                break;
            case "campaignForBill":
                HandleCampaignForBill(playerId, payload);
                break;
            case "callBillVote":
                HandleStartLiveVote(playerId, payload);
                break;
            case "vetoBill":
                HandleVetoBill(playerId, payload);
                break;
            case "overrideVeto":
                HandleOverrideVeto(playerId, payload);
                break;
            case "challengeConstitutionality":
                HandleChallengeConstitutionality(playerId, payload);
                break;
            case "forceBillVote":
                HandleForceBillVote(playerId, payload);
                break;
            case "startLiveVote":
                HandleStartLiveVote(playerId, payload);
                break;
            case "lobbyLiveVote":
                HandleLobbyLiveVote(playerId, payload);
                break;
            case "whipLiveVote":
                HandleWhipLiveVote(playerId, payload);
                break;
            case "campaignLiveVote":
                HandleCampaignLiveVote(playerId, payload);
                break;
            case "readyLiveVote":
                HandleReadyLiveVote(playerId);
                break;
            case "setPlayerVote":
                HandleSetPlayerVote(playerId, payload);
                break;
            case "finalizeLiveVote":
                HandleFinalizeLiveVote(playerId);
                break;
            case "dismissLiveVote":
                HandleDismissLiveVote();
                break;
            case "readyPhase":
                HandleReadyPhase(playerId);
                break;
            case "influenceMedia":
                HandleInfluenceMedia(playerId, payload);
                break;
            case "submitDebateChoice":
                HandleSubmitDebateChoice(playerId, payload);
                break;
            case "runFocusGroup":
                HandleRunFocusGroup(playerId, payload);
                break;
            case "dismissFocusGroup":
                HandleDismissFocusGroup();
                break;
            case "endTurnPhase":
                HandleEndTurnPhase(playerId);
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

            // Advance ruling -> opposition (accounting for bill_voting skip)
            PhaseEngine.AdvancePhase(State); // -> bill_voting or resolution
            if (State.Phase == TurnPhase.BillVoting)
                PhaseEngine.AdvancePhase(State); // -> resolution
            SimulationEngine.Recalculate(State);
            PhaseEngine.AdvancePhase(State); // -> opposition

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
            PhaseEngine.AdvancePhase(State); // -> polling (runs end-of-turn)

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
                PhaseEngine.AdvancePhase(State); // -> election

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

                PhaseEngine.AdvancePhase(State); // -> coalition_negotiation or game_over
                BroadcastState();
            }
            else
            {
                PhaseEngine.AdvancePhase(State); // -> end-of-turn processing -> events
                BroadcastState();
            }
        }
        else if (State.Phase == TurnPhase.GovernmentFormation)
        {
            PhaseEngine.AdvancePhase(State); // -> events
            BroadcastState();
        }
        else if (State.Phase == TurnPhase.CoalitionNegotiation)
        {
            PhaseEngine.AdvancePhase(State); // -> government_formation
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
                    PhaseEngine.AdvancePhase(State); // -> polling
                    BroadcastState();
                }
                else
                {
                    BroadcastState();
                }
            }
        }
    }

    // ---- Payload Helpers ----

    private static JsonElement? AsJson(object? payload)
    {
        if (payload is JsonElement je) return je;
        if (payload == null) return null;
        // Serialize and re-parse to get a JsonElement
        var json = JsonSerializer.Serialize(payload);
        return JsonSerializer.Deserialize<JsonElement>(json);
    }

    private static string? GetString(JsonElement el, string prop)
    {
        if (el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String)
            return v.GetString();
        return null;
    }

    private static int GetInt(JsonElement el, string prop, int fallback = 0)
    {
        if (el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number)
            return v.GetInt32();
        return fallback;
    }

    private static double GetDouble(JsonElement el, string prop, double fallback = 0)
    {
        if (el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number)
            return v.GetDouble();
        return fallback;
    }

    private static double Clamp(double val, double min, double max) =>
        Math.Min(max, Math.Max(min, val));

    // ---- Action Handlers ----

    // #1 submitPartyConfig
    private void HandleSubmitPartyConfig(string playerId, object? payload)
    {
        if (payload is not PartyConfig config)
        {
            var je = AsJson(payload);
            if (je == null) return;
            config = JsonSerializer.Deserialize<PartyConfig>(je.Value.GetRawText()) ?? new();
        }
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        player.Party = config;
        player.Name = config.LeaderName;
        AddLog($"{config.PartyName} ({config.LeaderName}) ready", LogEntryType.Info);

        // Check if all players have submitted
        if (State.Players.Count >= 2
            && State.Players.All(p => p.Party.PartyName != "Default Party" && p.Party.PartyName != "Opposition")
            && State.Phase == TurnPhase.PartyCreation)
        {
            State.Parliament = ElectionEngine.CreateInitialParliament(State.Players, State.BotParties);
            State.RegionalSatisfaction = SimulationEngine.ComputeRegionalSatisfaction(
                State.Policies, State.VoterSatisfaction, State.Players);
            State.TurnsUntilElection = 5;
            State.IsPreElection = true;
            State.Phase = TurnPhase.Campaigning;

            // Both players are equal candidates during campaign
            foreach (var p in State.Players)
            {
                p.Role = PlayerRole.Opposition; // No ruler yet
                p.PoliticalCapital = 5;
            }

            // Initialize reputation & victory trackers
            foreach (var p in State.Players)
            {
                State.Reputation.Scores[p.Id] = 60;
                State.Reputation.PromisesKept[p.Id] = 0;
                State.Reputation.PromisesBroken[p.Id] = 0;
                State.Reputation.ScandalCount[p.Id] = 0;
                State.VictoryTrackers[p.Id] = new VictoryTracker();
            }
            State.ActiveScandals = new();
            State.ActiveSynergies = new();

            AddLog("Campaign season begins! Win voters to form the first government.", LogEntryType.Info);
        }

        BroadcastState();
    }

    // #2 acknowledgeEvent
    private void HandleAcknowledgeEvent(string playerId)
    {
        if (State.Phase != TurnPhase.Events) return;
        State.CurrentEvent = null;

        // Check for dilemma
        var dilemma = DilemmaData.RollForDilemma(State.Turn);
        if (dilemma != null)
        {
            State.ActiveDilemma = new ActiveDilemma
            {
                DilemmaId = dilemma.Id,
                StartedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                Resolved = false,
                ChosenOption = null,
            };
            State.Phase = TurnPhase.Dilemma;
            AddLog($"Dilemma: {dilemma.Title}", LogEntryType.Dilemma);
        }
        else
        {
            PhaseEngine.AdvancePhase(State);
            AddLog($"Turn {State.Turn}: Ruling Party phase", LogEntryType.Info);
        }
        BroadcastState();
    }

    // #3 resolveDilemma
    private void HandleResolveDilemma(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.Dilemma || State.ActiveDilemma == null) return;

        var ruling = State.Players.Find(p => p.Role == PlayerRole.Ruling);
        if (ruling == null) ruling = State.Players.Find(p => p.Id == playerId);
        if (ruling == null || ruling.Id != playerId) return;

        string? option = null;
        if (payload is string s) option = s;
        else
        {
            var je = AsJson(payload);
            if (je != null) option = je.Value.GetString();
        }
        if (option != "a" && option != "b") return;

        if (!DilemmaData.ById.TryGetValue(State.ActiveDilemma.DilemmaId, out var dilemma))
            return;

        State.ActiveDilemma.Resolved = true;
        State.ActiveDilemma.ChosenOption = option;

        var chosen = option == "a" ? dilemma.OptionA : dilemma.OptionB;

        // Apply simulation effects as active effect
        if (chosen.Effects.Count > 0)
        {
            State.ActiveEffects.Add(new ActiveEffect
            {
                Type = EffectType.Dilemma,
                Id = $"dilemma_{dilemma.Id}",
                TurnsRemaining = 3,
                Data = new() { ["effects"] = chosen.Effects },
            });
        }

        // Apply policy effects
        if (chosen.PolicyEffects != null)
        {
            foreach (var (policyId, change) in chosen.PolicyEffects)
            {
                var current = State.Policies.GetValueOrDefault(policyId, 50);
                State.Policies[policyId] = (int)Clamp(current + change, 0, 100);
            }
        }

        // Apply voter satisfaction effects
        if (chosen.VoterEffects != null)
        {
            if (State.VoterSatisfaction.TryGetValue(ruling.Id, out var rulerSat))
            {
                foreach (var (groupId, delta) in chosen.VoterEffects)
                {
                    var current = rulerSat.GetValueOrDefault(groupId, 50);
                    rulerSat[groupId] = Clamp(current + delta, 0, 100);
                }
            }
        }

        // Apply region effects
        if (chosen.RegionEffects != null)
        {
            foreach (var (regionId, delta) in chosen.RegionEffects)
            {
                if (State.RegionalSatisfaction.TryGetValue(regionId, out var regionSat))
                {
                    var current = regionSat.GetValueOrDefault(ruling.Id, 50);
                    regionSat[ruling.Id] = Clamp(current + delta, 0, 100);
                }
            }
        }

        AddLog($"Dilemma resolved: \"{chosen.Label}\"", LogEntryType.Dilemma);

        SimulationEngine.Recalculate(State);

        State.ActiveDilemma = null;
        State.Phase = TurnPhase.Ruling;
        AddLog($"Turn {State.Turn}: Ruling Party phase", LogEntryType.Info);
        BroadcastState();
    }

    // #4 submitPolicyChanges
    private void HandleSubmitPolicyChanges(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.Ruling) return;
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null || player.Role != PlayerRole.Ruling) return;

        List<PolicyChange>? changes = null;
        if (payload is List<PolicyChange> list) changes = list;
        else
        {
            var je = AsJson(payload);
            if (je != null)
                changes = JsonSerializer.Deserialize<List<PolicyChange>>(je.Value.GetRawText());
        }
        if (changes == null) return;

        State.PendingPolicyChanges = changes;

        foreach (var change in changes)
        {
            if (change.Cost > player.PoliticalCapital) continue;
            if (State.FilibusteredPolicies.Contains(change.PolicyId)) continue;

            player.PoliticalCapital -= change.Cost;
            State.Policies[change.PolicyId] = change.NewValue;

            // Track flip-flop
            if (!State.PolicyChangeHistory.ContainsKey(change.PolicyId))
                State.PolicyChangeHistory[change.PolicyId] = new();
            State.PolicyChangeHistory[change.PolicyId].Add(State.Turn);

            // Update flip-flop penalty
            var history = State.PolicyChangeHistory[change.PolicyId];
            if (history.Count >= 2)
            {
                var recentFlips = history.Count(t => t >= State.Turn - 3);
                if (recentFlips >= 2)
                {
                    State.FlipFlopPenalty[player.Id] =
                        State.FlipFlopPenalty.GetValueOrDefault(player.Id) + 2;
                }
            }

            AddLog($"Policy changed: {change.PolicyId} -> {change.NewValue}", LogEntryType.Ruling);
        }

        if (!State.TurnActedThisTurn.ContainsKey(playerId))
            State.TurnActedThisTurn[playerId] = true;

        SimulationEngine.Recalculate(State);

        // Advance through bill_voting -> resolution -> opposition
        PhaseEngine.AdvancePhase(State); // -> bill_voting
        PhaseEngine.AdvancePhase(State); // -> resolution
        PhaseEngine.AdvancePhase(State); // -> opposition
        AddLog("Opposition phase", LogEntryType.Info);
        BroadcastState();
    }

    // #5 submitBill
    private void HandleSubmitBill(string playerId, object? payload)
    {
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        if (State.Phase == TurnPhase.Ruling && player.Role != PlayerRole.Ruling) return;
        if (State.Phase == TurnPhase.Opposition && player.Role != PlayerRole.Opposition) return;
        if (State.Phase != TurnPhase.Ruling && State.Phase != TurnPhase.Opposition) return;

        string? policyId = null;
        int proposedValue = 0;
        if (payload is JsonElement je2)
        {
            policyId = GetString(je2, "policyId");
            proposedValue = GetInt(je2, "proposedValue");
        }
        else
        {
            var je = AsJson(payload);
            if (je != null)
            {
                policyId = GetString(je.Value, "policyId");
                proposedValue = GetInt(je.Value, "proposedValue");
            }
        }
        if (policyId == null) return;

        var policyDef = PolicyData.All.FirstOrDefault(p => p.Id == policyId);
        if (policyDef == null) return;

        var currentValue = State.Policies.GetValueOrDefault(policyId, 50);
        var steps = Math.Max(1, (int)Math.Round(Math.Abs(proposedValue - currentValue) / 25.0));
        var cost = player.Role == PlayerRole.Ruling ? steps : steps + 1;

        if (cost > player.PoliticalCapital)
        {
            AddLog($"Not enough PC to propose bill (need {cost}, have {player.PoliticalCapital})", LogEntryType.Info);
            BroadcastState();
            return;
        }

        player.PoliticalCapital -= cost;

        var bill = new Bill
        {
            Id = $"bill_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Rng.Next(9999):D4}",
            Title = $"{policyDef.Name} Act",
            PolicyId = policyId,
            ProposedValue = proposedValue,
            CurrentValue = currentValue,
            AuthorId = player.Id,
            Status = BillStatus.Pending,
            ConstitutionalScore = 70,
            TurnProposed = State.Turn,
        };

        State.ActiveBills.Add(bill);

        var badge = player.Role == PlayerRole.Opposition ? "[Opposition Bill] " : "";
        AddLog($"{badge}{bill.Title} proposed ({cost} PC) - call a vote to decide!", LogEntryType.Ruling);

        // Auto-start live vote
        HandleStartLiveVote(playerId, new { billId = bill.Id });
    }

    // #6 proposeBillFromLibrary
    private void HandleProposeBillFromLibrary(string playerId, object? payload)
    {
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        var isPlayerPhase = (State.Phase == TurnPhase.Ruling && player.Role == PlayerRole.Ruling) ||
                            (State.Phase == TurnPhase.Opposition && player.Role == PlayerRole.Opposition);
        if (!isPlayerPhase)
        {
            AddLog("You can only propose bills during your turn", LogEntryType.Info);
            BroadcastState();
            return;
        }

        string? templateId = null;
        var je = AsJson(payload);
        if (je != null) templateId = GetString(je.Value, "templateId");
        if (templateId == null) return;

        var template = BillTemplateData.GetById(templateId);
        if (template == null)
        {
            AddLog("Bill template not found", LogEntryType.Info);
            BroadcastState();
            return;
        }

        var cost = player.Role == PlayerRole.Ruling ? template.Cost : template.Cost + 1;
        if (cost > player.PoliticalCapital)
        {
            AddLog($"Not enough PC to propose bill (need {cost}, have {player.PoliticalCapital})", LogEntryType.Info);
            BroadcastState();
            return;
        }

        // Check if already active
        if (State.ActiveBills.Any(b => b.FromTemplate == templateId
            && (b.Status == BillStatus.Pending || b.Status == BillStatus.Voting || b.Status == BillStatus.Passed)))
        {
            AddLog("This bill is already active or passed", LogEntryType.Info);
            BroadcastState();
            return;
        }

        player.PoliticalCapital -= cost;

        var primaryChange = template.PolicyChanges[0];
        var currentValue = State.Policies.GetValueOrDefault(primaryChange.PolicyId, 50);

        var bill = new Bill
        {
            Id = $"bill_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Rng.Next(9999):D4}",
            Title = template.Name,
            Description = template.Description,
            Category = template.Category,
            PolicyId = primaryChange.PolicyId,
            ProposedValue = primaryChange.TargetValue,
            CurrentValue = currentValue,
            AuthorId = player.Id,
            Status = BillStatus.Pending,
            ConstitutionalScore = template.ConstitutionalScore,
            TurnProposed = State.Turn,
            FromTemplate = templateId,
        };

        State.ActiveBills.Add(bill);
        AddLog($"{player.Party.PartyName} proposes: {template.Name} ({cost} PC)", LogEntryType.Ruling);
        BroadcastState();
    }

    // #7 submitOppositionActions
    private void HandleSubmitOppositionActions(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.Opposition) return;
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null || player.Role != PlayerRole.Opposition) return;

        List<OppositionAction>? actions = null;
        if (payload is List<OppositionAction> list) actions = list;
        else
        {
            var je = AsJson(payload);
            if (je != null)
                actions = JsonSerializer.Deserialize<List<OppositionAction>>(je.Value.GetRawText());
        }
        if (actions == null) return;

        State.PendingOppositionActions = actions;

        foreach (var action in actions)
        {
            if (action.Cost > player.PoliticalCapital) continue;
            player.PoliticalCapital -= action.Cost;
            AddLog($"Opposition action: {action.Type}", LogEntryType.Opposition);
        }

        SimulationEngine.Recalculate(State);

        if (!State.TurnActedThisTurn.ContainsKey(playerId))
            State.TurnActedThisTurn[playerId] = true;

        PhaseEngine.AdvancePhase(State); // -> polling
        AddLog($"Ruling Approval: {State.RulingApproval}%", LogEntryType.Info);
        BroadcastState();
    }

    // #8 appointMinister
    private void HandleAppointMinister(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;

        var ministryStr = GetString(je.Value, "ministryId");
        var politicianId = GetString(je.Value, "politicianId");
        if (ministryStr == null || politicianId == null) return;
        if (!Enum.TryParse<MinistryId>(ministryStr, true, out var ministryId)) return;

        var ruling = State.Players.Find(p => p.Role == PlayerRole.Ruling);
        if (ruling == null || ruling.Id != playerId) return;

        State.Cabinet.Ministers[ministryId] = politicianId;
        var pol = State.Cabinet.AvailablePool.Find(p => p.Id == politicianId);
        if (pol != null)
            AddLog($"{pol.Name} appointed as {ministryId}", LogEntryType.Cabinet);
        BroadcastState();
    }

    // #9 fireMinister
    private void HandleFireMinister(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;

        var ministryStr = GetString(je.Value, "ministryId");
        if (ministryStr == null) return;
        if (!Enum.TryParse<MinistryId>(ministryStr, true, out var ministryId)) return;

        var ruling = State.Players.Find(p => p.Role == PlayerRole.Ruling);
        if (ruling == null || ruling.Id != playerId) return;

        if (State.Cabinet.Ministers.TryGetValue(ministryId, out var firedId) && firedId != null)
        {
            var pol = State.Cabinet.AvailablePool.Find(p => p.Id == firedId);
            State.Cabinet.Ministers[ministryId] = null;
            ruling.PoliticalCapital = Math.Max(0, ruling.PoliticalCapital - 2);
            if (pol != null)
                AddLog($"{pol.Name} fired from {ministryId} (-2 PC)", LogEntryType.Cabinet);
        }
        BroadcastState();
    }

    // #10 appointShadowMinister
    private void HandleAppointShadowMinister(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;

        var ministryStr = GetString(je.Value, "ministryId");
        var politicianId = GetString(je.Value, "politicianId");
        if (ministryStr == null || politicianId == null) return;
        if (!Enum.TryParse<MinistryId>(ministryStr, true, out var ministryId)) return;

        var opp = State.Players.Find(p => p.Role == PlayerRole.Opposition);
        if (opp == null || opp.Id != playerId) return;

        State.ShadowCabinet[ministryId] = politicianId;
        var pol = State.Cabinet.AvailablePool.Find(p => p.Id == politicianId);
        if (pol != null)
            AddLog($"Shadow cabinet: {pol.Name} shadowing {ministryId}", LogEntryType.Opposition);
        BroadcastState();
    }

    // #11 submitCampaignActions
    private void HandleSubmitCampaignActions(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.Campaigning) return;
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        List<CampaignAction>? actions = null;
        if (payload is List<CampaignAction> list) actions = list;
        else
        {
            var je = AsJson(payload);
            if (je != null)
                actions = JsonSerializer.Deserialize<List<CampaignAction>>(je.Value.GetRawText());
        }
        if (actions == null) return;

        int totalCost = 0;

        foreach (var action in actions)
        {
            if (totalCost + action.Cost > player.PoliticalCapital) continue;
            totalCost += action.Cost;

            if (!State.CampaignBonuses.ContainsKey(player.Id))
                State.CampaignBonuses[player.Id] = new();
            var bonuses = State.CampaignBonuses[player.Id];

            switch (action.Type)
            {
                case CampaignActionType.CampaignRally:
                    if (action.TargetRegionId != null)
                    {
                        bonuses[action.TargetRegionId] = bonuses.GetValueOrDefault(action.TargetRegionId) + 8;
                        AddLog($"{player.Party.PartyName} holds rally in {action.TargetRegionId}", LogEntryType.Info);
                    }
                    break;

                case CampaignActionType.MediaBlitz:
                    if (action.TargetGroupId != null)
                    {
                        bonuses[action.TargetGroupId] = bonuses.GetValueOrDefault(action.TargetGroupId) + 6;
                        AddLog($"{player.Party.PartyName} runs media campaign targeting {action.TargetGroupId}", LogEntryType.Info);
                    }
                    break;

                case CampaignActionType.VoterPromise:
                    if (action.PromisePolicyId != null)
                    {
                        // Prevent duplicate promises
                        if (State.Pledges.Any(p => p.PlayerId == player.Id && p.PolicyId == action.PromisePolicyId))
                        {
                            AddLog($"{player.Party.PartyName} has already promised this policy", LogEntryType.Info);
                            break;
                        }
                        var key = $"promise_{action.PromisePolicyId}";
                        bonuses[key] = bonuses.GetValueOrDefault(key) + 5;
                        var direction = action.PromiseDirection ?? "increase";
                        State.Pledges.Add(new Pledge
                        {
                            PlayerId = player.Id,
                            PolicyId = action.PromisePolicyId,
                            Direction = direction,
                            MadeOnTurn = State.Turn,
                            Status = "pending",
                        });
                        AddLog($"{player.Party.PartyName} promises to {direction} {action.PromisePolicyId}", LogEntryType.Info);
                    }
                    break;

                case CampaignActionType.TargetRegion:
                    if (action.TargetRegionId != null)
                    {
                        bonuses[action.TargetRegionId] = bonuses.GetValueOrDefault(action.TargetRegionId) + 5;
                    }
                    break;

                case CampaignActionType.StatePosition:
                    // +2 support across all voter groups
                    foreach (var group in VoterData.All)
                    {
                        bonuses[group.Id] = bonuses.GetValueOrDefault(group.Id) + 2;
                    }
                    AddLog($"{player.Party.PartyName} takes a public stance - +2% across all voter groups", LogEntryType.Info);
                    break;

                case CampaignActionType.AttackAd:
                {
                    var opponent = State.Players.Find(p => p.Id != player.Id);
                    if (opponent != null && action.TargetGroupId != null)
                    {
                        if (!State.CampaignBonuses.ContainsKey(opponent.Id))
                            State.CampaignBonuses[opponent.Id] = new();
                        var oppBonuses = State.CampaignBonuses[opponent.Id];
                        oppBonuses[action.TargetGroupId] = Math.Max(-10, oppBonuses.GetValueOrDefault(action.TargetGroupId) - 4);
                        // Self-penalty for negative campaigning
                        bonuses[action.TargetGroupId] = bonuses.GetValueOrDefault(action.TargetGroupId) - 1;
                        AddLog($"{player.Party.PartyName} runs attack ad targeting {opponent.Party.PartyName} among {action.TargetGroupId}", LogEntryType.Info);
                    }
                    break;
                }

                case CampaignActionType.Fundraiser:
                {
                    // Only one fundraiser per campaign turn
                    var alreadyFundraised = bonuses.GetValueOrDefault("_fundraised_this_turn") > 0;
                    if (alreadyFundraised)
                    {
                        AddLog("Only one fundraiser per campaign turn!", LogEntryType.Info);
                        break;
                    }
                    player.PoliticalCapital += 2; // Net gain of +1 after cost
                    bonuses["_fundraised_this_turn"] = 1;
                    AddLog($"{player.Party.PartyName} hosts a fundraising dinner (+2 PC)", LogEntryType.Info);
                    break;
                }

                case CampaignActionType.Endorsement:
                {
                    if (action.TargetGroupId != null)
                    {
                        bonuses[action.TargetGroupId] = bonuses.GetValueOrDefault(action.TargetGroupId) + 4;
                        // Adjacent groups get +2
                        var groups = VoterData.All;
                        var idx = Array.FindIndex(groups, g => g.Id == action.TargetGroupId);
                        if (idx >= 0)
                        {
                            var prev = groups[(idx - 1 + groups.Length) % groups.Length];
                            var next = groups[(idx + 1) % groups.Length];
                            bonuses[prev.Id] = bonuses.GetValueOrDefault(prev.Id) + 2;
                            bonuses[next.Id] = bonuses.GetValueOrDefault(next.Id) + 2;
                        }
                        AddLog($"{player.Party.PartyName} secures endorsement from {action.TargetGroupId} leader", LogEntryType.Info);
                    }
                    break;
                }
            }
        }

        player.PoliticalCapital -= totalCost;

        // Track that this player has acted
        State.CampaignActedThisTurn[player.Id] = true;

        // Check if all players have submitted
        if (State.Players.All(p => State.CampaignActedThisTurn.GetValueOrDefault(p.Id)))
        {
            State.CampaignActedThisTurn = new();
            // Reset per-turn fundraiser flags
            foreach (var p in State.Players)
            {
                if (State.CampaignBonuses.TryGetValue(p.Id, out var b))
                    b.Remove("_fundraised_this_turn");
            }
            State.PendingCampaignActions = new();
            SimulationEngine.Recalculate(State);
            PhaseEngine.AdvancePhase(State); // -> polling
            AddLog("Campaign standings update", LogEntryType.Info);
        }
        else
        {
            State.PendingCampaignActions = new();
            AddLog($"{player.Party.PartyName} has finished their campaign actions. Waiting for opponent...", LogEntryType.Info);
        }
        BroadcastState();
    }

    // #12 submitCoalitionOffer
    private void HandleSubmitCoalitionOffer(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.CoalitionNegotiation) return;
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        CoalitionOffer? offer = null;
        if (payload is CoalitionOffer co) offer = co;
        else
        {
            var je = AsJson(payload);
            if (je != null)
                offer = JsonSerializer.Deserialize<CoalitionOffer>(je.Value.GetRawText());
        }
        if (offer == null) return;

        var botParty = State.BotParties.Find(bp => bp.Id == offer.ToBotPartyId);
        if (botParty == null) return;

        // Prevent duplicate
        if (State.CoalitionOffers.Any(o => o.FromPlayerId == playerId && o.ToBotPartyId == offer.ToBotPartyId))
        {
            AddLog($"You already approached {botParty.Name}", LogEntryType.Info);
            BroadcastState();
            return;
        }

        var pendingOffer = new CoalitionOffer
        {
            FromPlayerId = playerId,
            ToBotPartyId = botParty.Id,
            Promises = offer.Promises,
            Accepted = false,
            Rejected = false,
        };
        State.CoalitionOffers.Add(pendingOffer);

        AddLog($"{player.Party.PartyName} submits coalition offer to {botParty.Name} ({offer.Promises.Count} promise(s))", LogEntryType.Election);
        BroadcastState();
    }

    // #13 spinScandal
    private void HandleSpinScandal(string playerId, object? payload)
    {
        var ruling = State.Players.Find(p => p.Role == PlayerRole.Ruling);
        if (ruling == null || ruling.Id != playerId) return;
        if (ruling.PoliticalCapital < 2)
        {
            AddLog("Not enough PC to spin scandal (need 2)", LogEntryType.Info);
            BroadcastState();
            return;
        }

        string? scandalId = payload as string;
        if (scandalId == null)
        {
            var je = AsJson(payload);
            if (je != null) scandalId = je.Value.GetString();
        }
        if (scandalId == null) return;

        var scandal = State.ActiveScandals.Find(s => s.Id == scandalId);
        if (scandal != null && !scandal.Spun)
        {
            ruling.PoliticalCapital -= 2;
            ScandalEngine.SpinScandal(scandal);
            AddLog($"Spun scandal: \"{scandal.Title}\" - impact reduced", LogEntryType.Ruling);
        }
        BroadcastState();
    }

    // #14 resolveDiplomaticIncident
    private void HandleResolveDiplomaticIncident(string playerId, object? payload)
    {
        var ruling = State.Players.Find(p => p.Role == PlayerRole.Ruling);
        if (ruling == null || ruling.Id != playerId) return;

        var je = AsJson(payload);
        if (je == null) return;
        var option = GetString(je.Value, "option");
        if (option != "a" && option != "b") return;

        var incident = State.ActiveDiplomaticIncident;
        if (incident == null) return;

        var chosen = option == "a" ? incident.OptionA : incident.OptionB;
        var rel = State.DiplomaticRelations.Find(r => r.NationId == incident.NationId);
        if (rel != null)
        {
            rel.Relation = Clamp(rel.Relation + chosen.RelationDelta, 0, 100);
        }

        if (chosen.Effects.Count > 0)
        {
            State.ActiveEffects.Add(new ActiveEffect
            {
                Type = EffectType.Event,
                Id = $"diplo_{incident.Id}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                TurnsRemaining = 3,
                Data = new() { ["effects"] = chosen.Effects },
            });
        }

        AddLog($"Diplomatic response: \"{chosen.Label}\" ({incident.Title})", LogEntryType.Ruling);
        State.ActiveDiplomaticIncident = null;
        BroadcastState();
    }

    // #15 updateGameSettings
    private void HandleUpdateGameSettings(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;

        // Merge partial settings
        var settings = State.GameSettings;
        if (je.Value.TryGetProperty("scandalsEnabled", out var v1))
            settings.ScandalsEnabled = v1.GetBoolean();
        if (je.Value.TryGetProperty("reputationEnabled", out var v2))
            settings.ReputationEnabled = v2.GetBoolean();
        if (je.Value.TryGetProperty("internationalRelationsEnabled", out var v3))
            settings.InternationalRelationsEnabled = v3.GetBoolean();
        if (je.Value.TryGetProperty("policySynergiesEnabled", out var v4))
            settings.PolicySynergiesEnabled = v4.GetBoolean();
        if (je.Value.TryGetProperty("coalitionMechanicsEnabled", out var v5))
            settings.CoalitionMechanicsEnabled = v5.GetBoolean();

        BroadcastState();
    }

    // #16 poachCoalitionPartner
    private void HandlePoachCoalitionPartner(string playerId, object? payload)
    {
        string? botPartyId = payload as string;
        if (botPartyId == null)
        {
            var je = AsJson(payload);
            if (je != null) botPartyId = je.Value.GetString();
        }
        if (botPartyId == null) return;

        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        var existingPartner = State.CoalitionPartners.Find(cp => cp.BotPartyId == botPartyId);
        if (existingPartner == null)
        {
            AddLog($"{botPartyId} is not in any coalition", LogEntryType.Info);
            BroadcastState();
            return;
        }

        // Probability check based on dissatisfaction
        var poachChance = (100 - existingPartner.Satisfaction) / 200.0;
        if (Rng.NextDouble() < poachChance)
        {
            State.CoalitionPartners.RemoveAll(cp => cp.BotPartyId == botPartyId);
            var bot = State.BotParties.Find(b => b.Id == botPartyId);
            AddLog($"{bot?.Name ?? botPartyId} leaves the coalition!", LogEntryType.Opposition);
        }
        else
        {
            var bot = State.BotParties.Find(b => b.Id == botPartyId);
            AddLog($"{bot?.Name ?? botPartyId} stays loyal to the coalition", LogEntryType.Info);
        }
        BroadcastState();
    }

    // #17 lobbyBill
    private void HandleLobbyBill(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;

        var billId = GetString(je.Value, "billId");
        var targetPartyId = GetString(je.Value, "targetPartyId");
        var pcSpent = GetInt(je.Value, "pcSpent");
        var direction = GetString(je.Value, "direction") ?? "support";

        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;
        if (pcSpent < 1 || pcSpent > player.PoliticalCapital)
        {
            AddLog($"Not enough PC to lobby (need {pcSpent}, have {player.PoliticalCapital})", LogEntryType.Info);
            BroadcastState();
            return;
        }

        var bill = State.ActiveBills.Find(b => b.Id == billId);
        if (bill == null || (bill.Status != BillStatus.Voting && bill.Status != BillStatus.Pending))
        {
            AddLog("Bill not available for lobbying", LogEntryType.Info);
            BroadcastState();
            return;
        }

        player.PoliticalCapital -= pcSpent;
        var influence = direction == "support" ? pcSpent : -pcSpent;
        bill.LobbyInfluence[targetPartyId!] = bill.LobbyInfluence.GetValueOrDefault(targetPartyId!) + influence;

        var botParty = State.BotParties.Find(b => b.Id == targetPartyId);
        var dirLabel = direction == "support" ? "support" : "oppose";
        AddLog($"{player.Party.PartyName} lobbied {botParty?.Name ?? targetPartyId} to {dirLabel} \"{bill.Title}\" ({pcSpent} PC)", LogEntryType.Info);
        BroadcastState();
    }

    // #18 whipVotes
    private void HandleWhipVotes(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;

        var billId = GetString(je.Value, "billId");
        var pcSpent = GetInt(je.Value, "pcSpent");

        var ruling = State.Players.Find(p => p.Id == playerId && p.Role == PlayerRole.Ruling);
        if (ruling == null)
        {
            AddLog("Only the ruling party can whip votes", LogEntryType.Info);
            BroadcastState();
            return;
        }
        if (pcSpent < 1 || pcSpent > ruling.PoliticalCapital)
        {
            AddLog($"Not enough PC to whip (need {pcSpent}, have {ruling.PoliticalCapital})", LogEntryType.Info);
            BroadcastState();
            return;
        }

        var bill = State.ActiveBills.Find(b => b.Id == billId);
        if (bill == null || (bill.Status != BillStatus.Voting && bill.Status != BillStatus.Pending))
        {
            AddLog("Bill not available for whipping", LogEntryType.Info);
            BroadcastState();
            return;
        }

        ruling.PoliticalCapital -= pcSpent;
        bill.WhipBonus = Math.Min(30, bill.WhipBonus + pcSpent * 15);

        AddLog($"{ruling.Party.PartyName} whips coalition partners on \"{bill.Title}\" (+{pcSpent * 15}% loyalty, {pcSpent} PC)", LogEntryType.Ruling);
        BroadcastState();
    }

    // #19 campaignForBill
    private void HandleCampaignForBill(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;

        var billId = GetString(je.Value, "billId");
        var pcSpent = GetInt(je.Value, "pcSpent");
        var direction = GetString(je.Value, "direction") ?? "support";

        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;
        if (pcSpent < 1 || pcSpent > player.PoliticalCapital)
        {
            AddLog("Not enough PC for public campaign", LogEntryType.Info);
            BroadcastState();
            return;
        }

        var bill = State.ActiveBills.Find(b => b.Id == billId);
        if (bill == null || (bill.Status != BillStatus.Voting && bill.Status != BillStatus.Pending))
        {
            AddLog("Bill not available for campaigning", LogEntryType.Info);
            BroadcastState();
            return;
        }

        player.PoliticalCapital -= pcSpent;
        var pressureDir = direction == "support" ? 1 : -1;
        bill.PublicPressure = Clamp(bill.PublicPressure + pcSpent * 5 * pressureDir, -20, 20);

        var dirLabel = direction == "support" ? "supporting" : "opposing";
        AddLog($"{player.Party.PartyName} launches public campaign {dirLabel} \"{bill.Title}\" ({pcSpent} PC)", LogEntryType.Info);
        BroadcastState();
    }

    // #20 callBillVote - handled as alias for startLiveVote in switch

    // #21 vetoBill
    private void HandleVetoBill(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;
        var billId = GetString(je.Value, "billId");

        var ruling = State.Players.Find(p => p.Id == playerId && p.Role == PlayerRole.Ruling);
        if (ruling == null)
        {
            AddLog("Only the ruling party can veto bills", LogEntryType.Info);
            BroadcastState();
            return;
        }

        if (ruling.PoliticalCapital < 3)
        {
            AddLog($"Not enough PC to veto (need 3, have {ruling.PoliticalCapital})", LogEntryType.Info);
            BroadcastState();
            return;
        }

        var bill = State.ActiveBills.Find(b => b.Id == billId);
        if (bill == null || (bill.Status != BillStatus.Passed && bill.Status != BillStatus.Pending))
        {
            AddLog("Bill not available for veto", LogEntryType.Info);
            BroadcastState();
            return;
        }

        if (bill.AuthorId == playerId)
        {
            AddLog("Cannot veto your own bill", LogEntryType.Info);
            BroadcastState();
            return;
        }

        ruling.PoliticalCapital -= 3;
        bill.Status = BillStatus.Vetoed;

        // Remove delayed policy effects for this bill
        if (bill.FromTemplate != null)
        {
            var template = BillTemplateData.GetById(bill.FromTemplate);
            if (template != null)
            {
                foreach (var change in template.PolicyChanges)
                {
                    State.DelayedPolicies.RemoveAll(
                        dp => dp.PolicyId == change.PolicyId && dp.NewValue == change.TargetValue);
                }
            }
        }
        else
        {
            State.DelayedPolicies.RemoveAll(
                dp => dp.PolicyId == bill.PolicyId && dp.NewValue == bill.ProposedValue);
        }

        AddLog($"VETO: {ruling.Party.PartyName} vetoes \"{bill.Title}\" (3 PC)", LogEntryType.Ruling);
        BroadcastState();
    }

    // #22 overrideVeto
    private void HandleOverrideVeto(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;
        var billId = GetString(je.Value, "billId");

        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        var bill = State.ActiveBills.Find(b => b.Id == billId && b.Status == BillStatus.Vetoed);
        if (bill == null)
        {
            AddLog("No vetoed bill to override", LogEntryType.Info);
            BroadcastState();
            return;
        }

        // Rerun the vote (simplified: iterate parliament seats with fresh intentions)
        int votesFor = 0, votesAgainst = 0;
        var partyVotes = new Dictionary<string, PartyVoteCount>();

        foreach (var seat in State.Parliament.Seats)
        {
            // For override, use basic ideology alignment (simplified)
            var yesProb = 0.35;
            var botParty = State.BotParties.Find(b => b.Id == seat.PartyId);
            if (botParty != null && botParty.PolicyPreferences.TryGetValue(bill.PolicyId, out var pref))
            {
                var currentVal = State.Policies.GetValueOrDefault(bill.PolicyId, 50);
                var currentDist = Math.Abs(currentVal - pref);
                var proposedDist = Math.Abs(bill.ProposedValue - pref);
                yesProb = proposedDist < currentDist ? 0.6 : 0.2;
            }
            // Player seats: author supports, others oppose
            var playerMatch = State.Players.Find(p => p.Id == seat.PartyId);
            if (playerMatch != null)
                yesProb = playerMatch.Id == bill.AuthorId ? 0.9 : 0.1;

            var voteYes = Rng.NextDouble() < yesProb;

            if (!partyVotes.ContainsKey(seat.PartyId))
                partyVotes[seat.PartyId] = new PartyVoteCount();
            if (voteYes) { votesFor++; partyVotes[seat.PartyId].Yes++; }
            else { votesAgainst++; partyVotes[seat.PartyId].No++; }
        }

        bill.VetoOverrideVotes = new PartyVoteCount { Yes = votesFor, No = votesAgainst };

        if (votesFor >= 67)
        {
            bill.Status = BillStatus.Passed;
            bill.VotesFor = votesFor;
            bill.VotesAgainst = votesAgainst;

            // Re-add delayed policies
            var template = bill.FromTemplate != null ? BillTemplateData.GetById(bill.FromTemplate) : null;
            if (template != null)
            {
                foreach (var change in template.PolicyChanges)
                {
                    State.DelayedPolicies.Add(new DelayedPolicy
                    {
                        PolicyId = change.PolicyId,
                        OriginalValue = State.Policies.GetValueOrDefault(change.PolicyId),
                        NewValue = change.TargetValue,
                        TurnsRemaining = 2,
                        Source = "bill",
                    });
                }
            }
            else
            {
                State.DelayedPolicies.Add(new DelayedPolicy
                {
                    PolicyId = bill.PolicyId,
                    OriginalValue = State.Policies.GetValueOrDefault(bill.PolicyId),
                    NewValue = bill.ProposedValue,
                    TurnsRemaining = 2,
                    Source = "bill",
                });
            }

            AddLog($"VETO OVERRIDDEN! {bill.Title} passes with {votesFor}/100 votes (needed 67)", LogEntryType.Ruling);
        }
        else
        {
            AddLog($"Veto override FAILS for {bill.Title} ({votesFor}/100, needed 67)", LogEntryType.Ruling);
        }

        BroadcastState();
    }

    // #23 challengeConstitutionality
    private void HandleChallengeConstitutionality(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;
        var billId = GetString(je.Value, "billId");

        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;

        if (player.PoliticalCapital < 2)
        {
            AddLog($"Not enough PC to challenge (need 2, have {player.PoliticalCapital})", LogEntryType.Info);
            BroadcastState();
            return;
        }

        var bill = State.ActiveBills.Find(b => b.Id == billId
            && (b.Status == BillStatus.Passed || b.Status == BillStatus.Pending));
        if (bill == null)
        {
            AddLog("Bill not available for constitutional challenge", LogEntryType.Info);
            BroadcastState();
            return;
        }

        player.PoliticalCapital -= 2;

        var score = bill.ConstitutionalScore;
        var strikeDownChance = (100.0 - score) / 100.0;
        var isUnconstitutional = Rng.NextDouble() < strikeDownChance;

        if (isUnconstitutional)
        {
            bill.Status = BillStatus.Unconstitutional;

            // Remove delayed policy effects
            if (bill.FromTemplate != null)
            {
                var template = BillTemplateData.GetById(bill.FromTemplate);
                if (template != null)
                {
                    foreach (var change in template.PolicyChanges)
                    {
                        State.DelayedPolicies.RemoveAll(
                            dp => dp.PolicyId == change.PolicyId && dp.NewValue == change.TargetValue);
                    }
                }
            }
            else
            {
                State.DelayedPolicies.RemoveAll(
                    dp => dp.PolicyId == bill.PolicyId && dp.NewValue == bill.ProposedValue);
            }

            AddLog($"UNCONSTITUTIONAL! Court strikes down \"{bill.Title}\" (score: {score}/100)", LogEntryType.Ruling);
        }
        else
        {
            AddLog($"Constitutional challenge FAILS for \"{bill.Title}\" - court upholds (score: {score}/100)", LogEntryType.Ruling);

            if (player.Role == PlayerRole.Opposition)
                State.OppositionCredibility = Math.Max(0, State.OppositionCredibility - 5);
        }

        BroadcastState();
    }

    // #24 forceBillVote
    private void HandleForceBillVote(string playerId, object? payload)
    {
        var je = AsJson(payload);
        if (je == null) return;
        var billId = GetString(je.Value, "billId");

        var forcePlayer = State.Players.Find(p => p.Id == playerId && p.Role == PlayerRole.Ruling);
        if (forcePlayer == null) return;

        var bill = State.ActiveBills.Find(b => b.Id == billId && b.Status == BillStatus.Filibustered);
        if (bill == null)
        {
            AddLog("No filibustered bill to force", LogEntryType.Info);
            BroadcastState();
            return;
        }

        // Check if ruling coalition has 60+ seats
        int rulingCoalitionSeats = State.Parliament.SeatsByParty.GetValueOrDefault(forcePlayer.Id);
        foreach (var cp in State.CoalitionPartners)
            rulingCoalitionSeats += State.Parliament.SeatsByParty.GetValueOrDefault(cp.BotPartyId);

        if (rulingCoalitionSeats >= 60)
        {
            bill.Status = BillStatus.Pending;
            bill.FilibusterTurns = null;
            AddLog($"Filibuster broken! \"{bill.Title}\" returns to pending status ({rulingCoalitionSeats} seats)", LogEntryType.Ruling);
        }
        else
        {
            AddLog($"Cannot break filibuster - need 60 seats, coalition has {rulingCoalitionSeats}", LogEntryType.Info);
        }
        BroadcastState();
    }

    // #25 startLiveVote
    private void HandleStartLiveVote(string playerId, object? payload)
    {
        string? billId = null;
        if (payload is JsonElement je3)
            billId = GetString(je3, "billId");
        else
        {
            var je = AsJson(payload);
            if (je != null) billId = GetString(je.Value, "billId");
        }
        if (billId == null) return;

        var bill = State.ActiveBills.Find(b => b.Id == billId);
        if (bill == null || (bill.Status != BillStatus.Pending && bill.Status != BillStatus.Voting))
        {
            AddLog("Bill not available for live voting", LogEntryType.Info);
            BroadcastState();
            return;
        }

        bill.Status = BillStatus.Voting;

        // Compute initial vote intentions for each bot party
        var intentions = new Dictionary<string, double>();
        foreach (var bot in State.BotParties)
        {
            double yesProb = 0.35;
            if (bot.PolicyPreferences.TryGetValue(bill.PolicyId, out var pref))
            {
                var currentValue = State.Policies.GetValueOrDefault(bill.PolicyId, 50);
                var currentDist = Math.Abs(currentValue - pref);
                var proposedDist = Math.Abs(bill.ProposedValue - pref);
                yesProb = proposedDist < currentDist
                    ? 0.6 + (currentDist - proposedDist) / 200.0
                    : 0.2 - (proposedDist - currentDist) / 400.0;
            }
            intentions[bot.Id] = Clamp((yesProb - 0.5) * 2, -1, 1);
        }

        // Author supports, other human opposes by default
        foreach (var p in State.Players)
            intentions[p.Id] = p.Id == bill.AuthorId ? 0.9 : -0.5;

        State.LiveVote = new LiveVoteState
        {
            BillId = bill.Id,
            Bill = bill,
            PartyIntentions = intentions,
            LobbySpent = new(),
            ReadyPlayers = new(),
            PlayerVotes = new(),
            StartedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            Finalized = false,
        };

        AddLog($"LIVE VOTE: \"{bill.Title}\" goes to parliament! Lobby now!", LogEntryType.Ruling);
        BroadcastState();
    }

    // #26 lobbyLiveVote
    private void HandleLobbyLiveVote(string playerId, object? payload)
    {
        if (State.LiveVote == null || State.LiveVote.Finalized) return;

        var je = AsJson(payload);
        if (je == null) return;
        var targetPartyId = GetString(je.Value, "targetPartyId");
        var pcSpent = GetInt(je.Value, "pcSpent");
        var direction = GetString(je.Value, "direction") ?? "support";

        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null || pcSpent < 1 || pcSpent > player.PoliticalCapital) return;

        player.PoliticalCapital -= pcSpent;
        State.LiveVote.LobbySpent[playerId] =
            State.LiveVote.LobbySpent.GetValueOrDefault(playerId) + pcSpent;

        // Shift intention: 0.1 per PC
        var shift = pcSpent * 0.1 * (direction == "support" ? 1 : -1);
        State.LiveVote.PartyIntentions[targetPartyId!] = Clamp(
            State.LiveVote.PartyIntentions.GetValueOrDefault(targetPartyId!) + shift, -1, 1);

        // Also update the bill lobby influence
        var lvBill = State.ActiveBills.Find(b => b.Id == State.LiveVote.BillId);
        if (lvBill != null)
        {
            var influence = direction == "support" ? pcSpent : -pcSpent;
            lvBill.LobbyInfluence[targetPartyId!] =
                lvBill.LobbyInfluence.GetValueOrDefault(targetPartyId!) + influence;
        }

        var botName = State.BotParties.Find(b => b.Id == targetPartyId)?.Name ?? targetPartyId;
        var dirLabel = direction == "support" ? "support" : "oppose";
        AddLog($"{player.Party.PartyName} lobbied {botName} to {dirLabel} ({pcSpent} PC)", LogEntryType.Info);
        BroadcastState();
    }

    // #27 whipLiveVote
    private void HandleWhipLiveVote(string playerId, object? payload)
    {
        if (State.LiveVote == null || State.LiveVote.Finalized) return;

        var je = AsJson(payload);
        if (je == null) return;
        var pcSpent = GetInt(je.Value, "pcSpent");

        var player = State.Players.Find(p => p.Id == playerId && p.Role == PlayerRole.Ruling);
        if (player == null || pcSpent < 1 || pcSpent > player.PoliticalCapital) return;

        player.PoliticalCapital -= pcSpent;

        // Shift all coalition partners toward yes by 0.15 per PC
        foreach (var cp in State.CoalitionPartners)
        {
            State.LiveVote.PartyIntentions[cp.BotPartyId] = Clamp(
                State.LiveVote.PartyIntentions.GetValueOrDefault(cp.BotPartyId) + pcSpent * 0.15, -1, 1);
        }

        var lvBill = State.ActiveBills.Find(b => b.Id == State.LiveVote.BillId);
        if (lvBill != null)
            lvBill.WhipBonus = Math.Min(30, lvBill.WhipBonus + pcSpent * 15);

        AddLog($"{player.Party.PartyName} whips coalition partners (+{pcSpent * 15}% loyalty)", LogEntryType.Ruling);
        BroadcastState();
    }

    // #28 campaignLiveVote
    private void HandleCampaignLiveVote(string playerId, object? payload)
    {
        if (State.LiveVote == null || State.LiveVote.Finalized) return;

        var je = AsJson(payload);
        if (je == null) return;
        var pcSpent = GetInt(je.Value, "pcSpent");
        var direction = GetString(je.Value, "direction") ?? "support";

        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null || pcSpent < 1 || pcSpent > player.PoliticalCapital) return;

        player.PoliticalCapital -= pcSpent;

        // Shift ALL bot parties by 0.05 per PC
        var campShift = pcSpent * 0.05 * (direction == "support" ? 1 : -1);
        foreach (var bot in State.BotParties)
        {
            State.LiveVote.PartyIntentions[bot.Id] = Clamp(
                State.LiveVote.PartyIntentions.GetValueOrDefault(bot.Id) + campShift, -1, 1);
        }

        var lvBill = State.ActiveBills.Find(b => b.Id == State.LiveVote.BillId);
        if (lvBill != null)
        {
            var pressureDir = direction == "support" ? 1 : -1;
            lvBill.PublicPressure = Clamp(lvBill.PublicPressure + pcSpent * 5 * pressureDir, -20, 20);
        }

        var dirLabel = direction == "support" ? "supporting" : "opposing";
        AddLog($"{player.Party.PartyName} campaigns {dirLabel} the bill ({pcSpent} PC)", LogEntryType.Info);
        BroadcastState();
    }

    // #29 readyLiveVote
    private void HandleReadyLiveVote(string playerId)
    {
        if (State.LiveVote == null || State.LiveVote.Finalized) return;
        if (!State.LiveVote.ReadyPlayers.Contains(playerId))
            State.LiveVote.ReadyPlayers.Add(playerId);
        BroadcastState();
    }

    // #30 setPlayerVote
    private void HandleSetPlayerVote(string playerId, object? payload)
    {
        if (State.LiveVote == null || State.LiveVote.Finalized) return;

        string? vote = null;
        var je = AsJson(payload);
        if (je != null)
        {
            if (je.Value.TryGetProperty("vote", out var vProp))
            {
                vote = vProp.ValueKind == JsonValueKind.Null ? null : vProp.GetString();
            }
        }

        if (vote == null)
            State.LiveVote.PlayerVotes.Remove(playerId);
        else
            State.LiveVote.PlayerVotes[playerId] = vote;

        BroadcastState();
    }

    // #31 finalizeLiveVote
    private void HandleFinalizeLiveVote(string playerId)
    {
        if (State.LiveVote == null || State.LiveVote.Finalized) return;

        var finalBill = State.ActiveBills.Find(b => b.Id == State.LiveVote.BillId);
        if (finalBill == null) return;

        int votesFor = 0, votesAgainst = 0;
        var partyVotes = new Dictionary<string, PartyVoteCount>();

        foreach (var seat in State.Parliament.Seats)
        {
            // Check explicit player vote
            State.LiveVote.PlayerVotes.TryGetValue(seat.PartyId, out var explicitVote);

            bool voteYes;
            if (explicitVote == "yes")
                voteYes = true;
            else if (explicitVote == "no")
                voteYes = false;
            else
            {
                // Intention-based random voting for bot parties / abstaining players
                var intention = State.LiveVote.PartyIntentions.GetValueOrDefault(seat.PartyId);
                var yesProb = Clamp((intention + 1) / 2.0, 0.02, 0.98);
                voteYes = Rng.NextDouble() < yesProb;
            }

            if (!partyVotes.ContainsKey(seat.PartyId))
                partyVotes[seat.PartyId] = new PartyVoteCount();
            if (voteYes) { votesFor++; partyVotes[seat.PartyId].Yes++; }
            else { votesAgainst++; partyVotes[seat.PartyId].No++; }
        }

        finalBill.VotesFor = votesFor;
        finalBill.VotesAgainst = votesAgainst;
        finalBill.PartyVotes = partyVotes;
        finalBill.Status = votesFor >= 51 ? BillStatus.Passed : BillStatus.Failed;

        State.LiveVote.Finalized = true;
        State.LiveVote.Result = new LiveVoteResult
        {
            Passed = finalBill.Status == BillStatus.Passed,
            VotesFor = votesFor,
            VotesAgainst = votesAgainst,
            PartyVotes = partyVotes,
        };

        if (finalBill.Status == BillStatus.Passed)
        {
            var template = finalBill.FromTemplate != null ? BillTemplateData.GetById(finalBill.FromTemplate) : null;
            if (template != null)
            {
                foreach (var change in template.PolicyChanges)
                {
                    State.DelayedPolicies.Add(new DelayedPolicy
                    {
                        PolicyId = change.PolicyId,
                        OriginalValue = State.Policies.GetValueOrDefault(change.PolicyId),
                        NewValue = change.TargetValue,
                        TurnsRemaining = 2,
                        Source = "bill",
                    });
                }
            }
            else
            {
                State.DelayedPolicies.Add(new DelayedPolicy
                {
                    PolicyId = finalBill.PolicyId,
                    OriginalValue = State.Policies.GetValueOrDefault(finalBill.PolicyId),
                    NewValue = finalBill.ProposedValue,
                    TurnsRemaining = 2,
                    Source = "bill",
                });
            }
            AddLog($"{finalBill.Title} PASSED ({votesFor}-{votesAgainst})", LogEntryType.Ruling);
        }
        else
        {
            AddLog($"{finalBill.Title} FAILED ({votesFor}-{votesAgainst})", LogEntryType.Ruling);
        }

        SimulationEngine.Recalculate(State);
        BroadcastState();
    }

    // #32 dismissLiveVote
    private void HandleDismissLiveVote()
    {
        State.LiveVote = null;
        BroadcastState();
    }

    // #33 readyPhase
    private void HandleReadyPhase(string playerId)
    {
        State.PhaseReady[playerId] = true;

        // Check if all players are ready
        if (State.Players.All(p => State.PhaseReady.GetValueOrDefault(p.Id)))
        {
            HandleEndTurnPhase(playerId);
        }
        else
        {
            BroadcastState();
        }
    }

    // #34 influenceMedia
    private void HandleInfluenceMedia(string playerId, object? payload)
    {
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;
        if (player.PoliticalCapital < 2)
        {
            AddLog("Not enough PC to influence media (need 2)", LogEntryType.Info);
            BroadcastState();
            return;
        }

        var je = AsJson(payload);
        if (je == null) return;
        var outletId = GetString(je.Value, "outletId");
        if (outletId == null) return;

        var outlet = State.MediaLandscape.Find(m => m.Id == outletId);
        if (outlet == null) return;

        player.PoliticalCapital -= 2;
        outlet.CurrentStance = Math.Min(50, outlet.CurrentStance + 10);
        outlet.InfluencedUntil = State.Turn + 3;

        AddLog($"{player.Party.PartyName} launches PR campaign with {outlet.Name} (2 PC)", LogEntryType.Info);
        BroadcastState();
    }

    // #35 submitDebateChoice
    private void HandleSubmitDebateChoice(string playerId, object? payload)
    {
        if (State.Phase != TurnPhase.Debate || State.Debate == null || State.Debate.Resolved) return;

        var je = AsJson(payload);
        if (je == null) return;

        // Parse choices: { topicId: "attack"/"defend"/"pivot" }
        var choices = new Dictionary<string, DebateChoice>();
        foreach (var prop in je.Value.EnumerateObject())
        {
            var choiceStr = prop.Value.GetString();
            if (Enum.TryParse<DebateChoice>(choiceStr, true, out var dc))
                choices[prop.Name] = dc;
        }

        State.Debate.PlayerChoices[playerId] = choices;

        // Check if all players have submitted
        if (!State.Players.All(p => State.Debate.PlayerChoices.ContainsKey(p.Id)))
        {
            BroadcastState();
            return;
        }

        // Resolve debate: rock-paper-scissors (attack beats defend, defend beats pivot, pivot beats attack)
        var scores = new Dictionary<string, int>();
        foreach (var p in State.Players) scores[p.Id] = 0;

        var beats = new Dictionary<DebateChoice, DebateChoice>
        {
            [DebateChoice.Attack] = DebateChoice.Defend,
            [DebateChoice.Defend] = DebateChoice.Pivot,
            [DebateChoice.Pivot] = DebateChoice.Attack,
        };

        foreach (var topic in State.Debate.Topics)
        {
            if (State.Players.Count < 2) continue;
            var p1 = State.Players[0];
            var p2 = State.Players[1];

            var c1 = State.Debate.PlayerChoices.GetValueOrDefault(p1.Id)
                ?.GetValueOrDefault(topic.Id, DebateChoice.Defend) ?? DebateChoice.Defend;
            var c2 = State.Debate.PlayerChoices.GetValueOrDefault(p2.Id)
                ?.GetValueOrDefault(topic.Id, DebateChoice.Defend) ?? DebateChoice.Defend;

            if (beats[c1] == c2)
            {
                scores[p1.Id]++;
                AddLog($"{topic.Name}: {p1.Party.PartyName} wins ({c1} beats {c2})", LogEntryType.Election);
            }
            else if (beats[c2] == c1)
            {
                scores[p2.Id]++;
                AddLog($"{topic.Name}: {p2.Party.PartyName} wins ({c2} beats {c1})", LogEntryType.Election);
            }
            else
            {
                AddLog($"{topic.Name}: Draw (both chose {c1})", LogEntryType.Election);
            }
        }

        State.Debate.Scores = scores;
        State.Debate.Resolved = true;

        // Determine winner
        if (State.Players.Count >= 2)
        {
            var id1 = State.Players[0].Id;
            var id2 = State.Players[1].Id;
            if (scores[id1] > scores[id2])
            {
                State.Debate.Winner = id1;
                State.ApprovalRating[id1] = Math.Min(100, State.ApprovalRating.GetValueOrDefault(id1, 50) + 5);
                State.ApprovalRating[id2] = Math.Max(0, State.ApprovalRating.GetValueOrDefault(id2, 50) - 3);
                AddLog($"{State.Players[0].Party.PartyName} wins the debate! +5 approval", LogEntryType.Election);
            }
            else if (scores[id2] > scores[id1])
            {
                State.Debate.Winner = id2;
                State.ApprovalRating[id2] = Math.Min(100, State.ApprovalRating.GetValueOrDefault(id2, 50) + 5);
                State.ApprovalRating[id1] = Math.Max(0, State.ApprovalRating.GetValueOrDefault(id1, 50) - 3);
                AddLog($"{State.Players[1].Party.PartyName} wins the debate! +5 approval", LogEntryType.Election);
            }
            else
            {
                AddLog("Debate ends in a draw - no approval change", LogEntryType.Election);
            }
        }

        SimulationEngine.Recalculate(State);
        BroadcastState();
    }

    // #36 runFocusGroup
    private void HandleRunFocusGroup(string playerId, object? payload)
    {
        var player = State.Players.Find(p => p.Id == playerId);
        if (player == null) return;
        if (player.PoliticalCapital < 1)
        {
            AddLog("Not enough PC for focus group (need 1)", LogEntryType.Info);
            BroadcastState();
            return;
        }

        var je = AsJson(payload);
        if (je == null) return;
        var policyId = GetString(je.Value, "policyId");
        var proposedValue = GetInt(je.Value, "proposedValue");
        if (policyId == null) return;

        var policyDef = PolicyData.All.FirstOrDefault(p => p.Id == policyId);
        if (policyDef == null) return;

        player.PoliticalCapital -= 1;

        // Simulate predicted voter satisfaction impact
        var currentValue = State.Policies.GetValueOrDefault(policyId, 50);
        var predictedImpact = new Dictionary<string, double>();
        foreach (var group in VoterData.All)
        {
            if (group.PolicyPreferences.TryGetValue(policyId, out var ideal))
            {
                var currentDist = Math.Abs(currentValue - ideal);
                var proposedDist = Math.Abs(proposedValue - ideal);
                var delta = (currentDist - proposedDist) * 0.3;
                predictedImpact[group.Id] = Math.Round(delta * 10) / 10.0;
            }
        }

        State.FocusGroupResult = new Dictionary<string, object>
        {
            ["policyId"] = policyId,
            ["predictedImpact"] = predictedImpact,
        };

        AddLog($"Focus group polled on {policyDef.Name}: {currentValue} -> {proposedValue}", LogEntryType.Info);
        BroadcastState();
    }

    // #37 dismissFocusGroup
    private void HandleDismissFocusGroup()
    {
        State.FocusGroupResult = null;
        BroadcastState();
    }

    // #38 endTurnPhase - already handled by HandleEndTurnPhase above

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
