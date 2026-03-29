'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { DataConnection, Peer as PeerType } from 'peerjs';

export type PeerMessage =
  | { type: 'action'; action: string; payload?: unknown }
  | { type: 'state'; state: unknown }
  | { type: 'error'; message: string }
  | { type: 'playerInfo'; name: string };

type MessageHandler = (msg: PeerMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (message: string) => void;

const PEER_PREFIX = 'DEM-';

const PEER_CONFIG = {
  host: '0.peerjs.com',
  port: 443,
  secure: true,
  path: '/',
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      // Free TURN relay for symmetric NAT / strict firewalls
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  },
};

// Retry configuration
const JOIN_MAX_ATTEMPTS = 3;
const JOIN_RETRY_DELAY_MS = 2000;
const JOIN_TIMEOUT_MS = 12000;

let peer: PeerType | null = null;
let connection: DataConnection | null = null;
let messageHandler: MessageHandler | null = null;
let connectHandler: ConnectionHandler | null = null;
let disconnectHandler: ConnectionHandler | null = null;
let errorHandler: ErrorHandler | null = null;

// ── BroadcastChannel (local/same-origin mode) ───────────────────
// Used for same-machine testing (two tabs). Auto-detected or forced via URL param.
let broadcastChannel: BroadcastChannel | null = null;
let localRole: 'host' | 'client' | null = null;

/**
 * Determine connection mode:
 * - `?local=true`  → force BroadcastChannel (local)
 * - `?local=false` → force PeerJS (online)
 * - localhost/127.0.0.1 → default to local
 * - Everything else → default to PeerJS (online)
 */
export function shouldUseLocalMode(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const localParam = params.get('local');
  if (localParam === 'true') return true;
  if (localParam === 'false') return false;

  // Localhost = dev mode = local by default
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  return false; // Production = PeerJS
}

/** @deprecated Use shouldUseLocalMode(). Kept for API compat. */
export function setLocalMode(_enabled: boolean) {
  // no-op: mode is now auto-detected via URL param + hostname
}

export function isLocalMode(): boolean {
  return shouldUseLocalMode();
}

