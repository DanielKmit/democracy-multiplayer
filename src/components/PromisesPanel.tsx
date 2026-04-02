'use client';

import { useGameStore } from '@/lib/store';
import { POLICY_MAP } from '@/lib/engine/policies';
import { PARTY_COLORS } from '@/lib/engine/types';

export function PromisesPanel() {
  const { gameState, playerId } = useGameStore();
  if (!gameState) return null;

  const pledges = gameState.pledges ?? [];
  if (pledges.length === 0) return null;

  const statusColors = {
    pending: 'text-amber-400',
    kept: 'text-emerald-400',
    broken: 'text-red-400',
  };

  const statusIcons = {
    pending: '⏳',
    kept: '✅',
    broken: '💔',
  };

  // Group pledges by player
  const myPledges = pledges.filter(p => p.playerId === playerId);
  const opponentPledges = pledges.filter(p => p.playerId !== playerId);

  const renderPledge = (pledge: typeof pledges[0], i: number, isOpponent: boolean) => {
    const policy = POLICY_MAP.get(pledge.policyId);
    const player = gameState.players.find(p => p.id === pledge.playerId);
    const color = player ? PARTY_COLORS[player.party.partyColor] : '#666';

    return (
      <div key={`pledge-${isOpponent ? 'opp' : 'my'}-${i}`}
        className={`glass-card p-2 ring-1 ${isOpponent ? 'ring-orange-700/30' : 'ring-game-border/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-white truncate">
              {player?.party.partyName ?? 'Unknown'}
            </span>
            {isOpponent && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-900/50 text-orange-400 border border-orange-700/50 flex-shrink-0">
                OPP
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold ${statusColors[pledge.status ?? 'pending']}`}>
            {statusIcons[pledge.status ?? 'pending']} {(pledge.status ?? 'pending').toUpperCase()}
          </span>
        </div>
        <div className="text-[10px] text-game-secondary mt-0.5">
          {pledge.direction === 'increase' ? '↑' : '↓'} {policy?.name ?? pledge.policyId}
          {pledge.regionId && <span className="ml-1 text-game-muted">(in {pledge.regionId})</span>}
        </div>
        {pledge.attackedBy && (
          <div className="text-[9px] text-red-400 mt-0.5">
            ⚔️ Attacked by {gameState.players.find(p => p.id === pledge.attackedBy)?.party.partyName ?? 'opposition'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold text-game-secondary uppercase tracking-wider flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Campaign Promises
      </h4>

      {/* Your promises */}
      {myPledges.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] text-game-muted uppercase tracking-wider">Your Promises</p>
          {myPledges.slice(-4).reverse().map((pledge, i) => renderPledge(pledge, i, false))}
        </div>
      )}

      {/* Opponent promises */}
      {opponentPledges.length > 0 && (
        <div className="space-y-1 mt-2">
          <p className="text-[9px] text-orange-400 uppercase tracking-wider">Opponent Promises</p>
          {opponentPledges.slice(-4).reverse().map((pledge, i) => renderPledge(pledge, i, true))}
        </div>
      )}
    </div>
  );
}
