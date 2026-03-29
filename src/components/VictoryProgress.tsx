'use client';

import { useGameStore } from '@/lib/store';
import { VICTORY_CONDITIONS } from '@/lib/engine/victoryConditions';
import { PARTY_COLORS } from '@/lib/engine/types';

export function VictoryProgress() {
  const { gameState, playerId } = useGameStore();

  if (!gameState) return null;

  const victoryType = gameState.gameSettings?.victoryCondition ?? 'electoral';
  const condition = VICTORY_CONDITIONS.find(vc => vc.type === victoryType);
  if (!condition) return null;

  return (
    <div className="glass-card p-3 mb-3">
      <h3 className="text-xs font-bold text-game-secondary uppercase tracking-wider mb-2">
        {condition.icon} Victory: {condition.name}
      </h3>
      <p className="text-[10px] text-game-muted mb-2">{condition.description}</p>

      <div className="space-y-2">
        {gameState.players.map(player => {
          const progress = condition.getProgress(gameState, player.id);
          const pct = Math.min(100, (progress.current / progress.required) * 100);
          const color = PARTY_COLORS[player.party.partyColor];
          const isMe = player.id === playerId;

          return (
            <div key={player.id} className={isMe ? 'ring-1 ring-game-accent/30 rounded p-1.5' : 'p-1.5'}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[11px] font-bold text-white">{player.party.partyName}</span>
                </div>
                <span className="text-[10px] text-game-secondary">
                  {progress.current}/{progress.required} {progress.label}
                </span>
              </div>
              <div className="w-full h-2 bg-game-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
