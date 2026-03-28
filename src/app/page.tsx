'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { createRoom, joinRoom, onMessage, onPeerConnect, onPeerDisconnect, sendMessage } from '@/lib/peer';
import { initGame, handleClientJoin, handleAction, setOnStateChange } from '@/lib/gameHost';
import { GameState } from '@/lib/engine/types';

export default function Home() {
  const router = useRouter();
  const { setPlayerName, setRoomId, setPlayerId, setGameState, setConnected, setMode } = useGameStore();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setModeLocal] = useState<'menu' | 'create' | 'join'>('menu');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setErrorMsg('Enter your name');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const roomCode = await createRoom();
      setPlayerName(name.trim());
      setPlayerId('host');
      setRoomId(roomCode);
      setMode('host');
      setConnected(true);

      // Init the game engine on host
      const state = initGame(roomCode, name.trim());
      setGameState(state);

      // When host state changes, update store
      setOnStateChange((newState: GameState) => {
        useGameStore.getState().setGameState(newState);
      });

      // Listen for client connecting
      onPeerConnect(() => {
        useGameStore.getState().setConnected(true);
      });

      onPeerDisconnect(() => {
        // Opponent left
      });

      // Listen for messages from client
      onMessage((msg) => {
        if (msg.type === 'playerInfo') {
          handleClientJoin(msg.name);
        } else if (msg.type === 'action') {
          handleAction('client', msg.action, msg.payload);
        }
      });

      router.push(`/game/${roomCode}`);
    } catch (err) {
      setErrorMsg('Failed to create room. Please try again.');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setErrorMsg('Enter your name');
      return;
    }
    if (!joinCode.trim()) {
      setErrorMsg('Enter room code');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const code = joinCode.trim().toUpperCase();
      await joinRoom(code);

      setPlayerName(name.trim());
      setPlayerId('client');
      setRoomId(code);
      setMode('client');
      setConnected(true);

      // Send our player info to host
      sendMessage({ type: 'playerInfo', name: name.trim() });

      // Listen for state updates from host
      onMessage((msg) => {
        if (msg.type === 'state') {
          useGameStore.getState().setGameState(msg.state as GameState);
        } else if (msg.type === 'error') {
          useGameStore.getState().setError(msg.message);
        }
      });

      onPeerDisconnect(() => {
        // Host disconnected
      });

      router.push(`/game/${code}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to join room');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="max-w-lg w-full mx-4">
        {/* Logo / Title */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
            Democracy
          </h1>
          <p className="text-slate-400 text-lg">Multiplayer Political Simulation</p>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm text-center">
            {errorMsg}
          </div>
        )}

        {mode === 'menu' && (
          <div className="space-y-4 animate-fade-in">
            <button
              onClick={() => setModeLocal('create')}
              className="w-full p-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              🏛️ Create Game
            </button>
            <button
              onClick={() => setModeLocal('join')}
              className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              🔗 Join Game
            </button>
            <div className="text-center mt-8 text-slate-500 text-sm">
              <p>Two players. One country. Every policy decision matters.</p>
              <p className="mt-1">Govern wisely, or be voted out.</p>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                maxLength={20}
                autoFocus
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-xl text-lg font-semibold transition-all"
            >
              {loading ? 'Creating...' : '🏛️ Create Game Room'}
            </button>
            <button
              onClick={() => { setModeLocal('menu'); setErrorMsg(''); }}
              className="w-full p-2 text-slate-400 hover:text-slate-300 text-sm"
            >
              ← Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                maxLength={20}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Room Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 tracking-[0.3em] text-center text-xl font-mono"
                maxLength={6}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full p-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 rounded-xl text-lg font-semibold transition-all"
            >
              {loading ? 'Joining...' : '🔗 Join Game'}
            </button>
            <button
              onClick={() => { setModeLocal('menu'); setErrorMsg(''); }}
              className="w-full p-2 text-slate-400 hover:text-slate-300 text-sm"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
