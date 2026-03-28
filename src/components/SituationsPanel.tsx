'use client';

import { useGameStore } from '@/lib/store';
import { getSituationById } from '@/lib/engine/situations';

const severityColors = {
  mild: 'text-green-400 border-green-800',
  moderate: 'text-yellow-400 border-yellow-800',
  severe: 'text-orange-400 border-orange-800',
  critical: 'text-red-400 border-red-800',
};

export function SituationsPanel() {
  const { gameState } = useGameStore();
  if (!gameState || gameState.activeSituations.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Crises</h4>
      {gameState.activeSituations.map(activeSit => {
        const def = getSituationById(activeSit.id);
        if (!def) return null;

        return (
          <div
            key={activeSit.id}
            className={`p-2 rounded-lg border bg-slate-800/30 ${severityColors[def.severity]}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{def.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{def.name}</div>
                <div className="text-[10px] text-slate-500">
                  {def.severity.toUpperCase()} • {activeSit.turnsActive} turns
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
