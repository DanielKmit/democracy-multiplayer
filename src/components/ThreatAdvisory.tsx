'use client';

import { useGameStore } from '@/lib/store';

const THREAT_LABELS = [
  { key: 'far_left' as const, label: 'Far-Left', icon: '🔴', drivers: ['High inequality', 'Low wages', 'High unemployment'] },
  { key: 'far_right' as const, label: 'Far-Right', icon: '🟤', drivers: ['High immigration', 'Low security', 'Cultural anxiety'] },
  { key: 'religious' as const, label: 'Religious', icon: '⛪', drivers: ['Low religious freedom', 'Social liberalism', 'Secularization'] },
  { key: 'eco' as const, label: 'Eco', icon: '🌿', drivers: ['High pollution', 'Low env regulations', 'Climate inaction'] },
];

export function ThreatAdvisory() {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  const { extremism } = gameState;
  const maxThreat = Math.max(extremism.far_left, extremism.far_right, extremism.religious, extremism.eco);
  const threatLevel = maxThreat > 80 ? 'CRITICAL' : maxThreat > 60 ? 'HIGH' : maxThreat > 40 ? 'ELEVATED' : 'LOW';
  const threatColor = maxThreat > 80 ? 'text-red-400' : maxThreat > 60 ? 'text-orange-400' : maxThreat > 40 ? 'text-amber-400' : 'text-emerald-400';
  const threatBg = maxThreat > 80 ? 'bg-red-950/10 border-red-800/20' : maxThreat > 60 ? 'bg-orange-950/10 border-orange-800/20' : '';

  return (
    <div className={`glass-card p-2.5 ${threatBg}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold text-game-muted uppercase tracking-wider">Threat Advisory</h4>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${threatColor} ${
          maxThreat > 60 ? 'bg-red-900/30 border border-red-800/30' : ''
        }`}>{threatLevel}</span>
      </div>
      <div className="space-y-2">
        {THREAT_LABELS.map(({ key, label, icon, drivers }) => {
          const level = extremism[key];
          const barColor = level > 80 ? '#EF4444' : level > 60 ? '#F97316' : level > 40 ? '#F59E0B' : '#10B981';
          return (
            <div key={key}>
              <div className="flex items-center gap-2">
                <span className="text-xs w-4">{icon}</span>
                <span className="text-[10px] text-game-secondary w-16">{label}</span>
                <div className="flex-1 h-1.5 progress-bar-track">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${level}%`, backgroundColor: barColor }} />
                </div>
                <span className="text-[10px] text-game-muted w-6 text-right font-mono">{Math.round(level)}</span>
              </div>
              {/* Show drivers when threat is high */}
              {level > 60 && (
                <div className="ml-6 mt-0.5 text-[9px] text-game-muted">
                  {drivers[0]}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {extremism.assassinationAttempted && (
        <div className={`mt-2 text-xs text-center glass-card p-1.5 ${
          extremism.assassinationSucceeded ? 'text-red-400 border-red-800/30' : 'text-amber-400 border-amber-800/30'
        }`}>
          {extremism.assassinationSucceeded ? '💀 LEADER ASSASSINATED!' : '🛡️ Assassination attempt foiled'}
        </div>
      )}
    </div>
  );
}
