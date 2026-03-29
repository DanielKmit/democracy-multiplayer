'use client';

import { useGameStore } from '@/lib/store';
import { POLICY_MAP } from '@/lib/engine/policies';
import { PARTY_COLORS } from '@/lib/engine/types';

export function PromisesPanel() {
  const { gameState } = useGameStore();
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

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold text-game-secondary uppercase tracking-wider flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Campaign Promises
      </h4>
      <div className="space-y-1">
        {pledges.slice(-8).reverse().map((pledge, i) => {
          const policy = POLICY_MAP.get(pledge.policyId);
          const player = gameState.players.find(p => p.id === pledge.playerId);
          const color = player ? PARTY_COLORS[player.party.partyColor] : '#666';

          return (
            <div key={`pledge-${i}`} className="glass-card p-2 ring-1 ring-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-300">
                    {player?.party.partyName ?? 'Unknown'}
                  </span>
                </div>
                <span className={`text-[10px] font-bold ${statusColors[pledge.status ?? 'pending']}`}>
                  {statusIcons[pledge.status ?? 'pending']} {(pledge.status ?? 'pending').toUpperCase()}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {pledge.direction === 'increase' ? '↑' : '↓'} {policy?.name ?? pledge.policyId}
                {pledge.regionId && <span className="ml-1 text-slate-500">(in {pledge.regionId})</span>}
              </div>
              {pledge.attackedBy && (
                <div className="text-[9px] text-red-400 mt-0.5">
                  ⚔️ Attacked by {gameState.players.find(p => p.id === pledge.attackedBy)?.party.partyName ?? 'opposition'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
