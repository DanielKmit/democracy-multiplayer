'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { createRoom, joinRoom, onMessage, onPeerConnect, onPeerDisconnect, sendMessage, setLocalMode as setPeerLocalMode, isLocalMode } from '@/lib/peer';
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
  const [localTestMode, setLocalTestMode] = useState(false);

  // AI setup state
  const [aiIdeology, setAiIdeology] = useState<AIIdeology>('center');
  const [partyName, setPartyName] = useState('');
  const [partyColor, setPartyColor] = useState<PartyColor>('blue');
  const [partyLogo, setPartyLogo] = useState<PartyLogo>('star');
  const [economicAxis, setEconomicAxis] = useState(50);
  const [socialAxis, setSocialAxis] = useState(50);
  const [manifesto, setManifesto] = useState<ManifestoOption[]>([]);

  // Check for saved game on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const saved = loadPersistedState();
      if (saved && saved.phase !== 'game_over') {
        setHasSavedGame(true);
        setSavedRoomId(saved.roomId);
      }
    }
  });

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

    setOnStateChange((newState: GameState) => {
      useGameStore.getState().setGameState(newState);
    });

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
      partyName: partyName.trim(),
      partyColor: partyColor,
      leaderName: name.trim(),
      economicAxis,
      socialAxis,
      logo: partyLogo,
      manifesto,
    };

    setPlayerName(name.trim());
    setPlayerId('host');
    setRoomId(roomCode);
    setMode('ai_host');
    setConnected(true);

    const state = initAIGame(roomCode, name.trim(), partyConfig, aiIdeology);
    setGameState(state);

    setOnStateChange((newState: GameState) => {
      useGameStore.getState().setGameState(newState);
    });

    router.push(`/game/${roomCode}`);
  };

  const handleToggleLocalMode = (enabled: boolean) => {
    setLocalTestMode(enabled);
    setPeerLocalMode(enabled);
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

      setOnStateChange((newState: GameState) => {
        useGameStore.getState().setGameState(newState);
      });

      onPeerConnect(() => {
        useGameStore.getState().setConnected(true);
      });

      onPeerDisconnect(() => {});

      onMessage((msg) => {
        if (msg.type === 'playerInfo') {
          handleClientJoin(msg.name);
        } else if (msg.type === 'action') {
          handleAction('client', msg.action, msg.payload);
        }
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
        if (msg.type === 'state') {
          useGameStore.getState().setGameState(msg.state as GameState);
        } else if (msg.type === 'error') {
          useGameStore.getState().setError(msg.message);
        }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="max-w-lg w-full mx-4">
        {/* Title */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="text-6xl mb-4">🏛️</div>
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent">
            Democracy
          </h1>
          <p className="text-slate-400 text-lg">Republic of Novaria</p>
          <p className="text-slate-600 text-sm mt-1">Political Simulation</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm text-center">
            {errorMsg}
          </div>
        )}

        {mode === 'menu' && (
          <div className="space-y-4 animate-fade-in">
            {hasSavedGame && (
              <button
                onClick={handleResume}
                disabled={loading}
                className="w-full p-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ring-2 ring-emerald-400/50"
              >
                ▶️ Resume Game {savedRoomId ? `(${savedRoomId})` : ''}
              </button>
            )}
            <button
              onClick={() => setModeLocal('ai_setup')}
              className="w-full p-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              🤖 Play vs AI
            </button>
            <button
              onClick={() => setModeLocal('create')}
              className="w-full p-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              👥 Play vs Friend
            </button>
            <button
              onClick={() => setModeLocal('join')}
              className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              🔗 Join Game
            </button>
            <div className="text-center mt-8 space-y-2">
              <p className="text-slate-500 text-sm">Create your party. Govern a fictional country. Win elections.</p>
              <p className="text-slate-600 text-xs">Parliament • Ministers • Laws • Dilemmas • Regions • Situations</p>
            </div>
          </div>
        )}

        {mode === 'ai_setup' && (
          <div className="space-y-5 animate-fade-in max-h-[80vh] overflow-y-auto pr-1">
            <h2 className="text-xl font-bold text-center">🤖 Play vs AI</h2>

            {/* Name */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Your Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..." autoFocus maxLength={20}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Party Name */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Party Name</label>
              <input
                type="text" value={partyName} onChange={(e) => setPartyName(e.target.value)}
                placeholder="Your party name..." maxLength={30}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Party Color */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Party Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setPartyColor(c)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${partyColor === c ? 'border-white scale-110' : 'border-slate-600'}`}
                    style={{ backgroundColor: COLOR_HEX[c] }}
                  />
                ))}
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Party Logo</label>
              <div className="flex gap-2 flex-wrap">
                {LOGOS.map(l => (
                  <button key={l} onClick={() => setPartyLogo(l)}
                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg transition-all ${partyLogo === l ? 'border-white bg-slate-700 scale-110' : 'border-slate-600 bg-slate-800'}`}>
                    {LOGO_EMOJI[l]}
                  </button>
                ))}
              </div>
            </div>

            {/* Ideology Sliders */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Economic Position</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Left</span>
                <input type="range" min={0} max={100} value={economicAxis}
                  onChange={(e) => setEconomicAxis(Number(e.target.value))}
                  className="flex-1 accent-purple-500" />
                <span className="text-xs text-blue-400">Right</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Social Position</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-orange-400">Auth</span>
                <input type="range" min={0} max={100} value={socialAxis}
                  onChange={(e) => setSocialAxis(Number(e.target.value))}
                  className="flex-1 accent-purple-500" />
                <span className="text-xs text-green-400">Liberal</span>
              </div>
            </div>

            {/* Manifesto */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Manifesto (pick 3)</label>
              <div className="flex flex-wrap gap-2">
                {MANIFESTO_OPTIONS.map(m => (
                  <button key={m} onClick={() => toggleManifesto(m)}
                    className={`px-3 py-1 rounded-full text-xs transition-all ${
                      manifesto.includes(m)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    } ${manifesto.length >= 3 && !manifesto.includes(m) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Opponent Selection */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">AI Opponent</label>
              <div className="grid grid-cols-3 gap-3">
                {(['left', 'center', 'right'] as AIIdeology[]).map(ideo => {
                  const preset = AI_PARTY_PRESETS[ideo];
                  return (
                    <button key={ideo} onClick={() => setAiIdeology(ideo)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        aiIdeology === ideo
                          ? 'border-purple-500 bg-purple-900/30'
                          : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                      }`}>
                      <div className="text-2xl mb-1">
                        {ideo === 'left' ? '🌹' : ideo === 'right' ? '🦅' : '⚖️'}
                      </div>
                      <div className="text-sm font-semibold">{preset.partyName}</div>
                      <div className="text-xs text-slate-400">{preset.leaderName}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI opponent preview */}
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-sm">
              <p className="text-slate-400">
                <span className="text-white font-semibold">🤖 {aiPreset.partyName}</span> led by {aiPreset.leaderName}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Manifesto: {aiPreset.manifesto.join(' • ')}
              </p>
            </div>

            <button onClick={handleStartAIGame} disabled={loading}
              className="w-full p-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 rounded-xl text-lg font-semibold transition-all">
              {loading ? 'Starting...' : '🤖 Start Game vs AI'}
            </button>
            <button onClick={() => { setModeLocal('menu'); setErrorMsg(''); }}
              className="w-full p-2 text-slate-400 hover:text-slate-300 text-sm">← Back</button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Your Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..." autoFocus maxLength={20}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={localTestMode}
                onChange={(e) => handleToggleLocalMode(e.target.checked)}
                className="accent-blue-500"
              />
              🖥️ Local test mode <span className="text-slate-600">(same computer)</span>
            </label>
            <button onClick={handleCreate} disabled={loading}
              className="w-full p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-xl text-lg font-semibold transition-all">
              {loading ? 'Creating...' : '👥 Create Game Room'}
            </button>
            <button onClick={() => { setModeLocal('menu'); setErrorMsg(''); }}
              className="w-full p-2 text-slate-400 hover:text-slate-300 text-sm">← Back</button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Your Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..." autoFocus maxLength={20}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Room Code</label>
              <input
                type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF" maxLength={6}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 tracking-[0.3em] text-center text-xl font-mono"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={localTestMode}
                onChange={(e) => handleToggleLocalMode(e.target.checked)}
                className="accent-blue-500"
              />
              🖥️ Local test mode <span className="text-slate-600">(same computer)</span>
            </label>
            <button onClick={handleJoin} disabled={loading}
              className="w-full p-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 rounded-xl text-lg font-semibold transition-all">
              {loading ? 'Joining...' : '🔗 Join Game'}
            </button>
            <button onClick={() => { setModeLocal('menu'); setErrorMsg(''); }}
              className="w-full p-2 text-slate-400 hover:text-slate-300 text-sm">← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
