'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/lib/store';
import { PARTY_COLORS, GameState } from '@/lib/engine/types';
import { restoreGame } from '@/lib/gameHost';
import { HelpModal } from './HelpModal';
import { useAudio } from './AudioManager';


const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const phaseLabels: Record<string, { label: string; color: string }> = {
  events: { label: 'Events', color: 'text-amber-400' },
  dilemma: { label: 'Dilemma', color: 'text-purple-400' },
  ruling: { label: 'Ruling Turn', color: 'text-blue-400' },
  bill_voting: { label: 'Parliament Vote', color: 'text-cyan-400' },
  resolution: { label: 'Resolving...', color: 'text-game-muted' },
  opposition: { label: 'Opposition Turn', color: 'text-red-400' },
  polling: { label: 'Polling', color: 'text-emerald-400' },
  election: { label: 'Election', color: 'text-amber-400' },
  government_formation: { label: 'Forming Government', color: 'text-blue-400' },
  coalition_negotiation: { label: 'Coalition Talks', color: 'text-purple-400' },
  campaigning: { label: 'Campaign', color: 'text-amber-400' },
};

export function TopBar() {
  const { gameState, playerId, setGameState } = useGameStore();
  const { musicEnabled, sfxEnabled, toggleMusic, toggleSfx } = useAudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const ruling = gameState.players.find(p => p.role === 'ruling');
  const isRuling = myPlayer?.role === 'ruling';
  const turnsLeft = gameState.turnsUntilElection;
  const dateStr = `${MONTH_NAMES[gameState.date.month - 1]} ${gameState.date.year}`;

  const myVoteShare = myPlayer ? (gameState.voteShares?.[myPlayer.id] ?? 0) : 0;
  const approval = myPlayer ? (gameState.approvalRating?.[myPlayer.id] ?? 50) : 50;
  const phase = phaseLabels[gameState.phase] ?? { label: gameState.phase, color: 'text-game-muted' };

  const handleSaveGame = () => {
    const json = JSON.stringify(gameState, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `novaria-save-${dateStamp}-turn${gameState.turn}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadGame = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const loaded = JSON.parse(reader.result as string) as GameState;
        const restored = restoreGame(loaded);
        setGameState(restored);
      } catch {
        alert('Failed to load save file — invalid format.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="border-b border-game-border bg-game-card/80 backdrop-blur-xl px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left: Country + Date + Phase */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-game-accent/10 border border-game-accent/20 flex items-center justify-center text-sm">
              🏛️
            </div>
            <div>
              <div className="text-sm font-bold text-white font-display tracking-wide leading-tight">Novaria</div>
              <div className="text-[10px] text-game-muted">{dateStr} • Turn {gameState.turn}</div>
            </div>
          </div>

          {/* Phase badge */}
          <div className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium ${phase.color}`}
            style={{ borderColor: 'currentColor', opacity: 0.8, backgroundColor: 'rgba(255,255,255,0.02)' }}>
            {phase.label}
          </div>

          {/* Coalition info */}
          {ruling && !gameState.isPreElection && (() => {
            const rulingSeats = gameState.parliament.seatsByParty[ruling.id] ?? 0;
            const coalitionPartners = gameState.coalitionPartners ?? [];
            const coalitionSeats = coalitionPartners.reduce((sum, cp) => sum + cp.seats, 0);
            const totalCoalitionSeats = rulingSeats + coalitionSeats;

            return (
              <div className="flex items-center gap-1.5 text-[10px] ml-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PARTY_COLORS[ruling.party.partyColor] }} />
                <span className="text-game-secondary font-medium">{ruling.party.partyName}</span>
                <span className="text-game-muted">({totalCoalitionSeats}/100)</span>
              </div>
            );
          })()}
        </div>

        {/* Center: Key Stats */}
        <div className="flex items-center gap-1">
          <StatPill label="Vote" value={`${myVoteShare.toFixed(1)}%`} color="text-game-accent" />
          {!gameState.isPreElection && (
            <StatPill label="Approval" value={`${approval.toFixed(0)}%`}
              color={approval > 55 ? 'text-emerald-400' : approval > 35 ? 'text-amber-400' : 'text-red-400'} />
          )}
          <StatPill label="GDP" value={`${gameState.simulation.gdpGrowth > 0 ? '+' : ''}${gameState.simulation.gdpGrowth.toFixed(1)}%`}
            color={gameState.simulation.gdpGrowth > 0 ? 'text-emerald-400' : 'text-red-400'} />
          <StatPill label="Jobs" value={`${(100 - gameState.simulation.unemployment).toFixed(0)}%`}
            color={gameState.simulation.unemployment < 8 ? 'text-emerald-400' : 'text-red-400'} />
          <StatPill label="Debt" value={`${gameState.budget.debtToGdp.toFixed(0)}%`}
            color={gameState.budget.debtToGdp < 60 ? 'text-emerald-400' : gameState.budget.debtToGdp < 100 ? 'text-amber-400' : 'text-red-400'}
            suffix={<span className="text-[8px] text-game-muted ml-0.5">{gameState.budget.creditRating}</span>} />
        </div>

        {/* Right: PC + Election + Party + Controls */}
        <div className="flex items-center gap-3">
          {/* PC */}
          <div className="flex items-center gap-1.5 stat-card !py-1.5 !px-2.5">
            <span className="text-amber-400 text-sm">⚡</span>
            <span className="text-base font-bold text-amber-400">{myPlayer?.politicalCapital ?? 0}</span>
          </div>

          {/* Election timer */}
          <div className={`stat-card !py-1.5 !px-2.5 flex items-center gap-1.5 ${turnsLeft <= 2 ? 'pulse-red !border-red-800/50' : ''}`}>
            <span className="text-xs">🗳️</span>
            <span className={`text-xs font-bold ${turnsLeft <= 2 ? 'text-red-400' : 'text-game-secondary'}`}>
              {turnsLeft <= 0 ? 'NOW' : turnsLeft}
            </span>
          </div>

          {/* Party badge */}
          {myPlayer && (
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium" style={{
              backgroundColor: PARTY_COLORS[myPlayer.party.partyColor] + '12',
              color: PARTY_COLORS[myPlayer.party.partyColor],
              border: `1px solid ${PARTY_COLORS[myPlayer.party.partyColor]}25`,
            }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PARTY_COLORS[myPlayer.party.partyColor] }} />
              {myPlayer.party.partyName}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-0.5">
            {[
              { onClick: toggleMusic, icon: musicEnabled ? '🎵' : '🔇', title: musicEnabled ? 'Mute Music' : 'Play Music' },
              { onClick: toggleSfx, icon: sfxEnabled ? '🔊' : '🔈', title: sfxEnabled ? 'Mute SFX' : 'Enable SFX' },
              { onClick: handleSaveGame, icon: '💾', title: 'Save Game' },
              { onClick: () => fileInputRef.current?.click(), icon: '📂', title: 'Load Game' },
              { onClick: () => setShowHelp(true), icon: '❓', title: 'Help' },
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} title={btn.title}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[11px] text-game-muted hover:text-white hover:bg-white/5 transition-all">
                {btn.icon}
              </button>
            ))}
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleLoadGame} className="hidden" />
          </div>
          {showHelp && typeof document !== 'undefined' && createPortal(
            <HelpModal onClose={() => setShowHelp(false)} />,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color, suffix }: { label: string; value: string; color: string; suffix?: React.ReactNode }) {
  return (
    <div className="stat-card !py-1 !px-2.5 flex items-center gap-1.5">
      <span className="text-[9px] text-game-muted uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
      {suffix}
    </div>
  );
}
