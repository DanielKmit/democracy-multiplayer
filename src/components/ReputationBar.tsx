'use client';

import { useGameStore } from '@/lib/store';
import { PARTY_COLORS } from '@/lib/engine/types';

export function ReputationBar() {
  const { gameState } = useGameStore();

  if (!gameState || !gameState.gameSettings?.reputationEnabled) return null;
  if (!gameState.reputation) return null;

  return (
    <div className="glass-card p-3 mb-3">
      <h3 className="text-xs font-bold text-game-secondary uppercase tracking-wider mb-2">
        📊 Party Reputation
      </h3>
      <div className="space-y-2">
        {gameState.players.map(player => {
          const rep = gameState.reputation?.scores?.[player.id] ?? 60;
          const color = PARTY_COLORS[player.party.partyColor];
          const label = rep >= 80 ? 'Excellent' : rep >= 60 ? 'Good' : rep >= 40 ? 'Fair' : rep >= 20 ? 'Poor' : 'Terrible';
          const labelColor = rep >= 60 ? 'text-emerald-400' : rep >= 40 ? 'text-amber-400' : 'text-red-400';

          return (
            <div key={player.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-white font-bold">{player.party.partyName}</span>
                </div>
                <span className={`text-[10px] font-bold ${labelColor}`}>
                  {label} ({rep})
                </span>
              </div>
              <div className="w-full h-2 bg-game-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${rep}%`,
                    backgroundColor: rep >= 60 ? '#10B981' : rep >= 40 ? '#F59E0B' : '#EF4444',
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-game-muted mt-0.5">
                <span>
                  Promises: ✅{gameState.reputation?.promisesKept?.[player.id] ?? 0} / 💔{gameState.reputation?.promisesBroken?.[player.id] ?? 0}
                </span>
                <span>
                  Scandals: {gameState.reputation?.scandalCount?.[player.id] ?? 0}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
