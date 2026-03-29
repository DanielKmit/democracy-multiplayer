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

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
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
];

// Multiple PeerJS servers to try — if one is down we fall through to the next
const PEER_SERVERS = [
  { host: '0.peerjs.com', port: 443, secure: true, path: '/' },
  { host: 'peerjs.com',   port: 443, secure: true, path: '/' },
];

// Track which server index the host registered on so joiners use the same one
let activeServerIndex = 0;

function makePeerConfig(serverIndex: number) {
  const server = PEER_SERVERS[serverIndex] ?? PEER_SERVERS[0];
  return {
    ...server,
    debug: 2,           // verbose — helps diagnose issues in console
    config: { iceServers: ICE_SERVERS },
  };
}

// Retry configuration
const JOIN_MAX_ATTEMPTS = 5;       // bumped from 3
const JOIN_BASE_DELAY_MS = 1500;   // exponential backoff base
const JOIN_TIMEOUT_MS = 15000;     // slightly longer timeout

let peer: PeerType | null = null;
let connection: DataConnection | null = null;
let messageHandler: MessageHandler | null = null;
let connectHandler: ConnectionHandler | null = null;
let disconnectHandler: ConnectionHandler | null = null;
let errorHandler: ErrorHandler | null = null;

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

async function createPeer(id: string, serverIndex = activeServerIndex): Promise<PeerType> {
  const { default: Peer } = await import('peerjs');
  const config = makePeerConfig(serverIndex);
  console.log(`[Peer] Creating peer ${id} on ${config.host}:${config.port}`);
  return new Peer(id, config) as unknown as PeerType;
}

/** Wait for a peer's 'open' event or reject on error/timeout */
function waitForPeerOpen(p: PeerType, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; reject(new Error('timeout')); }
    }, timeoutMs);

    p.on('open', () => {
      if (!done) { done = true; clearTimeout(timer); resolve(); }
    });
    p.on('error', (err: any) => {
      if (!done) { done = true; clearTimeout(timer); reject(err); }
    });
  });
}

export async function createRoom(): Promise<string> {
  const roomCode = generateRoomCode();
  const peerId = PEER_PREFIX + roomCode;

  // Try each signaling server until one works
  for (let si = 0; si < PEER_SERVERS.length; si++) {
    try {
      destroyPeer(); // clean up any previous attempt
      peer = await createPeer(peerId, si);
      await waitForPeerOpen(peer);
      activeServerIndex = si; // remember which server we're on
      console.log(`[Peer] Host peer open on server ${PEER_SERVERS[si].host}, room code: ${roomCode}`);

      // Wire up handlers after successful open
      peer.on('connection', (conn: any) => {
        setupConnection(conn);
      });

      peer.on('error', (err: any) => {
        console.error('[Peer] Host error:', err);
        if (errorHandler) errorHandler(friendlyError(err));
      });

      peer.on('disconnected', () => {
        console.warn('[Peer] Host disconnected from signaling server, attempting reconnect...');
        if (peer && !peer.destroyed) {
          peer.reconnect();
        }
      });

      return roomCode;
    } catch (err: any) {
      console.warn(`[Peer] Server ${PEER_SERVERS[si].host} failed for host:`, err?.message ?? err);
      if (err?.type === 'unavailable-id') {
        // Peer ID collision — regenerate and restart
        destroyPeer();
        return createRoom();
      }
      // Try next server
    }
  }

  throw new Error('All connection servers are unavailable. Please try again in a moment.');
}

/** Single join attempt on a specific signaling server */
function attemptJoin(roomCode: string, serverIndex: number): Promise<void> {
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
      peer = await createPeer(clientId, serverIndex);
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
      console.log(`[Peer] Client peer open on ${PEER_SERVERS[serverIndex].host}, connecting to: ${peerId}`);
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
  let lastError: any;

  // Try each server, with retries per server
  for (let si = 0; si < PEER_SERVERS.length; si++) {
    const attemptsPerServer = si === 0 ? JOIN_MAX_ATTEMPTS : 2; // fewer retries on fallback
    for (let attempt = 1; attempt <= attemptsPerServer; attempt++) {
      try {
        console.log(`[Peer] Join attempt ${attempt}/${attemptsPerServer} on ${PEER_SERVERS[si].host} for room ${roomCode}`);
        await attemptJoin(roomCode, si);
        console.log(`[Peer] Successfully joined room ${roomCode} via ${PEER_SERVERS[si].host}`);
        activeServerIndex = si;
        return;
      } catch (err: any) {
        lastError = err;
        const errType = err?.type ?? '';
        const errMsg = err?.message ?? '';

        // peer-unavailable on the *first* server → try next server before giving up
        // (host might have registered on a different server)
        if (errType === 'peer-unavailable') {
          console.warn(`[Peer] peer-unavailable on ${PEER_SERVERS[si].host}, trying next server...`);
          break; // skip remaining retries for this server
        }

        console.warn(`[Peer] Attempt ${attempt} failed on ${PEER_SERVERS[si].host}:`, errMsg);

        if (attempt < attemptsPerServer) {
          const delay = JOIN_BASE_DELAY_MS * Math.pow(1.5, attempt - 1);
          console.log(`[Peer] Retrying in ${Math.round(delay)}ms...`);
          await sleep(delay);
        }
      }
    }
  }

  // All servers + attempts exhausted
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
  if (connection && connection.open) {
    connection.send(msg);
  }
}

export function isConnected(): boolean {
  return connection !== null && connection.open;
}

export function destroyPeer() {
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