/** Returns a user-friendly label for current connection mode */
export function getConnectionModeLabel(): { emoji: string; label: string } {
  return shouldUseLocalMode()
    ? { emoji: '🖥️', label: 'Local Mode' }
    : { emoji: '🌐', label: 'Online Mode' };
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** Map raw PeerJS error types to user-friendly messages */
function friendlyError(err: any): string {
  const errType = err?.type ?? '';
  const errMsg = err?.message ?? String(err);

  if (errType === 'peer-unavailable' || errMsg.includes('Could not connect to peer')) {
    return 'Room not found. The host may have left or the code is incorrect.';
  }
  if (errType === 'network' || errMsg.includes('Lost connection')) {
    return 'Network error. Check your internet connection and try again.';
  }
  if (errType === 'server-error') {
    return 'Connection server is temporarily unavailable. Please try again in a moment.';
  }
  if (errType === 'socket-error' || errType === 'socket-closed') {
    return 'Connection to the server was lost. Please try again.';
  }
  if (errType === 'webrtc') {
    return 'Connection blocked — your network may be restricting peer-to-peer connections. Try a different network.';
  }
  if (errMsg.includes('timeout')) {
    return 'Connection timed out. Make sure the host is still in the lobby and try again.';
  }
  return 'Connection failed. Please check the room code and try again.';
}

function setupConnection(conn: DataConnection) {
  connection = conn;

  conn.on('data', (data) => {
    if (messageHandler) {
      messageHandler(data as PeerMessage);
    }
  });

  conn.on('open', () => {
    console.log('[Peer] Connection opened successfully');
    if (connectHandler) connectHandler();
  });

  conn.on('close', () => {
    console.log('[Peer] Connection closed');
    connection = null;
    if (disconnectHandler) disconnectHandler();
  });

  conn.on('error', (err: any) => {
    console.error('[Peer] Connection error:', err);
    if (errorHandler) errorHandler(friendlyError(err));
  });
}

async function createPeer(id: string): Promise<PeerType> {
  const { default: Peer } = await import('peerjs');
  return new Peer(id, PEER_CONFIG) as unknown as PeerType;
}

function createRoomLocal(): Promise<string> {
  return new Promise((resolve) => {
    const roomCode = generateRoomCode();
    localRole = 'host';
    const channelName = `democracy-${roomCode}`;
    console.log('[Peer] Host creating BroadcastChannel:', channelName);
    broadcastChannel = new BroadcastChannel(channelName);

    broadcastChannel.onmessage = (event) => {
      const msg = event.data;
      console.log('[Peer] Host received message:', msg?.type ?? (msg?.__localJoin ? 'handshake' : 'unknown'));
      // Internal handshake: when client announces itself, notify connectHandler
      if (msg?.__localJoin) {
        console.log('[Peer] Host: client joined via BroadcastChannel');
        if (connectHandler) connectHandler();
        return;
      }
      // Ignore own messages (host → host)
      if (msg?.__sender === 'host') return;
      if (messageHandler) messageHandler(msg as PeerMessage);
    };

    console.log('[Peer] Host room created (local mode):', roomCode);
    resolve(roomCode);
  });
}

function joinRoomLocal(roomCode: string): Promise<void> {
  return new Promise((resolve) => {
    localRole = 'client';
    const channelName = `democracy-${roomCode.toUpperCase()}`;
    console.log('[Peer] Client joining BroadcastChannel:', channelName);
    broadcastChannel = new BroadcastChannel(channelName);

    broadcastChannel.onmessage = (event) => {
      const msg = event.data;
      // Ignore own messages and internal handshake
      if (msg?.__sender === 'client') return;
      if (msg?.__localJoin) return;
      console.log('[Peer] Client received message:', msg?.type ?? 'unknown');
      if (messageHandler) messageHandler(msg as PeerMessage);
    };

    // Tell the host we joined
    console.log('[Peer] Client sending handshake to host');
    broadcastChannel.postMessage({ __localJoin: true, __sender: 'client' });
    // Simulate connected
    setTimeout(() => {
      console.log('[Peer] Client: connection established (local mode)');
      if (connectHandler) connectHandler();
    }, 50);
    resolve();
  });
}

export function createRoom(): Promise<string> {
  if (isLocalMode()) return createRoomLocal();
  return new Promise(async (resolve, reject) => {
    const roomCode = generateRoomCode();
    const peerId = PEER_PREFIX + roomCode;

    try {
      peer = await createPeer(peerId);
    } catch (err) {
      reject(new Error('Failed to initialize connection. Please refresh and try again.'));
      return;
    }

    peer.on('open', () => {
      console.log('[Peer] Host peer open, room code:', roomCode);
      resolve(roomCode);
    });

    peer.on('connection', (conn: any) => {
      setupConnection(conn);
    });

    peer.on('error', (err: any) => {
      console.error('[Peer] Host error:', err);
      if (err.type === 'unavailable-id') {
        // ID taken, try again with new code
        destroyPeer();
        createRoom().then(resolve).catch(reject);
      } else {
        reject(new Error(friendlyError(err)));
      }
    });

    peer.on('disconnected', () => {
      console.warn('[Peer] Host disconnected from signaling server, attempting reconnect...');
      if (peer && !peer.destroyed) {
        peer.reconnect();
      }
    });
  });
}

/** Single join attempt — used internally by joinRoom with retry */
function attemptJoin(roomCode: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const peerId = PEER_PREFIX + roomCode.toUpperCase();
    const clientId = PEER_PREFIX + 'CLIENT-' + Math.random().toString(36).substring(2, 8);
    let settled = false;

    const settle = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    try {
      peer = await createPeer(clientId);
    } catch (err) {
      reject(new Error('Failed to initialize connection. Please refresh and try again.'));
      return;
    }

    const timeoutId = setTimeout(() => {
      settle(() => {
        destroyPeer();
        reject(new Error('timeout'));
      });
    }, JOIN_TIMEOUT_MS);

    peer.on('open', () => {
      console.log('[Peer] Client peer open, connecting to:', peerId);
      const conn = peer!.connect(peerId, {
        reliable: true,
        serialization: 'json',
      });

      conn.on('open', () => {
        clearTimeout(timeoutId);
        settle(() => {
          setupConnection(conn);
          resolve();
        });
      });

      conn.on('error', (err: any) => {
        console.error('[Peer] Join connection error:', err);
        clearTimeout(timeoutId);
        settle(() => {
          destroyPeer();
          reject(err);
        });
      });
    });

    peer.on('error', (err: any) => {
      console.error('[Peer] Client error:', err);
      clearTimeout(timeoutId);
      settle(() => {
        destroyPeer();
        reject(err);
      });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function joinRoom(roomCode: string): Promise<void> {
  if (isLocalMode()) return joinRoomLocal(roomCode);
  let lastError: any;

  for (let attempt = 1; attempt <= JOIN_MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`[Peer] Join attempt ${attempt}/${JOIN_MAX_ATTEMPTS} for room ${roomCode}`);
      await attemptJoin(roomCode);
      console.log('[Peer] Successfully joined room:', roomCode);
      return; // Success!
    } catch (err: any) {
      lastError = err;
      const errType = err?.type ?? '';
      const errMsg = err?.message ?? '';

      // Don't retry if the peer explicitly doesn't exist
      if (errType === 'peer-unavailable') {
        throw new Error(friendlyError(err));
      }

      console.warn(`[Peer] Attempt ${attempt} failed:`, errMsg);

      // Retry with delay (except on last attempt)
      if (attempt < JOIN_MAX_ATTEMPTS) {
        console.log(`[Peer] Retrying in ${JOIN_RETRY_DELAY_MS}ms...`);
        await sleep(JOIN_RETRY_DELAY_MS);
      }
    }
  }

  // All attempts exhausted
  throw new Error(friendlyError(lastError));
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

export function sendMessage(msg: PeerMessage) {
  if (broadcastChannel && isLocalMode()) {
    broadcastChannel.postMessage({ ...msg, __sender: localRole });
    return;
  }
  if (connection && connection.open) {
    connection.send(msg);
  }
}

export function isConnected(): boolean {
  if (isLocalMode() && broadcastChannel) return true;
  return connection !== null && connection.open;
}

export function destroyPeer() {
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
    localRole = null;
  }
  if (connection) {
    connection.close();
    connection = null;
  }
  if (peer) {
    peer.destroy();
    peer = null;
  }
  messageHandler = null;
  connectHandler = null;
  disconnectHandler = null;
  errorHandler = null;
}
