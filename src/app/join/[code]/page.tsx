'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store';
import { joinRoom, onMessage, onPeerDisconnect, sendMessage } from '@/lib/peer';
import { GameState } from '@/lib/engine/types';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();
  const { setPlayerName, setRoomId, setPlayerId, setGameState, setConnected, setMode } = useGameStore();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const handleJoin = async () => {
    if (!name.trim()) { setErrorMsg('Enter your name'); return; }
    setLoading(true);
    setErrorMsg('');

    try {
      await joinRoom(code);

      setPlayerName(name.trim());
      setPlayerId('client');
      setRoomId(code);
      setMode('client');
      setConnected(true);

      sendMessage({ type: 'playerInfo', name: name.trim() });

      // Wait for first state message before navigating
      let navigated = false;
      onMessage((msg) => {
        if (msg.type === 'state') {
          useGameStore.getState().setGameState(msg.state as GameState);
          if (!navigated) {
            navigated = true;
            router.push(`/game/${code}`);
          }
        } else if (msg.type === 'error') {
          useGameStore.getState().setError(msg.message);
        }
      });

      onPeerDisconnect(() => {});
    } catch (err) {
      // Error messages are already user-friendly from peer.ts
      const message = err instanceof Error ? err.message : 'Connection failed. Please try again.';
      setErrorMsg(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-bg">
      <div className="max-w-lg w-full mx-4">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-6xl mb-4">🏛️</div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent">
            Democracy
          </h1>
          <p className="text-game-secondary text-lg">You&apos;ve been invited to a game!</p>
        </div>

        <div className="bg-game-card border border-game-border rounded-xl p-6 mb-6 text-center">
          <div className="text-xs text-game-muted uppercase tracking-wider mb-2">Room Code</div>
          <span className="text-3xl font-mono font-bold tracking-[0.4em] text-blue-400">
            {code}
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-300 cursor-pointer">×</button>
          </div>
        )}

        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm text-game-secondary mb-1">Your Name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..." autoFocus maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="w-full p-3 bg-game-card border border-game-border rounded-lg text-white placeholder:text-game-muted focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-game-border disabled:cursor-not-allowed rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Joining...
              </span>
            ) : '🔗 Join Game'}
          </button>
          <a href="/" className="block text-center p-2 text-game-secondary hover:text-white text-sm cursor-pointer">
            ← Back to Menu
          </a>
        </div>
      </div>
    </div>
  );
}
