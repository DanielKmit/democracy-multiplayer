'use client';

import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { Scandal, PARTY_COLORS } from '@/lib/engine/types';

export function ScandalPanel() {
  const { gameState, playerId } = useGameStore();
  const { spinScandal } = useGameActions();

  if (!gameState || !gameState.gameSettings?.scandalsEnabled) return null;
  if (!gameState.activeScandals || gameState.activeScandals.length === 0) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const isRuling = myPlayer?.role === 'ruling';

  const scandalTypeColors: Record<string, string> = {
    corruption: '#EF4444',
    personal: '#F59E0B',
    policy: '#8B5CF6',
  };

  const scandalTypeIcons: Record<string, string> = {
    corruption: '💰',
    personal: '🗞️',
    policy: '📋',
  };

  return (
    <div className="glass-card p-3 mb-3">
      <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
        🔥 Active Scandals ({gameState.activeScandals.length})
      </h3>
      <div className="space-y-2">
        {gameState.activeScandals.map((scandal: Scandal) => {
          const isMyScandal = scandal.targetPlayerId === playerId;
          const targetPlayer = gameState.players.find(p => p.id === scandal.targetPlayerId);
          const targetName = targetPlayer?.party.partyName ?? 'Unknown';

          return (
            <div
              key={scandal.id}
              className={`p-2 rounded-lg border ${
                isMyScandal ? 'border-red-500/50 bg-red-950/20' : 'border-game-border bg-game-bg/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{scandalTypeIcons[scandal.type]}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                  style={{ backgroundColor: scandalTypeColors[scandal.type] + '30', color: scandalTypeColors[scandal.type] }}
                >
                  {scandal.type}
                </span>
                <span className="text-xs font-bold text-white flex-1">{scandal.title}</span>
                {scandal.spun && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-blue-900/50 text-blue-400">SPUN</span>
                )}
              </div>
              <p className="text-[11px] text-game-secondary mb-1">{scandal.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-game-muted">
                    Affects: <span style={{ color: PARTY_COLORS[targetPlayer?.party.partyColor ?? 'red'] }}>{targetName}</span>
                  </span>
                  <span className="text-[10px] text-game-muted">
                    Severity: {'🔴'.repeat(Math.min(5, Math.ceil(scandal.severity / 2)))}
                  </span>
                  <span className="text-[10px] text-game-muted">
                    {scandal.turnsRemaining}t left
                  </span>
                </div>
                {isRuling && isMyScandal && !scandal.spun && gameState.phase === 'ruling' && (
                  <button
                    onClick={() => spinScandal(scandal.id)}
                    className="text-[10px] px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    title="Costs 2 PC — reduces scandal impact by 50%"
                  >
                    🔄 Spin (2 PC)
                  </button>
                )}
              </div>
              {scandal.planted && (
                <div className="text-[10px] text-amber-400 mt-1">
                  ⚠️ Planted evidence {scandal.sourcePlayerId === playerId ? '(by you)' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
