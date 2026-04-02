using System.Collections.Concurrent;
using DemocracyGame.Engine;
using DemocracyGame.Models;

namespace DemocracyGame.Services;

/// <summary>
/// Manages game rooms — maps room codes to GameHost instances and player connections.
/// Thread-safe via ConcurrentDictionary.
/// </summary>
public class GameRoomService
{
    private readonly ConcurrentDictionary<string, GameRoom> _rooms = new();

    private static readonly Random Rng = new();

    private class GameRoom
    {
        public GameHost Host { get; set; } = null!;
        public Dictionary<string, string> ConnectionToPlayer { get; set; } = new(); // connectionId -> playerId
        public Dictionary<string, string> PlayerToConnection { get; set; } = new(); // playerId -> connectionId
    }

    private static string GenerateRoomCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return new string(Enumerable.Range(0, 6).Select(_ => chars[Rng.Next(chars.Length)]).ToArray());
    }

    public string CreateRoom(string hostName, string connectionId)
    {
        string code;
        do { code = GenerateRoomCode(); }
        while (_rooms.ContainsKey(code));

        var host = new GameHost(code, hostName);
        var room = new GameRoom
        {
            Host = host,
            ConnectionToPlayer = new() { [connectionId] = "host" },
            PlayerToConnection = new() { ["host"] = connectionId },
        };

        _rooms[code] = room;
        return code;
    }

    public bool JoinRoom(string roomCode, string playerName, string connectionId)
    {
        if (!_rooms.TryGetValue(roomCode, out var room)) return false;
        if (room.Host.State.Players.Count >= 2) return false;

        room.Host.AddPlayer(playerName, "client");
        room.ConnectionToPlayer[connectionId] = "client";
        room.PlayerToConnection["client"] = connectionId;

        return true;
    }

    public void HandleAction(string roomCode, string playerId, string action, object? payload = null)
    {
        if (!_rooms.TryGetValue(roomCode, out var room)) return;
        room.Host.HandleAction(playerId, action, payload);
    }

    public GameState? GetState(string roomCode)
    {
        return _rooms.TryGetValue(roomCode, out var room) ? room.Host.State : null;
    }

    public string? GetPlayerId(string roomCode, string connectionId)
    {
        if (!_rooms.TryGetValue(roomCode, out var room)) return null;
        return room.ConnectionToPlayer.GetValueOrDefault(connectionId);
    }

    public string? GetRoomForConnection(string connectionId)
    {
        return _rooms.FirstOrDefault(r => r.Value.ConnectionToPlayer.ContainsKey(connectionId)).Key;
    }

    public void HandleDisconnect(string roomCode, string connectionId)
    {
        if (!_rooms.TryGetValue(roomCode, out var room)) return;
        if (room.ConnectionToPlayer.TryGetValue(connectionId, out var playerId))
        {
            room.ConnectionToPlayer.Remove(connectionId);
            room.PlayerToConnection.Remove(playerId);
        }

        // Clean up empty rooms
        if (room.ConnectionToPlayer.Count == 0)
            _rooms.TryRemove(roomCode, out _);
    }
}
