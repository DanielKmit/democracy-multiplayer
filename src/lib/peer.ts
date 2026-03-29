'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Multiplayer communication layer using Pusher (replaces PeerJS).
 *
 * Architecture:
 * - Host creates a room → subscribes to private-game-{ROOM_CODE}
 * - Client joins → subscribes to the same channel
 * - Messages are sent via server-side Pusher trigger (/api/pusher/send)
 *   to ensure reliable delivery (no client event limitations)
 * - Both sides listen for 'game-message' events on the channel
 *
 * The exported API is identical to the old PeerJS implementation so
 * no other files need to change.
 */

import PusherClient from 'pusher-js';

export type PeerMessage =
  | { type: 'action'; action: string; payload?: unknown }
  | { type: 'state'; state: unknown }
  | { type: 'error'; message: string }
  | { type: 'playerInfo'; name: string };

type MessageHandler = (msg: PeerMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (message: string) => void;

let pusher: PusherClient | null = null;
let channel: any = null;
let channelName: string | null = null;
let mySocketId: string | null = null;

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

function initPusher(): PusherClient {
  if (pusher) return pusher;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    throw new Error('Pusher configuration missing. Set NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER.');
  }

  pusher = new PusherClient(key, {
    cluster,
    authEndpoint: '/api/pusher/auth',
  });

  pusher.connection.bind('connected', () => {
    mySocketId = pusher!.connection.socket_id;
    console.log('[Pusher] Connected, socket_id:', mySocketId);
  });

  pusher.connection.bind('error', (err: any) => {
    console.error('[Pusher] Connection error:', err);
    if (errorHandler) {
      errorHandler('Connection error. Please check your internet and try again.');
    }
  });

  pusher.connection.bind('disconnected', () => {
    console.warn('[Pusher] Disconnected');
    if (disconnectHandler) disconnectHandler();
  });

  return pusher;
}

function subscribeToChannel(roomCode: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = initPusher();
    channelName = `private-game-${roomCode}`;

    channel = p.subscribe(channelName);

    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`[Pusher] Subscribed to ${channelName}`);
      resolve();
    });

    channel.bind('pusher:subscription_error', (err: any) => {
      console.error(`[Pusher] Subscription error for ${channelName}:`, err);
      reject(new Error('Failed to join room. Please check the room code and try again.'));
    });

    // Listen for game messages
    channel.bind('game-message', (data: any) => {
      if (messageHandler) {
        messageHandler(data as PeerMessage);
      }
    });

    // Listen for member-added events (host detects when client joins)
    channel.bind('pusher:member_added', () => {
      if (connectHandler) connectHandler();
    });

    // Timeout for subscription
    setTimeout(() => {
      reject(new Error('Connection timed out. Please try again.'));
    }, 15000);
  });
}

/**
 * Create a room (host). Returns the room code.
 */
export async function createRoom(): Promise<string> {
  destroyPeer(); // Clean up any previous connection

  const roomCode = generateRoomCode();

  try {
    await subscribeToChannel(roomCode);
    console.log(`[Pusher] Room created: ${roomCode}`);

    // Use presence channel events to detect when client connects.
    // Since we're using private channels (not presence), we detect the
    // client connection when they send their first 'playerInfo' message.
    // The connectHandler fires when we get the first message from a client.
    const origMessageHandler = messageHandler;
    let clientConnected = false;

    // Wrap the message handler to detect first client message
    channel.unbind('game-message');
    channel.bind('game-message', (data: any) => {
      if (!clientConnected && data.type === 'playerInfo') {
        clientConnected = true;
        if (connectHandler) connectHandler();
      }
      if (messageHandler) {
        messageHandler(data as PeerMessage);
      }
    });

    return roomCode;
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
    await subscribeToChannel(code);
    console.log(`[Pusher] Joined room: ${code}`);

    // For the client, fire connectHandler immediately since we're connected
    // once subscribed
    if (connectHandler) connectHandler();
  } catch (err: any) {
    destroyPeer();
    throw new Error(err?.message || 'Failed to join room. Please check the room code and try again.');
  }
}

/**
 * Send a message to all participants in the room via server-side trigger.
 * Uses /api/pusher/send endpoint to trigger events server-side,
 * which is more reliable than client events.
 */
export function sendMessage(msg: PeerMessage) {
  if (!channelName) {
    console.warn('[Pusher] Cannot send message: not connected to any channel');
    return;
  }

  // Debounce rapid state broadcasts (gameHost sends duplicates intentionally)
  if (msg.type === 'state') {
    const now = Date.now();
    if (now - lastStateSendTime < STATE_DEBOUNCE_MS) {
      return; // Skip duplicate state broadcast
    }
    lastStateSendTime = now;
  }

  // Send via server-side trigger for reliability
  fetch('/api/pusher/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: channelName,
      event: 'game-message',
      data: msg,
      socketId: mySocketId, // Exclude sender from receiving their own message
    }),
  }).catch((err) => {
    console.error('[Pusher] Failed to send message:', err);
    if (errorHandler) {
      errorHandler('Failed to send message. Check your connection.');
    }
  });
}

export function onMessage(handler: MessageHandler) {
  messageHandler = handler;

  // Re-bind the channel listener if channel already exists
  if (channel) {
    channel.unbind('game-message');
    channel.bind('game-message', (data: any) => {
      if (messageHandler) {
        messageHandler(data as PeerMessage);
      }
    });
  }
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
  return channel !== null && pusher !== null && pusher.connection.state === 'connected';
}

export function destroyPeer() {
  if (channel && pusher) {
    pusher.unsubscribe(channelName ?? '');
    channel = null;
  }
  if (pusher) {
    pusher.disconnect();
    pusher = null;
  }
  channelName = null;
  mySocketId = null;
  messageHandler = null;
  connectHandler = null;
  disconnectHandler = null;
  errorHandler = null;
  lastStateSendTime = 0;
}
