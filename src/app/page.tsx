'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { motion, AnimatePresence, MotionPage, MotionCard, MotionButton, MotionList, MotionListItem, springs } from '@/components/Motion';
import { createRoom, joinRoom, onMessage, onPeerConnect, onPeerDisconnect, sendMessage } from '@/lib/peer';
import { initGame, initAIGame, handleClientJoin, handleAction, setOnStateChange, loadPersistedState, restoreGame, clearPersistedState } from '@/lib/gameHost';
import { GameState, PartyConfig, PartyColor, PartyLogo, MANIFESTO_OPTIONS, ManifestoOption } from '@/lib/engine/types';
import { AIIdeology, AI_PARTY_PRESETS } from '@/lib/engine/ai';

type PageMode = 'menu' | 'create' | 'join' | 'ai_setup';

export default function Home() {
  const router = useRouter();
  const { setPlayerName, setRoomId, setPlayerId, setGameState, setConnected, setMode } = useGameStore();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setModeLocal] = useState<PageMode>('menu');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [savedRoomId, setSavedRoomId] = useState<string | null>(null);
  const [aiIdeology, setAiIdeology] = useState<AIIdeology>('center');
  const [partyName, setPartyName] = useState('');
  const [partyColor, setPartyColor] = useState<PartyColor>('blue');
  const [partyLogo, setPartyLogo] = useState<PartyLogo>('star');
  const [economicAxis, setEconomicAxis] = useState(50);
  const [socialAxis, setSocialAxis] = useState(50);
  const [manifesto, setManifesto] = useState<ManifestoOption[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = loadPersistedState();
      if (saved && saved.phase !== 'game_over') {
        setHasSavedGame(true);
        setSavedRoomId(saved.roomId);
      }
    }
  }, []);

  const handleResume = () => {
    const saved = loadPersistedState();
    if (!saved) { setErrorMsg('No saved game found'); return; }
    if (saved.phase === 'game_over') { clearPersistedState(); setHasSavedGame(false); return; }
    setLoading(true);
    setPlayerName(saved.players[0]?.name ?? 'Player');
    setPlayerId('host');
    setRoomId(saved.roomId);
    setMode(saved.isAIGame ? 'ai_host' : 'host');
    setConnected(true);
    const state = restoreGame(saved);
    setGameState(state);
    setOnStateChange((newState: GameState) => { useGameStore.getState().setGameState(newState); });
    router.push(`/game/${saved.roomId}`);
  };

  const handleStartAIGame = () => {
    if (!name.trim()) { setErrorMsg('Enter your name'); return; }
    if (!partyName.trim()) { setErrorMsg('Enter a party name'); return; }
    if (manifesto.length !== 3) { setErrorMsg('Select exactly 3 manifesto items'); return; }
    setLoading(true);
    setErrorMsg('');
    const roomCode = `AI${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const partyConfig: PartyConfig = {
      partyName: partyName.trim(), partyColor, leaderName: name.trim(),
      economicAxis, socialAxis, logo: partyLogo, manifesto,
    };
    setPlayerName(name.trim());
    setPlayerId('host');
    setRoomId(roomCode);
    setMode('ai_host');
    setConnected(true);
    const state = initAIGame(roomCode, name.trim(), partyConfig, aiIdeology);
    setGameState(state);
    setOnStateChange((newState: GameState) => { useGameStore.getState().setGameState(newState); });
    router.push(`/game/${roomCode}`);
  };

  const handleCreate = async () => {
    if (!name.trim()) { setErrorMsg('Enter your name'); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      const roomCode = await createRoom();
      setPlayerName(name.trim());
      setPlayerId('host');
      setRoomId(roomCode);
      setMode('host');
      setConnected(true);
      const state = initGame(roomCode, name.trim());
      setGameState(state);
      setOnStateChange((newState: GameState) => { useGameStore.getState().setGameState(newState); });
      onPeerConnect(() => { useGameStore.getState().setConnected(true); });
      onPeerDisconnect(() => {});
      onMessage((msg) => {
        if (msg.type === 'playerInfo') { handleClientJoin(msg.name); }
        else if (msg.type === 'action') { handleAction('client', msg.action, msg.payload); }
      });
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
      await joinRoom(code);
      setPlayerName(name.trim());
      setPlayerId('client');
      setRoomId(code);
      setMode('client');
      setConnected(true);
      sendMessage({ type: 'playerInfo', name: name.trim() });
      onMessage((msg) => {
        if (msg.type === 'state') { useGameStore.getState().setGameState(msg.state as GameState); }
        else if (msg.type === 'error') { useGameStore.getState().setError(msg.message); }
      });
      onPeerDisconnect(() => {});
      router.push(`/game/${code}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to join room');
      setLoading(false);
    }
  };

  const toggleManifesto = (item: ManifestoOption) => {
    setManifesto(prev => {
      if (prev.includes(item)) return prev.filter(m => m !== item);
      if (prev.length >= 3) return prev;
      return [...prev, item];
    });
  };

  const aiPreset = AI_PARTY_PRESETS[aiIdeology];

  const COLORS: PartyColor[] = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'cyan', 'pink'];
  const COLOR_HEX: Record<PartyColor, string> = {
    red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308',
    orange: '#F97316', purple: '#A855F7', cyan: '#06B6D4', pink: '#EC4899',
  };
  const LOGOS: PartyLogo[] = ['eagle', 'rose', 'star', 'tree', 'fist', 'dove', 'shield', 'flame', 'scales', 'gear', 'wheat', 'sun'];
  const LOGO_EMOJI: Record<PartyLogo, string> = {
    eagle: '🦅', rose: '🌹', star: '⭐', tree: '🌳', fist: '✊', dove: '🕊️',
    shield: '🛡️', flame: '🔥', scales: '⚖️', gear: '⚙️', wheat: '🌾', sun: '☀️',
  };

  const getAxisLabel = (value: number, type: 'econ' | 'social') => {
    if (type === 'econ') {
      if (value < 25) return 'Far Left';
      if (value < 40) return 'Left';
      if (value < 60) return 'Center';
      if (value < 75) return 'Center-Right';
      return 'Right';
    }
    if (value < 25) return 'Authoritarian';
    if (value < 40) return 'Conservative';
    if (value < 60) return 'Moderate';
    if (value < 75) return 'Progressive';
    return 'Libertarian';
  };

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
              {hasSavedGame && (
                <MotionListItem>
                  <motion.button onClick={handleResume} disabled={loading}
                    whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}
                    className="menu-item border-emerald-500/20 hover:border-emerald-500/30 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-lg">▶</div>
                      <div>
                        <span className="text-emerald-400 font-semibold text-[15px] group-hover:text-emerald-300">Resume Game</span>
                        {savedRoomId && <span className="text-xs text-game-muted ml-2">({savedRoomId})</span>}
                      </div>
                    </div>
                  </motion.button>
                </MotionListItem>
              )}
              <MotionListItem>
                <motion.button onClick={() => setModeLocal('ai_setup')}
                  whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}
                  className="menu-item hover:border-purple-500/20 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-lg">🤖</div>
                    <div>
                      <span className="text-white font-semibold text-[15px]">Play vs AI</span>
                      <span className="block text-xs text-game-muted mt-0.5">Single-player against AI opponent</span>
                    </div>
                  </div>
                </motion.button>
              </MotionListItem>
              <MotionListItem>
                <motion.button onClick={() => setModeLocal('create')}
                  whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}
                  className="menu-item hover:border-blue-500/20 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-lg">👥</div>
                    <div>
                      <span className="text-white font-semibold text-[15px]">Create Multiplayer</span>
                      <span className="block text-xs text-game-muted mt-0.5">Host a room for a friend to join</span>
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
                      <span className="block text-xs text-game-muted mt-0.5">Enter a room code to join</span>
                    </div>
                  </div>
                </motion.button>
              </MotionListItem>
            </div>

            <div className="text-center py-4">
              <p className="text-game-muted text-xs">Create your party. Govern a nation. Win elections.</p>
            </div>
          </MotionList>
        )}

        {/* AI Setup */}
        {mode === 'ai_setup' && (
          <div className="animate-fade-in">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-game-border bg-gradient-to-r from-purple-950/30 to-transparent">
                <h2 className="text-xl font-bold font-display text-purple-300">Create Your Party</h2>
                <p className="text-xs text-game-muted mt-1">Set up your political party before entering the campaign</p>
              </div>

              <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Name inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-label mb-1.5 font-semibold">Your Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Leader name..." autoFocus maxLength={20}
                      className="input-premium" />
                  </div>
                  <div>
                    <label className="block text-label mb-1.5 font-semibold">Party Name</label>
                    <input type="text" value={partyName} onChange={(e) => setPartyName(e.target.value)}
                      placeholder="Party name..." maxLength={30}
                      className="input-premium" />
                  </div>
                </div>

                {/* Color + Logo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label mb-1.5 font-semibold">Color</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {COLORS.map(c => (
                        <button key={c} onClick={() => setPartyColor(c)}
                          className={`h-9 rounded-lg border-2 transition-all ${partyColor === c ? 'border-white scale-105 shadow-lg' : 'border-transparent hover:border-white/20'}`}
                          style={{ backgroundColor: COLOR_HEX[c] }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-label mb-1.5 font-semibold">Logo</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {LOGOS.map(l => (
                        <button key={l} onClick={() => setPartyLogo(l)}
                          className={`h-9 rounded-lg border flex items-center justify-center text-base transition-all ${partyLogo === l ? 'border-white bg-white/10' : 'border-game-border bg-game-bg hover:border-white/20'}`}>
                          {LOGO_EMOJI[l]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ideology */}
                <div className="space-y-3">
                  <label className="block text-[10px] text-game-muted uppercase tracking-wider font-bold">Ideology</label>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-red-400">Left</span>
                      <span className="text-[10px] text-game-secondary font-medium">{getAxisLabel(economicAxis, 'econ')}</span>
                      <span className="text-[10px] text-blue-400">Right</span>
                    </div>
                    <input type="range" min={0} max={100} value={economicAxis}
                      onChange={(e) => setEconomicAxis(Number(e.target.value))}
                      className="w-full accent-purple-500 h-1.5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-orange-400">Authoritarian</span>
                      <span className="text-[10px] text-game-secondary font-medium">{getAxisLabel(socialAxis, 'social')}</span>
                      <span className="text-[10px] text-green-400">Liberal</span>
                    </div>
                    <input type="range" min={0} max={100} value={socialAxis}
                      onChange={(e) => setSocialAxis(Number(e.target.value))}
                      className="w-full accent-purple-500 h-1.5" />
                  </div>
                </div>

                {/* Manifesto */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-game-muted uppercase tracking-wider font-bold">Manifesto</label>
                    <span className="text-[10px] text-game-muted">{manifesto.length}/3 selected</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MANIFESTO_OPTIONS.map(m => (
                      <button key={m} onClick={() => toggleManifesto(m)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                          manifesto.includes(m)
                            ? 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                            : manifesto.length >= 3
                              ? 'bg-game-bg text-game-muted/40 border-game-border/50 cursor-not-allowed'
                              : 'bg-game-bg text-game-secondary border-game-border hover:border-white/10 hover:text-white'
                        }`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty + AI */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label mb-1.5 font-semibold">Difficulty</label>
                    <div className="space-y-1.5">
                      {([
                        { id: 'easy' as const, label: 'Easy', icon: '🌱' },
                        { id: 'normal' as const, label: 'Normal', icon: '⚖️' },
                        { id: 'hard' as const, label: 'Hard', icon: '🔥' },
                      ]).map(d => (
                        <button key={d.id} onClick={() => setDifficulty(d.id)}
                          className={`w-full p-2 rounded-lg border text-left text-sm transition-all flex items-center gap-2 ${
                            difficulty === d.id
                              ? 'border-purple-500/40 bg-purple-900/20 text-white'
                              : 'border-game-border bg-game-bg text-game-muted hover:text-white hover:border-white/10'
                          }`}>
                          <span>{d.icon}</span>
                          <span className="font-medium">{d.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-label mb-1.5 font-semibold">AI Opponent</label>
                    <div className="space-y-1.5">
                      {(['left', 'center', 'right'] as AIIdeology[]).map(ideo => {
                        const preset = AI_PARTY_PRESETS[ideo];
                        return (
                          <button key={ideo} onClick={() => setAiIdeology(ideo)}
                            className={`w-full p-2 rounded-lg border text-left text-sm transition-all flex items-center gap-2 ${
                              aiIdeology === ideo
                                ? 'border-purple-500/40 bg-purple-900/20 text-white'
                                : 'border-game-border bg-game-bg text-game-muted hover:text-white hover:border-white/10'
                            }`}>
                            <span>{ideo === 'left' ? '🌹' : ideo === 'right' ? '🦅' : '⚖️'}</span>
                            <div>
                              <div className="font-medium text-xs">{preset.partyName}</div>
                              <div className="text-[10px] text-game-muted">{preset.leaderName}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Party preview */}
                <div className="p-3 rounded-xl border border-game-border bg-game-bg/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{
                      backgroundColor: COLOR_HEX[partyColor] + '20',
                      border: `2px solid ${COLOR_HEX[partyColor]}40`
                    }}>
                      {LOGO_EMOJI[partyLogo]}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm" style={{ color: COLOR_HEX[partyColor] }}>
                        {partyName || 'Your Party'}
                      </div>
                      <div className="text-[10px] text-game-muted">
                        {name || 'Leader'} • {getAxisLabel(economicAxis, 'econ')}-{getAxisLabel(socialAxis, 'social')}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-game-muted">
                      vs <span className="text-white font-medium">{aiPreset.partyName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="p-4 border-t border-game-border bg-game-card/50 flex gap-2">
                <button onClick={() => { setModeLocal('menu'); setErrorMsg(''); }}
                  className="px-4 py-2.5 rounded-lg text-sm text-game-muted hover:text-white transition-all hover:bg-white/[0.03]">
                  ← Back
                </button>
                <button onClick={handleStartAIGame} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-primary disabled:opacity-50">
                  {loading ? 'Starting...' : 'Start Game'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Room */}
        {mode === 'create' && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-game-border bg-gradient-to-r from-blue-950/30 to-transparent">
              <h2 className="text-xl font-bold font-display text-blue-300">Create Multiplayer Room</h2>
              <p className="text-xs text-game-muted mt-1">Your friend will join using the room code</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-label mb-1.5 font-semibold">Your Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..." autoFocus maxLength={20}
                  className="w-full p-2.5 bg-game-bg border border-game-border rounded-lg text-white text-sm placeholder:text-game-muted/50 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all" />
              </div>
            </div>
            <div className="p-4 border-t border-game-border bg-game-card/50 flex gap-2">
              <button onClick={() => { setModeLocal('menu'); setErrorMsg(''); }}
                className="px-4 py-2.5 rounded-lg text-sm text-game-muted hover:text-white transition-all hover:bg-white/[0.03]">
                ← Back
              </button>
              <button onClick={handleCreate} disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-primary disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </div>
        )}

        {/* Join Room */}
        {mode === 'join' && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-game-border bg-gradient-to-r from-amber-950/30 to-transparent">
              <h2 className="text-xl font-bold font-display text-amber-300">Join Game</h2>
              <p className="text-xs text-game-muted mt-1">Enter the room code shared by the host</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-label mb-1.5 font-semibold">Your Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..." autoFocus maxLength={20}
                  className="w-full p-2.5 bg-game-bg border border-game-border rounded-lg text-white text-sm placeholder:text-game-muted/50 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all" />
              </div>
              <div>
                <label className="block text-label mb-1.5 font-semibold">Room Code</label>
                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCDEF" maxLength={6}
                  className="w-full p-3 bg-game-bg border border-game-border rounded-lg text-white placeholder:text-game-muted/30 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 tracking-[0.4em] text-center text-2xl font-mono transition-all" />
              </div>
            </div>
            <div className="p-4 border-t border-game-border bg-game-card/50 flex gap-2">
              <button onClick={() => { setModeLocal('menu'); setErrorMsg(''); }}
                className="px-4 py-2.5 rounded-lg text-sm text-game-muted hover:text-white transition-all hover:bg-white/[0.03]">
                ← Back
              </button>
              <button onClick={handleJoin} disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-600 to-amber-500 text-white disabled:opacity-50">
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
