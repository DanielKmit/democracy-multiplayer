'use client';

import { useGameStore } from '@/lib/store';

const phaseLabels: Record<string, string> = {
  events: '📰 Events',
  ruling: '🏛️ Ruling Party Turn',
  resolution: '⚙️ Resolving...',
  opposition: '⚔️ Opposition Turn',
  polling: '📊 Polling Results',
  election: '🗳️ Election',
};

export function TopBar() {
  const { gameState, playerId } = useGameStore();
  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const isRuling = myPlayer?.role === 'ruling';
  const turnsLeft = gameState.turnsUntilElection;

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-3">
      <div className="flex items-center justify-between max-w-full">
        {/* Left: Turn & Phase */}
        <div className="flex items-center gap-6">
          <div className="text-sm text-slate-400">
            Turn <span className="text-lg font-bold text-slate-100">{gameState.turn}</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isRuling ? 'bg-blue-900/50 text-blue-300 border border-blue-800' : 'bg-red-900/50 text-red-300 border border-red-800'
          }`}>
            {isRuling ? '🏛️ Ruling Party' : '⚔️ Opposition'}
          </div>
          <div className="text-sm text-slate-400">
            {phaseLabels[gameState.phase] ?? gameState.phase}
          </div>
        </div>

        {/* Center: Key Stats */}
        <div className="flex items-center gap-6">
          <Stat label="Approval" value={`${gameState.approvalRating}%`} color={gameState.approvalRating > 50 ? 'text-green-400' : 'text-red-400'} />
          <Stat label="GDP" value={`${gameState.simulation.gdpGrowth > 0 ? '+' : ''}${gameState.simulation.gdpGrowth.toFixed(1)}%`} color={gameState.simulation.gdpGrowth > 0 ? 'text-green-400' : 'text-red-400'} />
          <Stat label="Unemployment" value={`${gameState.simulation.unemployment.toFixed(1)}%`} color={gameState.simulation.unemployment < 8 ? 'text-green-400' : 'text-red-400'} />
          <Stat label="Debt/GDP" value={`${gameState.budget.debtToGdp.toFixed(0)}%`} color={gameState.budget.debtToGdp < 100 ? 'text-green-400' : 'text-yellow-400'} />
        </div>

        {/* Right: PC & Election Timer */}
        <div className="flex items-center gap-6">
          <div className="text-sm">
            <span className="text-slate-400">PC: </span>
            <span className="text-lg font-bold text-yellow-400">⚡{myPlayer?.politicalCapital ?? 0}</span>
          </div>
          <div className="text-sm">
            <span className="text-slate-400">Election in: </span>
            <span className={`font-bold ${turnsLeft <= 2 ? 'text-red-400' : 'text-slate-200'}`}>
              {turnsLeft} turns
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Room: {gameState.roomId}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
