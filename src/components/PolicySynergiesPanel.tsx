'use client';

import { useGameStore } from '@/lib/store';
import { POLICY_SYNERGIES } from '@/lib/engine/policySynergies';
import { SimVarKey } from '@/lib/engine/types';

const SIM_VAR_LABELS: Record<string, string> = {
  gdpGrowth: 'GDP',
  unemployment: 'Unemployment',
  inflation: 'Inflation',
  crime: 'Crime',
  pollution: 'Pollution',
  equality: 'Equality',
  healthIndex: 'Health',
  educationIndex: 'Education',
  freedomIndex: 'Freedom',
  nationalSecurity: 'Security',
  corruption: 'Corruption',
};

export function PolicySynergiesPanel() {
  const { gameState } = useGameStore();

  if (!gameState || !gameState.gameSettings?.policySynergiesEnabled) return null;

  const activeSynergies = gameState.activeSynergies ?? [];

  return (
    <div className="glass-card p-3 mb-3">
      <h3 className="text-xs font-bold text-game-secondary uppercase tracking-wider mb-2">
        ⚡ Policy Synergies
      </h3>

      {activeSynergies.length === 0 ? (
        <p className="text-[11px] text-game-muted">No active synergies. Combine policies to unlock bonus effects!</p>
      ) : (
        <div className="space-y-2">
          {activeSynergies.map(synergy => {
            const def = POLICY_SYNERGIES.find(s => s.id === synergy.synergyId);
            return (
              <div
                key={synergy.synergyId}
                className="p-2 rounded-lg border border-amber-500/30 bg-amber-950/10"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{synergy.icon}</span>
                  <span className="text-sm font-bold text-amber-300">{synergy.name}</span>
                </div>
                {def && (
                  <p className="text-[10px] text-game-secondary mb-1">{def.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {Object.entries(synergy.effects).map(([key, val]) => (
                    <span
                      key={key}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        (val as number) > 0
                          ? ['crime', 'pollution', 'unemployment', 'inflation', 'corruption'].includes(key)
                            ? 'bg-red-900/50 text-red-400'
                            : 'bg-emerald-900/50 text-emerald-400'
                          : ['crime', 'pollution', 'unemployment', 'inflation', 'corruption'].includes(key)
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {SIM_VAR_LABELS[key] ?? key}: {(val as number) > 0 ? '+' : ''}{val}
                    </span>
                  ))}
                  {synergy.approvalBonus !== 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      synergy.approvalBonus > 0 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                      Approval: {synergy.approvalBonus > 0 ? '+' : ''}{synergy.approvalBonus}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hint: show available synergies that are close to being activated */}
      {activeSynergies.length < 3 && (
        <div className="mt-2 pt-2 border-t border-game-border">
          <p className="text-[10px] text-game-muted mb-1">Available combos:</p>
          <div className="space-y-1">
            {POLICY_SYNERGIES.filter(s => !activeSynergies.find(a => a.synergyId === s.id))
              .slice(0, 3)
              .map(s => {
                const metCount = s.conditions.filter(c => {
                  const val = gameState.policies[c.policyId] ?? 50;
                  return c.comparison === 'above' ? val >= c.threshold : val <= c.threshold;
                }).length;
                const progress = Math.round((metCount / s.conditions.length) * 100);
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="text-xs">{s.icon}</span>
                    <span className="text-[10px] text-game-muted flex-1">{s.name}</span>
                    <div className="w-12 h-1.5 bg-game-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-game-muted">{metCount}/{s.conditions.length}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
