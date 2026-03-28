'use client';

import { useGameStore } from '@/lib/store';

const THREAT_LABELS = [
  { key: 'far_left' as const, label: 'Far-Left', icon: '🔴', color: '#EF4444' },
  { key: 'far_right' as const, label: 'Far-Right', icon: '🟤', color: '#92400E' },
  { key: 'religious' as const, label: 'Religious', icon: '⛪', color: '#A855F7' },
  { key: 'eco' as const, label: 'Eco', icon: '🌿', color: '#22C55E' },
];

export function ThreatAdvisory() {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  const { extremism } = gameState;
  const maxThreat = Math.max(extremism.far_left, extremism.far_right, extremism.religious, extremism.eco);
  const threatLevel = maxThreat > 80 ? 'CRITICAL' : maxThreat > 60 ? 'HIGH' : maxThreat > 40 ? 'ELEVATED' : 'LOW';
  const threatColor = maxThreat > 80 ? 'text-red-400' : maxThreat > 60 ? 'text-orange-400' : maxThreat > 40 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase">Threat Advisory</h4>
        <span className={`text-[10px] font-bold ${threatColor}`}>{threatLevel}</span>
      </div>
      <div className="space-y-1.5">
        {THREAT_LABELS.map(({ key, label, icon, color }) => {
          const level = extremism[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs w-4">{icon}</span>
              <span className="text-[10px] text-slate-500 w-16">{label}</span>
              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${level}%`,
                    backgroundColor: level > 80 ? '#EF4444' : level > 60 ? '#F97316' : level > 40 ? '#EAB308' : '#22C55E',
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-500 w-6 text-right">{Math.round(level)}</span>
            </div>
          );
        })}
      </div>
      {extremism.assassinationAttempted && (
        <div className={`mt-2 text-xs text-center ${extremism.assassinationSucceeded ? 'text-red-400' : 'text-yellow-400'}`}>
          {extremism.assassinationSucceeded ? '💀 ASSASSINATION!' : '🛡️ Attempt foiled!'}
        </div>
      )}
    </div>
  );
}
