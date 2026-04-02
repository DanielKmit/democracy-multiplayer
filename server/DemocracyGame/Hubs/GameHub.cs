using Microsoft.AspNetCore.SignalR;
using DemocracyGame.Models;
using DemocracyGame.Services;

namespace DemocracyGame.Hubs;

/// <summary>
/// SignalR hub for real-time multiplayer communication.
/// Replaces the Socket.IO implementation from the TypeScript version.
/// </summary>
public class GameHub : Hub
{
    private readonly GameRoomService _rooms;

    public GameHub(GameRoomService rooms)
    {
        _rooms = rooms;
    }

    /// <summary>Create a new game room. Returns the room code.</summary>
    public async Task<string> CreateRoom(string playerName)
    {
        var roomCode = _rooms.CreateRoom(playerName, Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
        return roomCode;
    }

    /// <summary>Join an existing room by code.</summary>
    public async Task<bool> JoinRoom(string roomCode, string playerName)
    {
        var success = _rooms.JoinRoom(roomCode, playerName, Context.ConnectionId);
        if (!success) return false;

        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
        await Clients.OthersInGroup(roomCode).SendAsync("PlayerJoined", playerName);

        // Send current state to the joining player
        var state = _rooms.GetState(roomCode);
        if (state != null)
            await Clients.Caller.SendAsync("GameState", state);

        return true;
    }

    /// <summary>Send a game action (policy change, end turn, etc.).</summary>
    public async Task SendAction(string roomCode, string action, object? payload = null)
    {
        var playerId = _rooms.GetPlayerId(roomCode, Context.ConnectionId);
        if (playerId == null) return;

        _rooms.HandleAction(roomCode, playerId, action, payload);

        // Broadcast updated state to all players
        var state = _rooms.GetState(roomCode);
        if (state != null)
            await Clients.Group(roomCode).SendAsync("GameState", state);
    }

    /// <summary>Ready up for current phase.</summary>
    public async Task ReadyPhase(string roomCode)
    {
        var playerId = _rooms.GetPlayerId(roomCode, Context.ConnectionId);
        if (playerId == null) return;

        _rooms.HandleAction(roomCode, playerId, "readyPhase");

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
}
