'use client';

/**
 * SignalR connection layer — replaces Socket.IO (peer.ts).
 *
 * Architecture:
 * - Both players connect to the C# server via SignalR
 * - Server is authoritative — all game logic runs on C#
 * - No host/client distinction — everyone is a client
 * - Actions sent via invoke(), state received via on()
 *
 * The exported API mirrors peer.ts so no other files need
 * to change their import structure.
 */

import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000';

let connection: HubConnection | null = null;
let currentRoom: string | null = null;

type StateHandler = (state: unknown) => void;
type ConnectionHandler = () => void;

let stateHandler: StateHandler | null = null;
let connectHandler: ConnectionHandler | null = null;
let disconnectHandler: ConnectionHandler | null = null;

// Debounce tracking
let lastStateSendTime = 0;
const STATE_DEBOUNCE_MS = 80;

async function ensureConnection(): Promise<HubConnection> {
  if (connection && connection.state === 'Connected') return connection;

  // Clean up existing connection
  if (connection) {
    try { await connection.stop(); } catch { /* ignore */ }
  }

  connection = new HubConnectionBuilder()
    .withUrl(`${SERVER_URL}/game-hub`)
    .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build();

  // Wire up event handlers
  connection.on('GameState', (state: unknown) => {
    lastStateSendTime = Date.now(); // Prevent echo
    if (stateHandler) stateHandler(state);
  });

  connection.on('PlayerJoined', () => {
    console.log('[SignalR] Player joined');
    if (connectHandler) connectHandler();
  });

  connection.on('PlayerDisconnected', () => {
    console.log('[SignalR] Player disconnected');
    if (disconnectHandler) disconnectHandler();
  });

  connection.onclose(() => {
    console.warn('[SignalR] Connection closed');
    if (disconnectHandler) disconnectHandler();
  });

  connection.onreconnected(() => {
    console.log('[SignalR] Reconnected');
    // Re-join room after reconnection
    if (currentRoom) {
      connection!.invoke('RejoinRoom', currentRoom).catch(() => {});
    }
  });

  await connection.start();
  console.log('[SignalR] Connected to', SERVER_URL);
  return connection;
}

/**
 * Create a new game room. Returns the room code.
 */
export async function createRoom(playerName: string): Promise<string> {
  const conn = await ensureConnection();
  const result = await conn.invoke<{ roomCode: string; state: unknown }>('CreateRoom', playerName);
  currentRoom = result.roomCode;

  // Immediately deliver the initial state
  if (stateHandler && result.state) {
    stateHandler(result.state);
  }

  return result.roomCode;
}

/**
 * Join an existing room by code.
 */
export async function joinRoom(roomCode: string, playerName: string): Promise<void> {
  const conn = await ensureConnection();
  const code = roomCode.toUpperCase();
  const result = await conn.invoke<{ success: boolean; state?: unknown; error?: string }>('JoinRoom', code, playerName);

  if (!result.success) {
    throw new Error(result.error || 'Failed to join room');
  }

  currentRoom = code;

  // Deliver initial state
  if (stateHandler && result.state) {
    stateHandler(result.state);
  }
}

/**
 * Send a game action to the server.
 */
export async function sendAction(action: string, payload?: unknown): Promise<void> {
  if (!connection || !currentRoom) {
    console.warn('[SignalR] Cannot send action: not connected');
    return;
  }

  await connection.invoke('SendAction', currentRoom, action, payload ?? null);
}

/**
 * Register handler for game state updates.
 */
export function onGameState(handler: StateHandler) {
  stateHandler = handler;
}

/**
 * Register handler for player joined events.
 */
export function onPlayerJoined(handler: ConnectionHandler) {
  connectHandler = handler;
}

/**
 * Register handler for disconnect events.
 */
export function onPlayerDisconnected(handler: ConnectionHandler) {
  disconnectHandler = handler;
}

/**
 * Get the current room code.
 */
export function getCurrentRoom(): string | null {
  return currentRoom;
}

/**
 * Check if connected to the server.
 */
export function isConnected(): boolean {
  return connection?.state === 'Connected';
}

/**
 * Disconnect and clean up.
 */
export async function disconnect(): Promise<void> {
  currentRoom = null;
  if (connection) {
    try { await connection.stop(); } catch { /* ignore */ }
    connection = null;
  }
}
