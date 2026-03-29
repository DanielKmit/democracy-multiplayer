'use client';

import { useGameStore } from '@/lib/store';
import { getSituationById } from '@/lib/engine/situations';

const severityConfig = {
  mild: { color: '#22C55E', border: 'border-green-800/50', bg: 'bg-green-950/20' },
  moderate: { color: '#EAB308', border: 'border-yellow-800/50', bg: 'bg-yellow-950/20' },
  severe: { color: '#F97316', border: 'border-orange-800/50', bg: 'bg-orange-950/20' },
  critical: { color: '#EF4444', border: 'border-red-800/50', bg: 'bg-red-950/20' },
};

const newsTypeIcons: Record<string, string> = {
  bill: '📋', situation: '⚠️', dilemma: '⚖️', event: '📰',
  election: '🗳️', cabinet: '👔', general: '📢',
};

export function EventCards({ inline }: { inline?: boolean } = {}) {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  const hasContent = gameState.activeSituations.length > 0 || gameState.newsTicker.length > 0;
  if (!hasContent) return null;

  return (
    <div className={inline ? '' : 'w-72 border-r border-slate-700/50 bg-slate-900/50 overflow-y-auto flex-shrink-0'}>
      {/* Active Crises */}
      {gameState.activeSituations.length > 0 && (
        <div className="p-3">
          <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Active Crises
          </h3>
          <div className="space-y-2">
            {gameState.activeSituations.map(activeSit => {
              const def = getSituationById(activeSit.id);
              if (!def) return null;
              const config = severityConfig[def.severity];

              return (
                <div
                  key={activeSit.id}
                  className={`p-3 rounded-xl border ${config.border} ${config.bg} transition-all`}
                  style={{
                    boxShadow: def.severity === 'critical' ? `0 0 12px ${config.color}15` : undefined,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-lg ${def.severity === 'critical' ? 'animate-pulse' : ''}`}>
                      {def.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-200">{def.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        {def.description}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{
                          color: config.color,
                          backgroundColor: config.color + '15',
                        }}>
                          {def.severity}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {activeSit.turnsActive} turns
                        </span>
                      </div>
                      {/* Effects */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(def.effects).map(([key, val]) => (
                          <span key={key} className={`text-[9px] ${val > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {key}: {val > 0 ? '+' : ''}{val}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent News */}
      <div className="p-3">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Recent News
        </h3>
        <div className="space-y-1.5">
          {gameState.newsTicker.slice(0, 12).map(item => (
            <div
              key={item.id}
              className="p-2 bg-slate-800/30 rounded-lg border border-slate-700/30 text-xs"
            >
              <div className="flex items-start gap-1.5">
                <span className="text-sm flex-shrink-0">{newsTypeIcons[item.type] ?? '📢'}</span>
                <div className="min-w-0">
                  <p className="text-slate-300 leading-relaxed">{item.text}</p>
                  <span className="text-[9px] text-slate-600">Turn {item.turn}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
