'use client';

import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { REGIONS } from '@/lib/engine/regions';
import { PARTY_COLORS } from '@/lib/engine/types';

export function PollingSummary() {
  const { gameState } = useGameStore();
  const { endTurnPhase } = useGameActions();
  if (!gameState) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="max-w-2xl w-full mx-4 p-6 rounded-xl bg-slate-800 border border-slate-700">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">📊 Polling Results</h2>
          <p className="text-slate-400">Turn {gameState.turn} Summary</p>
        </div>

        {/* Approval bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            {gameState.players.map(player => (
              <span key={player.id} style={{ color: PARTY_COLORS[player.party.partyColor] }}>
                {player.party.partyName}: {player.role === 'ruling' ? gameState.approvalRating : gameState.oppositionVoteShare}%
              </span>
            ))}
          </div>
          <div className="w-full h-6 bg-slate-700 rounded-full overflow-hidden flex">
            {gameState.players.map(player => {
              const share = player.role === 'ruling' ? gameState.approvalRating : gameState.oppositionVoteShare;
              return (
                <div
                  key={player.id}
                  className="h-full transition-all duration-1000"
                  style={{
                    width: `${share}%`,
                    backgroundColor: PARTY_COLORS[player.party.partyColor],
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <MiniStat label="GDP" value={`${gameState.simulation.gdpGrowth > 0 ? '+' : ''}${gameState.simulation.gdpGrowth.toFixed(1)}%`} />
          <MiniStat label="Unemp" value={`${gameState.simulation.unemployment.toFixed(1)}%`} />
          <MiniStat label="Crime" value={gameState.simulation.crime.toFixed(0)} />
          <MiniStat label="Budget" value={gameState.budget.deficit > 0 ? `Def: ${gameState.budget.deficit.toFixed(0)}B` : `Sur: ${Math.abs(gameState.budget.deficit).toFixed(0)}B`} />
        </div>

        {/* Voter groups */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {VOTER_GROUPS.map(group => {
            const sat = gameState.voterSatisfaction[group.id] ?? 50;
            return (
              <div key={group.id} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-slate-400 truncate">{group.name}</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${sat}%`,
                      backgroundColor: sat > 60 ? '#22C55E' : sat < 40 ? '#EF4444' : '#EAB308',
                    }}
                  />
                </div>
                <span className="w-8 text-right text-slate-500">{sat}%</span>
              </div>
            );
          })}
        </div>

        {/* Situations */}
        {gameState.activeSituations.length > 0 && (
          <div className="mb-4 p-2 bg-slate-900 rounded-lg">
            <div className="text-xs text-slate-500 mb-1">Active Situations:</div>
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
          <button
            onClick={endTurnPhase}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all"
          >
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
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-bold text-slate-200">{value}</div>
    </div>
  );
}
