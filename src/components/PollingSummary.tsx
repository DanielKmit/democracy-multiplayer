'use client';

import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { PARTY_COLORS } from '@/lib/engine/types';
import { getSituationById } from '@/lib/engine/situations';
import { ParliamentHemicycle } from './ParliamentHemicycle';

export function PollingSummary() {
  const { gameState, playerId } = useGameStore();
  const { endTurnPhase } = useGameActions();
  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);

  // Build sorted party list for vote share display
  const allParties: { id: string; name: string; color: string; voteShare: number; isMe: boolean; role?: string }[] = [];

  for (const player of gameState.players) {
    allParties.push({
      id: player.id,
      name: player.party.partyName,
      color: PARTY_COLORS[player.party.partyColor],
      voteShare: gameState.voteShares?.[player.id] ?? 0,
      isMe: player.id === playerId,
      role: player.role,
    });
  }

  for (const bot of gameState.botParties) {
    allParties.push({
      id: bot.id,
      name: bot.name,
      color: bot.color,
      voteShare: gameState.voteShares?.[bot.id] ?? 0,
      isMe: false,
    });
  }

  // Sort by vote share desc
  allParties.sort((a, b) => b.voteShare - a.voteShare);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="max-w-2xl w-full mx-4 p-6 rounded-2xl glass-card border border-game-border">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold font-display mb-2">📊 Polling Results</h2>
          <p className="text-game-secondary">Turn {gameState.turn} — {gameState.isPreElection ? 'Campaign Phase' : 'Parliamentary Term'}</p>
        </div>

        {/* Vote share bars — ALL parties, sums to 100% */}
        <div className="mb-6 space-y-3">
          <div className="text-[10px] text-game-muted uppercase tracking-wider mb-2">National Vote Share</div>
          {allParties.map(party => (
            <div key={party.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: party.color }} />
                  <span style={{ color: party.color }} className="font-medium">
                    {party.name}
                    {party.isMe && <span className="text-game-accent text-xs ml-1">(You)</span>}
                    {party.role === 'ruling' && <span className="text-game-muted text-xs ml-1">Gov</span>}
                    {party.role === 'opposition' && !gameState.isPreElection && <span className="text-game-muted text-xs ml-1">Opp</span>}
                  </span>
                </span>
                <span className="text-white font-bold">{party.voteShare.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-game-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${party.voteShare}%`, backgroundColor: party.color }}
                />
              </div>
            </div>
          ))}
          <div className="text-right text-[10px] text-game-muted">
            Total: {allParties.reduce((s, p) => s + p.voteShare, 0).toFixed(1)}%
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          <MiniStat label="GDP" value={`${gameState.simulation.gdpGrowth > 0 ? '+' : ''}${gameState.simulation.gdpGrowth.toFixed(1)}%`} />
          <MiniStat label="Unemp" value={`${gameState.simulation.unemployment.toFixed(1)}%`} />
          <MiniStat label="Crime" value={gameState.simulation.crime.toFixed(0)} />
          <MiniStat label="Budget" value={`${gameState.budget.balance >= 0 ? '+' : ''}${gameState.budget.balance.toFixed(1)}B`} />
          <MiniStat label="Debt" value={`${gameState.budget.debtToGdp.toFixed(0)}% ${gameState.budget.creditRating}`} />
        </div>

        {/* Per-party voter satisfaction (for my party) */}
        {myPlayer && (
          <div className="mb-6">
            <div className="text-[10px] text-game-muted uppercase tracking-wider mb-2">Your support by voter group:</div>
            <div className="grid grid-cols-2 gap-2">
              {VOTER_GROUPS.map(group => {
                const mySat = gameState.voterSatisfaction[myPlayer.id]?.[group.id] ?? 50;
                return (
                  <div key={group.id} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-game-secondary truncate">{group.name}</span>
                    <div className="flex-1 h-2 bg-game-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${mySat}%`,
                        backgroundColor: mySat > 60 ? '#10B981' : mySat < 40 ? '#EF4444' : '#EAB308',
                      }} />
                    </div>
                    <span className="w-8 text-right text-game-muted">{mySat}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Situations */}
        {gameState.activeSituations.length > 0 && (
          <div className="mb-4 p-2 glass-card rounded-lg">
            <div className="text-xs text-game-muted mb-1">Active Crises:</div>
            <div className="flex flex-wrap gap-2">
              {gameState.activeSituations.map(sit => (
                <span key={sit.id} className="text-xs px-2 py-0.5 bg-orange-900/30 text-orange-400 rounded border border-orange-800">
                  {getSituationById(sit.id)?.name ?? sit.id.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <div className="text-sm text-game-secondary mb-3">
            {gameState.turnsUntilElection > 0
              ? `🗳️ Election in ${gameState.turnsUntilElection} turns`
              : '🗳️ Election next!'}
          </div>
          <button onClick={endTurnPhase}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              gameState.turnsUntilElection <= 0 ? 'btn-primary animate-pulse' : 'btn-primary'
            }`}>
            {gameState.turnsUntilElection <= 0 ? 'Proceed to Election →' : 'Next Turn →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 glass-card rounded text-center">
      <div className="text-[10px] text-game-muted">{label}</div>
      <div className="text-xs font-bold text-white">{value}</div>
    </div>
  );
}
