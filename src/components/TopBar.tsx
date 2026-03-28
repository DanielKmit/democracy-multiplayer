'use client';

import { useGameStore } from '@/lib/store';
import { PARTY_COLORS } from '@/lib/engine/types';

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
};

export function TopBar() {
  const { gameState, playerId } = useGameStore();
  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const ruling = gameState.players.find(p => p.role === 'ruling');
  const isRuling = myPlayer?.role === 'ruling';
  const turnsLeft = gameState.turnsUntilElection;
  const dateStr = `${MONTH_NAMES[gameState.date.month - 1]} ${gameState.date.year}`;

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left: Country + Date */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏛️</span>
            <div>
              <div className="text-sm font-bold text-slate-200">Republic of Novaria</div>
              <div className="text-xs text-slate-500">{dateStr} • Turn {gameState.turn}</div>
            </div>
          </div>

          {/* Phase indicator */}
          <div className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {phaseLabels[gameState.phase] ?? gameState.phase}
          </div>

          {/* Ruling party indicator */}
          {ruling && (
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PARTY_COLORS[ruling.party.partyColor] }} />
              <span className="text-slate-400">Gov:</span>
              <span className="text-slate-200 font-medium">{ruling.party.partyName}</span>
            </div>
          )}
        </div>

        {/* Center: Key Stats */}
        <div className="flex items-center gap-5">
          <Stat label="Approval" value={`${gameState.approvalRating}%`} color={gameState.approvalRating > 50 ? 'text-green-400' : 'text-red-400'} />
          <Stat label="GDP" value={`${gameState.simulation.gdpGrowth > 0 ? '+' : ''}${gameState.simulation.gdpGrowth.toFixed(1)}%`} color={gameState.simulation.gdpGrowth > 0 ? 'text-green-400' : 'text-red-400'} />
          <Stat label="Unemp" value={`${gameState.simulation.unemployment.toFixed(1)}%`} color={gameState.simulation.unemployment < 8 ? 'text-green-400' : 'text-red-400'} />
          <Stat label="Debt" value={`${gameState.budget.debtToGdp.toFixed(0)}%`} color={gameState.budget.debtToGdp < 100 ? 'text-green-400' : 'text-yellow-400'} />
          <Stat label="Crime" value={gameState.simulation.crime.toFixed(0)} color={gameState.simulation.crime < 40 ? 'text-green-400' : 'text-red-400'} />
        </div>

        {/* Right: PC & Election Timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">PC</span>
            <span className="text-lg font-bold text-yellow-400">⚡{myPlayer?.politicalCapital ?? 0}</span>
          </div>

          <div className={`text-xs px-2 py-1 rounded ${turnsLeft <= 2 ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-400'}`}>
            🗳️ {turnsLeft <= 0 ? 'NOW' : `${turnsLeft} turns`}
          </div>

          {/* My party badge */}
          {myPlayer && (
            <div
              className="text-xs px-2 py-1 rounded font-medium"
              style={{
                backgroundColor: PARTY_COLORS[myPlayer.party.partyColor] + '20',
                color: PARTY_COLORS[myPlayer.party.partyColor],
                border: `1px solid ${PARTY_COLORS[myPlayer.party.partyColor]}40`,
              }}
            >
              {isRuling ? '🏛️' : '⚔️'} {myPlayer.party.partyName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-slate-600">{label}</div>
      <div className={`text-xs font-bold ${color}`}>{value}</div>
    </div>
  );
}
