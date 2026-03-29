'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/lib/store';
import { PARTY_COLORS, GameState } from '@/lib/engine/types';
import { restoreGame } from '@/lib/gameHost';
import { HelpModal } from './HelpModal';


const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const phaseLabels: Record<string, string> = {
  events: '📰 Events',
  dilemma: '⚖️ Dilemma',
  ruling: '🏛️ Ruling Party Turn',
  bill_voting: '📋 Parliament Vote',
  resolution: '⚙️ Resolving...',
  opposition: '⚔️ Opposition Turn',
  polling: '📊 Polling Results',
  election: '🗳️ Election',
  government_formation: '🏛️ Forming Government',
  coalition_negotiation: '🤝 Coalition Talks',
  campaigning: '📢 Campaign Phase',
};

export function TopBar() {
  const { gameState, playerId, setGameState } = useGameStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const ruling = gameState.players.find(p => p.role === 'ruling');
  const isRuling = myPlayer?.role === 'ruling';
  const turnsLeft = gameState.turnsUntilElection;
  const dateStr = `${MONTH_NAMES[gameState.date.month - 1]} ${gameState.date.year}`;

  const myVoteShare = myPlayer ? (gameState.voteShares?.[myPlayer.id] ?? 0) : 0;

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
    // Reset input so same file can be loaded again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="glass-card rounded-none border-x-0 border-t-0 px-4 py-2.5">
      <div className="flex items-center justify-between">
        {/* Left: Country + Date */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏛️</span>
            <div>
              <div className="text-sm font-bold text-white font-display tracking-wide">Republic of Novaria</div>
              <div className="text-[10px] text-game-muted">{dateStr} • Turn {gameState.turn}</div>
            </div>
          </div>

          <div className="text-[10px] px-3 py-1 rounded-full glass-card text-game-secondary">
            {phaseLabels[gameState.phase] ?? gameState.phase}
          </div>

          {ruling && !gameState.isPreElection && (
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PARTY_COLORS[ruling.party.partyColor] }} />
              <span className="text-game-muted">Gov:</span>
              <span className="text-white font-medium">{ruling.party.partyName}</span>
            </div>
          )}
        </div>

        {/* Center: Key Stats */}
        <div className="flex items-center gap-4">
          {/* Vote share (sums to 100%) */}
          <div className="text-center">
            <div className="text-[10px] text-game-muted">Vote Share</div>
            <div className="text-xs font-bold text-game-accent">{myVoteShare.toFixed(1)}%</div>
          </div>

          <Stat label="GDP" value={`${gameState.simulation.gdpGrowth > 0 ? '+' : ''}${gameState.simulation.gdpGrowth.toFixed(1)}%`}
            color={gameState.simulation.gdpGrowth > 0 ? 'text-emerald-400' : 'text-red-400'} />
          <Stat label="Unemp" value={`${gameState.simulation.unemployment.toFixed(1)}%`}
            color={gameState.simulation.unemployment < 8 ? 'text-emerald-400' : 'text-red-400'} />

          <div className="text-center">
            <div className="text-[10px] text-game-muted">Budget</div>
            <div className={`text-xs font-bold ${gameState.budget.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {gameState.budget.balance >= 0 ? '+' : ''}{gameState.budget.balance.toFixed(1)}B
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] text-game-muted">Debt</div>
            <div className={`text-xs font-bold ${gameState.budget.debtToGdp < 60 ? 'text-emerald-400' : gameState.budget.debtToGdp < 100 ? 'text-amber-400' : 'text-red-400'}`}>
              {gameState.budget.debtToGdp.toFixed(0)}% <span className="text-[9px] text-game-muted">{gameState.budget.creditRating}</span>
            </div>
          </div>

          <Stat label="Crime" value={gameState.simulation.crime.toFixed(0)}
            color={gameState.simulation.crime < 40 ? 'text-emerald-400' : 'text-red-400'} />
        </div>

        {/* Right: PC & Election Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-game-muted">PC</span>
            <span className="text-lg font-bold text-amber-400">⚡{myPlayer?.politicalCapital ?? 0}</span>
          </div>

          <div className={`text-xs px-2.5 py-1 rounded-lg ${turnsLeft <= 2 ? 'bg-red-900/30 text-red-400 border border-red-800/50 pulse-red' : 'glass-card text-game-secondary'}`}>
            🗳️ {turnsLeft <= 0 ? 'NOW' : `${turnsLeft} turns`}
          </div>

          {myPlayer && (
            <div className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{
              backgroundColor: PARTY_COLORS[myPlayer.party.partyColor] + '15',
              color: PARTY_COLORS[myPlayer.party.partyColor],
              border: `1px solid ${PARTY_COLORS[myPlayer.party.partyColor]}30`,
            }}>
              {isRuling ? '🏛️' : gameState.isPreElection ? '📢' : '⚔️'} {myPlayer.party.partyName}
            </div>
          )}

          {/* Save/Load/Help */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleSaveGame}
              className="text-[10px] px-2 py-1 rounded glass-card text-game-secondary hover:text-white transition-colors cursor-pointer"
              title="Save Game"
            >
              💾
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] px-2 py-1 rounded glass-card text-game-secondary hover:text-white transition-colors cursor-pointer"
              title="Load Game"
            >
              📂
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="text-[10px] px-2 py-1 rounded glass-card text-game-secondary hover:text-white transition-colors cursor-pointer"
              title="How to Play"
            >
              ❓
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleLoadGame}
              className="hidden"
            />
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

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-game-muted">{label}</div>
      <div className={`text-xs font-bold ${color}`}>{value}</div>
    </div>
  );
}
