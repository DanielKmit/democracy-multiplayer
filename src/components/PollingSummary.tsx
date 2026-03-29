'use client';

import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { PARTY_COLORS } from '@/lib/engine/types';

export function PollingSummary() {
  const { gameState, playerId } = useGameStore();
  const { endTurnPhase } = useGameActions();
  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="max-w-2xl w-full mx-4 p-6 rounded-xl bg-slate-800 border border-slate-700">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">📊 Polling Results</h2>
          <p className="text-slate-400">Turn {gameState.turn} Summary</p>
        </div>

        {/* Per-party approval bars */}
        <div className="mb-6 space-y-2">
          {gameState.players.map(player => {
            const approval = gameState.approvalRating[player.id] ?? 50;
            return (
              <div key={player.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: PARTY_COLORS[player.party.partyColor] }}>
                    {player.party.partyName} {player.role === 'ruling' ? '(Ruling)' : '(Opposition)'}
                  </span>
                  <span className="text-slate-300 font-bold">{Math.round(approval)}%</span>
                </div>
                <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${approval}%`, backgroundColor: PARTY_COLORS[player.party.partyColor] }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          <MiniStat label="GDP" value={`${gameState.simulation.gdpGrowth > 0 ? '+' : ''}${gameState.simulation.gdpGrowth.toFixed(1)}%`} />
          <MiniStat label="Unemp" value={`${gameState.simulation.unemployment.toFixed(1)}%`} />
          <MiniStat label="Crime" value={gameState.simulation.crime.toFixed(0)} />
          <MiniStat label="Budget" value={`${gameState.budget.balance >= 0 ? '+' : ''}${gameState.budget.balance.toFixed(1)}B`} />
          <MiniStat label="Debt" value={`${gameState.budget.debtToGdp.toFixed(0)}% ${gameState.budget.creditRating}`} />
        </div>

        {/* Per-party voter satisfaction */}
        {myPlayer && (
          <div className="mb-6">
            <div className="text-xs text-slate-500 mb-2">Your party&apos;s support by voter group:</div>
            <div className="grid grid-cols-2 gap-2">
              {VOTER_GROUPS.map(group => {
                const mySat = gameState.voterSatisfaction[myPlayer.id]?.[group.id] ?? 50;
                return (
                  <div key={group.id} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-slate-400 truncate">{group.name}</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${mySat}%`,
                        backgroundColor: mySat > 60 ? '#22C55E' : mySat < 40 ? '#EF4444' : '#EAB308',
                      }} />
                    </div>
                    <span className="w-8 text-right text-slate-500">{mySat}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Situations */}
        {gameState.activeSituations.length > 0 && (
          <div className="mb-4 p-2 bg-slate-900 rounded-lg">
            <div className="text-xs text-slate-500 mb-1">Active Crises:</div>
            <div className="flex flex-wrap gap-2">
              {gameState.activeSituations.map(sit => (
                <span key={sit.id} className="text-xs px-2 py-0.5 bg-orange-900/30 text-orange-400 rounded border border-orange-800">
                  {sit.id.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <div className="text-sm text-slate-400 mb-3">
            {gameState.turnsUntilElection > 0
              ? `🗳️ Election in ${gameState.turnsUntilElection} turns`
              : '🗳️ Election next!'}
          </div>
          <button onClick={endTurnPhase}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all">
            {gameState.turnsUntilElection <= 0 ? 'Proceed to Election →' : 'Next Turn →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-slate-900 rounded text-center">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-xs font-bold text-slate-200">{value}</div>
    </div>
  );
}
