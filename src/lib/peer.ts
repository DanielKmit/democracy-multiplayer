'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Multiplayer communication layer using Socket.IO.
 *
 * Architecture:
 * - Host creates a room → server tracks room membership
 * - Client joins → server notifies host
 * - Messages sent directly via Socket.IO (bidirectional, real-time)
 *
 * The exported API is identical to the old Pusher implementation so
 * no other files need to change.
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export type PeerMessage =
  | { type: 'action'; action: string; payload?: unknown }
  | { type: 'state'; state: unknown }
  | { type: 'error'; message: string }
  | { type: 'playerInfo'; name: string };

type MessageHandler = (msg: PeerMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (message: string) => void;

let socket: Socket | null = null;
let currentRoom: string | null = null;

let messageHandler: MessageHandler | null = null;
let connectHandler: ConnectionHandler | null = null;
let disconnectHandler: ConnectionHandler | null = null;
let errorHandler: ErrorHandler | null = null;

// Debounce/dedup: track last state broadcast to avoid double-sends
let lastStateSendTime = 0;
const STATE_DEBOUNCE_MS = 200;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function connectSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    if (socket?.connected) {
      resolve(socket);
      return;
    }

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const timeout = setTimeout(() => {
      reject(new Error('Connection timed out. Please try again.'));
    }, 15000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('[Socket.IO] Connected:', socket!.id);
      resolve(socket!);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      console.error('[Socket.IO] Connection error:', err.message);
      if (errorHandler) {
        errorHandler('Connection error. Please check your internet and try again.');
      }
      reject(new Error('Failed to connect to server.'));
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket.IO] Disconnected:', reason);
      if (disconnectHandler) disconnectHandler();
    });
  });
}

function setupListeners() {
  if (!socket) return;

  socket.on('game-message', (message: any) => {
    if (messageHandler) {
      messageHandler(message as PeerMessage);
    }
  });

  socket.on('player-joined', () => {
    console.log('[Socket.IO] Player joined the room');
    if (connectHandler) connectHandler();
  });

  socket.on('player-disconnected', () => {
    console.log('[Socket.IO] Player disconnected');
    if (disconnectHandler) disconnectHandler();
  });
}

/**
 * Create a room (host). Returns the room code.
 */
export async function createRoom(): Promise<string> {
  destroyPeer(); // Clean up any previous connection

  const roomCode = generateRoomCode();

  try {
    await connectSocket();
    setupListeners();

    return new Promise((resolve, reject) => {
      socket!.emit('create-room', roomCode, (response: any) => {
        if (response.success) {
          currentRoom = roomCode;
          console.log(`[Socket.IO] Room created: ${roomCode}`);
          resolve(roomCode);
        } else {
          reject(new Error('Failed to create room. Please try again.'));
        }
      });

      // Timeout for room creation
      setTimeout(() => {
        reject(new Error('Room creation timed out. Please try again.'));
      }, 10000);
    });
  } catch (err: any) {
    destroyPeer();
    throw new Error(err?.message || 'Failed to create room. Please try again.');
  }
}

/**
 * Join an existing room (client).
 */
export async function joinRoom(roomCode: string): Promise<void> {
  destroyPeer(); // Clean up any previous connection

  const code = roomCode.toUpperCase();

  try {
    await connectSocket();
    setupListeners();

    return new Promise((resolve, reject) => {
      socket!.emit('join-room', code, (response: any) => {
        if (response.success) {
          currentRoom = code;
          console.log(`[Socket.IO] Joined room: ${code}`);
          // For the client, fire connectHandler since we're connected
          if (connectHandler) connectHandler();
          resolve();
        } else {
          reject(new Error(response.error || 'Failed to join room. Please check the room code and try again.'));
        }
      });

      // Timeout for join
      setTimeout(() => {
        reject(new Error('Join timed out. Please try again.'));
      }, 10000);
    });
  } catch (err: any) {
    destroyPeer();
    throw new Error(err?.message || 'Failed to join room. Please check the room code and try again.');
  }
}

/**
 * Send a message to the other player in the room.
 */
export function sendMessage(msg: PeerMessage) {
  if (!socket || !currentRoom) {
    console.warn('[Socket.IO] Cannot send message: not connected to any room');
    return;
  }

  // Debounce rapid state broadcasts
  if (msg.type === 'state') {
    const now = Date.now();
    if (now - lastStateSendTime < STATE_DEBOUNCE_MS) {
      return; // Skip duplicate state broadcast
    }
    lastStateSendTime = now;
  }

  socket.emit('game-message', { roomCode: currentRoom, message: msg });
}

export function onMessage(handler: MessageHandler) {
  messageHandler = handler;
}

export function onPeerConnect(handler: ConnectionHandler) {
  connectHandler = handler;
}

export function onPeerDisconnect(handler: ConnectionHandler) {
  disconnectHandler = handler;
}

export function onPeerError(handler: ErrorHandler) {
  errorHandler = handler;
}

export function isConnected(): boolean {
  return socket !== null && socket.connected && currentRoom !== null;
}

export function destroyPeer() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentRoom = null;
  messageHandler = null;
  connectHandler = null;
  disconnectHandler = null;
  errorHandler = null;
  lastStateSendTime = 0;
}
