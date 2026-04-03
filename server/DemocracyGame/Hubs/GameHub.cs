using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using DemocracyGame.Models;
using DemocracyGame.Services;

namespace DemocracyGame.Hubs;

/// <summary>
/// SignalR hub for real-time multiplayer — authoritative game server.
/// All game logic runs on C#. Clients are pure UI.
/// </summary>
public class GameHub : Hub
{
    private readonly GameRoomService _rooms;

    public GameHub(GameRoomService rooms)
    {
        _rooms = rooms;
    }

    /// <summary>Create a new game room. Returns room code + initial state.</summary>
    public async Task<object> CreateRoom(string playerName)
    {
        var roomCode = _rooms.CreateRoom(playerName, Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);

        var state = _rooms.GetState(roomCode);
        return new { roomCode, state };
    }

    /// <summary>Join an existing room by code.</summary>
    public async Task<object> JoinRoom(string roomCode, string playerName)
    {
        var success = _rooms.JoinRoom(roomCode, playerName, Context.ConnectionId);
        if (!success)
            return new { success = false, error = "Room not found or full" };

        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);

        // Notify other players
        await Clients.OthersInGroup(roomCode).SendAsync("PlayerJoined");

        // Send current state to ALL players (joining player + existing)
        var state = _rooms.GetState(roomCode);
        if (state != null)
            await Clients.Group(roomCode).SendAsync("GameState", state);

        return new { success = true, state };
    }

    /// <summary>Rejoin a room after reconnection.</summary>
    public async Task RejoinRoom(string roomCode)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
        var state = _rooms.GetState(roomCode);
        if (state != null)
            await Clients.Caller.SendAsync("GameState", state);
    }

    /// <summary>Send a game action — server processes it and broadcasts new state.</summary>
    public async Task SendAction(string roomCode, string action, object? payload = null)
    {
        var playerId = _rooms.GetPlayerId(roomCode, Context.ConnectionId);
        if (playerId == null) return;

        // Deserialize payload from JsonElement if needed
        object? deserializedPayload = payload;
        if (payload is JsonElement jsonElement)
        {
            deserializedPayload = DeserializePayload(action, jsonElement);
        }

        _rooms.HandleAction(roomCode, playerId, action, deserializedPayload);

        // Broadcast updated state to ALL players in the room
        var state = _rooms.GetState(roomCode);
        if (state != null)
            await Clients.Group(roomCode).SendAsync("GameState", state);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var roomCode = _rooms.GetRoomForConnection(Context.ConnectionId);
        if (roomCode != null)
        {
            _rooms.HandleDisconnect(roomCode, Context.ConnectionId);
            await Clients.Group(roomCode).SendAsync("PlayerDisconnected");
        }
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Deserialize SignalR payload (arrives as JsonElement) into the correct C# type
    /// based on the action name.
    /// </summary>
    private static object? DeserializePayload(string action, JsonElement json)
    {
        try
        {
            return action switch
            {
                "submitPartyConfig" => json.Deserialize<PartyConfig>(JsonConfig.Options),
                "submitPolicyChanges" => json.Deserialize<List<PolicyChange>>(JsonConfig.Options),
                "submitOppositionActions" => json.Deserialize<List<OppositionAction>>(JsonConfig.Options),
                "submitCampaignActions" => json.Deserialize<List<CampaignAction>>(JsonConfig.Options),
                "submitCoalitionOffer" => json.Deserialize<CoalitionOffer>(JsonConfig.Options),
                "updateGameSettings" => json.Deserialize<GameSettings>(JsonConfig.Options),
                "resolveDilemma" => json.GetString(),
                "spinScandal" => json.GetString(),
                "poachCoalitionPartner" => json.GetString(),
                "submitDebateChoice" => json.Deserialize<Dictionary<string, string>>(JsonConfig.Options),
                // Object payloads with specific fields
                "submitBill" or "lobbyBill" or "whipVotes" or "campaignForBill"
                    or "vetoBill" or "overrideVeto" or "challengeConstitutionality"
                    or "forceBillVote" or "startLiveVote" or "callBillVote"
                    or "lobbyLiveVote" or "whipLiveVote" or "campaignLiveVote"
                    or "setPlayerVote" or "appointMinister" or "fireMinister"
                    or "appointShadowMinister" or "resolveDiplomaticIncident"
                    or "influenceMedia" or "runFocusGroup"
                    or "proposeBillFromLibrary"
                    => json.Deserialize<Dictionary<string, JsonElement>>(JsonConfig.Options),
                // No payload actions
                _ => null,
            };
        }
        catch
        {
            return null;
        }
    }
}
