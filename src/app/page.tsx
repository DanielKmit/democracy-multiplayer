'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { motion, AnimatePresence, MotionPage, MotionCard, MotionButton, MotionList, MotionListItem, springs } from '@/components/Motion';
import { createRoom, joinRoom, onGameState, onPlayerJoined, onPlayerDisconnected } from '@/lib/signalr';
import { GameState } from '@/lib/engine/types';

type PageMode = 'menu' | 'create' | 'join';

export default function Home() {
  const router = useRouter();
  const { setPlayerName, setRoomId, setPlayerId, setGameState, setConnected, setMode } = useGameStore();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setModeLocal] = useState<PageMode>('menu');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // AI-related state removed — multiplayer only
  // difficulty/AI state removed

  // Wire up SignalR state handler on mount
  useEffect(() => {
    onGameState((state) => {
      useGameStore.getState().setGameState(state as GameState);
    });
    onPlayerJoined(() => {
      useGameStore.getState().setConnected(true);
    });
    onPlayerDisconnected(() => {
      useGameStore.getState().setConnected(false);
    });
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setErrorMsg('Enter your name'); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      const roomCode = await createRoom(name.trim());
      setPlayerName(name.trim());
      setPlayerId('host');
      setRoomId(roomCode);
      setMode('connected');
      setConnected(true);
      router.push(`/game/${roomCode}`);
    } catch {
      setErrorMsg('Failed to create room. Please try again.');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) { setErrorMsg('Enter your name'); return; }
    if (!joinCode.trim()) { setErrorMsg('Enter room code'); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      const code = joinCode.trim().toUpperCase();
      await joinRoom(code, name.trim());
      setPlayerName(name.trim());
      setPlayerId('client');
      setRoomId(code);
      setMode('connected');
      setConnected(true);
      router.push(`/game/${code}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to join room');
      setLoading(false);
    }
  };

  // AI setup code removed — multiplayer only with C# server

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-bg bg-dot-grid bg-gradient-mesh">
      <div className="max-w-lg w-full mx-4">
        {/* Title */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.gentle, delay: 0.1 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-white/[0.08] mb-5"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...springs.bouncy, delay: 0.2 }}
            style={{ boxShadow: '0 0 40px rgba(59,130,246,0.08), 0 8px 24px rgba(0,0,0,0.3)' }}
          >
            <span className="text-3xl">🏛️</span>
          </motion.div>
          <motion.h1
            className="text-5xl font-bold mb-2 font-display tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.smooth, delay: 0.3 }}
          >
            <span className="bg-gradient-to-r from-blue-300 via-blue-100 to-blue-300 text-gradient">Democracy</span>
          </motion.h1>
          <motion.p
            className="text-game-secondary text-base font-display tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >Republic of Novaria</motion.p>
          <motion.div
            className="flex items-center justify-center gap-3 text-game-muted text-[11px] mt-3 tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <span>Parliament</span><span className="text-white/10">|</span><span>Elections</span><span className="text-white/10">|</span><span>Strategy</span>
          </motion.div>
        </motion.div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] text-red-300 text-sm text-center animate-fade-in">
            {errorMsg}
          </div>
        )}

        {/* Main Menu */}
        {mode === 'menu' && (
          <MotionList className="hero-card p-2">
            <div className="space-y-1">
              {/* Resume game removed — server manages state */}
              <MotionListItem>
                <motion.button onClick={() => setModeLocal('create')}
                  whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}
                  className="menu-item hover:border-blue-500/20 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-lg">🏛️</div>
                    <div>
                      <span className="text-white font-semibold text-[15px]">Create Game</span>
                      <span className="block text-xs text-game-muted mt-0.5">Host a multiplayer room with AI bot parties</span>
                    </div>
                  </div>
                </motion.button>
              </MotionListItem>
              <MotionListItem>
                <motion.button onClick={() => setModeLocal('join')}
                  whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}
                  className="menu-item hover:border-white/10 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-lg">🔗</div>
                    <div>
                      <span className="text-white font-semibold text-[15px]">Join Game</span>
                      <span className="block text-xs text-game-muted mt-0.5">Enter a room code to join a friend</span>
                    </div>
                  </div>
                </motion.button>
              </MotionListItem>
            </div>

            <div className="text-center py-4">
              <p className="text-game-muted text-xs">2-player multiplayer with 6 AI bot parties in parliament</p>
            </div>
          </MotionList>
        )}

        {/* Create Room */}
        {mode === 'create' && (
          <motion.div className="hero-card rounded-2xl overflow-hidden"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={springs.smooth}>
            <div className="p-5 border-b border-game-border bg-gradient-to-r from-blue-950/20 to-transparent">
              <h2 className="text-xl font-bold font-display text-blue-300">Create Game</h2>
              <p className="text-xs text-game-muted mt-1">Your opponent will join using the room code</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-label mb-1.5 font-semibold">Your Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..." autoFocus maxLength={20}
                  className="input-premium" />
              </div>
            </div>
            <div className="p-4 border-t border-game-border flex gap-2">
              <motion.button onClick={() => { setModeLocal('menu'); setErrorMsg(''); }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}
                className="btn-secondary px-4 py-2.5 text-sm">
                ← Back
              </motion.button>
              <motion.button onClick={handleCreate} disabled={loading}
                whileHover={loading ? {} : { scale: 1.02, y: -1 }} whileTap={loading ? {} : { scale: 0.98 }} transition={springs.snappy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-primary disabled:opacity-40">
                {loading ? 'Creating...' : 'Create Room'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Join Room */}
        {mode === 'join' && (
          <motion.div className="hero-card rounded-2xl overflow-hidden"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={springs.smooth}>
            <div className="p-5 border-b border-game-border bg-gradient-to-r from-amber-950/20 to-transparent">
              <h2 className="text-xl font-bold font-display text-amber-300">Join Game</h2>
              <p className="text-xs text-game-muted mt-1">Enter the room code shared by the host</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-label mb-1.5 font-semibold">Your Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..." autoFocus maxLength={20}
                  className="input-premium" />
              </div>
              <div>
                <label className="block text-label mb-1.5 font-semibold">Room Code</label>
                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCDEF" maxLength={6}
                  className="input-premium !tracking-[0.3em] !text-center !text-2xl !font-mono" />
              </div>
            </div>
            <div className="p-4 border-t border-game-border flex gap-2">
              <motion.button onClick={() => { setModeLocal('menu'); setErrorMsg(''); }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}
                className="btn-secondary px-4 py-2.5 text-sm">
                ← Back
              </motion.button>
              <motion.button onClick={handleJoin} disabled={loading}
                whileHover={loading ? {} : { scale: 1.02, y: -1 }} whileTap={loading ? {} : { scale: 0.98 }} transition={springs.snappy}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-primary disabled:opacity-40">
                {loading ? 'Joining...' : 'Join Game'}
              </motion.button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
