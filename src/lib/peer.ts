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
    ],
  },
};

let peer: PeerType | null = null;
let connection: DataConnection | null = null;
let messageHandler: MessageHandler | null = null;
let connectHandler: ConnectionHandler | null = null;
let disconnectHandler: ConnectionHandler | null = null;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function setupConnection(conn: DataConnection) {
  connection = conn;

  conn.on('data', (data) => {
    if (messageHandler) {
      messageHandler(data as PeerMessage);
    }
  });

  conn.on('open', () => {
    if (connectHandler) connectHandler();
  });

  conn.on('close', () => {
    connection = null;
    if (disconnectHandler) disconnectHandler();
  });

  conn.on('error', (err) => {
    console.error('[Peer] Connection error:', err);
  });
}

async function createPeer(id: string): Promise<PeerType> {
  const { default: Peer } = await import('peerjs');
  return new Peer(id, PEER_CONFIG) as unknown as PeerType;
}

export function createRoom(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const roomCode = generateRoomCode();
    const peerId = PEER_PREFIX + roomCode;

    peer = await createPeer(peerId);

    peer.on('open', () => {
      resolve(roomCode);
    });

    peer.on('connection', (conn: any) => {
      setupConnection(conn);
    });

    peer.on('error', (err: any) => {
      console.error('[Peer] Host error:', err);
      if (err.type === 'unavailable-id') {
        // ID taken, try again
        destroyPeer();
        createRoom().then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

export function joinRoom(roomCode: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const peerId = PEER_PREFIX + roomCode.toUpperCase();
    const clientId = PEER_PREFIX + 'CLIENT-' + Math.random().toString(36).substring(2, 8);

    peer = await createPeer(clientId);

    peer.on('open', () => {
      const conn = peer!.connect(peerId, { reliable: true });

      conn.on('open', () => {
        setupConnection(conn);
        resolve();
      });

      conn.on('error', (err) => {
        console.error('[Peer] Join connection error:', err);
        reject(err);
      });
    });

    peer.on('error', (err) => {
      console.error('[Peer] Client error:', err);
      reject(err);
    });

    // Timeout
    setTimeout(() => {
      if (!connection) {
        reject(new Error('Connection timeout — room not found'));
      }
    }, 10000);
  });
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
}
