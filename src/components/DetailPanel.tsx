'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/lib/store';
import { POLICIES, POLICY_MAP } from '@/lib/engine/policies';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { SimVarKey, valueToPolicyLevel } from '@/lib/engine/types';

const SIM_VAR_LABELS: Record<string, string> = {
  gdpGrowth: 'GDP Growth', unemployment: 'Unemployment', inflation: 'Inflation',
  crime: 'Crime', pollution: 'Pollution', equality: 'Equality', healthIndex: 'Health',
  educationIndex: 'Education', freedomIndex: 'Freedom', nationalSecurity: 'Security', corruption: 'Corruption',
};

const CATEGORY_ICONS: Record<string, string> = {
  economy: '💰', welfare: '🏥', society: '⚖️', environment: '🌿', security: '🛡️', infrastructure: '🏗️',
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="h-6 w-full bg-game-card rounded" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200;
  const h = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function DetailPanel() {
  const { detailPanelNodeId, setDetailPanel, gameState } = useGameStore();

  const nodeData = useMemo(() => {
    if (!detailPanelNodeId || !gameState) return null;

    // Parse node type from ID prefix
    if (detailPanelNodeId.startsWith('pol_')) {
      const policyId = detailPanelNodeId.replace('pol_', '');
      const policy = POLICY_MAP.get(policyId);
      if (!policy) return null;
      const value = gameState.policies[policyId];
      const level = valueToPolicyLevel(value);
      // Find incoming: nothing (policies are sources)
      // Find outgoing: policy effects
      const outgoing = Object.entries(policy.effects).map(([key, val]) => ({
        target: SIM_VAR_LABELS[key] || key,
        value: val as number,
        positive: (key === 'crime' || key === 'pollution' || key === 'corruption' || key === 'unemployment' || key === 'inflation')
          ? (val as number) < 0 : (val as number) > 0,
      }));
      return {
        type: 'policy' as const, name: policy.name, icon: CATEGORY_ICONS[policy.category],
        description: policy.description, value, level, category: policy.category,
        incoming: [] as { source: string; value: number; positive: boolean }[],
        outgoing, budgetCost: policy.budgetCostPerPoint,
      };
    }

    if (detailPanelNodeId.startsWith('sim_')) {
      const simKey = detailPanelNodeId.replace('sim_', '') as SimVarKey;
      const value = gameState.simulation[simKey];
      // Incoming: policies that affect this
      const incoming = POLICIES.filter(p => p.effects[simKey]).map(p => ({
        source: p.name, value: p.effects[simKey]! * (gameState.policies[p.id] - 50),
        positive: (simKey === 'crime' || simKey === 'pollution' || simKey === 'corruption' || simKey === 'unemployment' || simKey === 'inflation')
          ? p.effects[simKey]! * (gameState.policies[p.id] - 50) < 0
          : p.effects[simKey]! * (gameState.policies[p.id] - 50) > 0,
      }));
      // Outgoing: voter groups that care about this
      const outgoing = VOTER_GROUPS.filter(g => g.concerns[simKey]).map(g => ({
        target: g.name, value: g.concerns[simKey]!, positive: g.concerns[simKey]! > 0,
      }));
      return {
        type: 'simvar' as const, name: SIM_VAR_LABELS[simKey] || simKey, icon: '📊',
        description: `Current simulation variable tracking ${(SIM_VAR_LABELS[simKey] || simKey).toLowerCase()}.`,
        value: Math.round(value * 10) / 10, incoming, outgoing,
      };
    }

    if (detailPanelNodeId.startsWith('voter_')) {
      const groupId = detailPanelNodeId.replace('voter_', '');
      const group = VOTER_GROUPS.find(g => g.id === groupId);
      if (!group) return null;
      // Get ruling party's satisfaction with this group, or average across parties
      const allPartySats = Object.values(gameState.voterSatisfaction).map(s => s[groupId] ?? 50);
      const satisfaction = allPartySats.length > 0
        ? Math.round(allPartySats.reduce((a, b) => a + b, 0) / allPartySats.length)
        : 50;
      const incoming = Object.entries(group.concerns).map(([simKey, weight]) => ({
        source: SIM_VAR_LABELS[simKey] || simKey, value: weight!,
        positive: weight! > 0,
      }));
      return {
        type: 'voter' as const, name: group.name, icon: '👥',
        description: `${(group.populationShare * 100).toFixed(0)}% of population`,
        satisfaction, populationShare: group.populationShare,
        concerns: group.concerns, policyPrefs: group.policyPreferences,
        incoming, outgoing: [] as { target: string; value: number; positive: boolean }[],
      };
    }

    if (detailPanelNodeId.startsWith('sit_')) {
      const sitId = detailPanelNodeId.replace('sit_', '');
      const activeSit = gameState.activeSituations.find(s => s.id === sitId);
      return {
        type: 'situation' as const, name: sitId.replace(/_/g, ' '),
        icon: '⚠️', description: 'Active crisis situation.',
        turnsActive: activeSit?.turnsActive ?? 0,
        incoming: [] as { source: string; value: number; positive: boolean }[],
        outgoing: [] as { target: string; value: number; positive: boolean }[],
      };
    }

    return null;
  }, [detailPanelNodeId, gameState]);

  if (!nodeData) return null;

  return (
    <div className="w-96 h-full border-l border-game-border bg-game-card/95 backdrop-blur-sm overflow-y-auto animate-slide-in-right flex-shrink-0">
      {/* Header */}
      <div className="sticky top-0 bg-game-card/95 border-b border-game-border p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">{nodeData.icon}</span>
          <h3 className="font-bold text-white">{nodeData.name}</h3>
        </div>
        <button
          onClick={() => setDetailPanel(null)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-game-border text-game-muted hover:text-white transition-all"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Description */}
        <p className="text-sm text-game-secondary">{nodeData.description}</p>

        {/* Current value */}
        {nodeData.type === 'policy' && (
          <div className="p-3 bg-game-card/50 rounded-lg border border-game-border">
            <div className="text-[10px] text-game-muted uppercase mb-1">Current Value</div>
            <div className="text-2xl font-bold text-white">
              {nodeData.value.toFixed(1)}
              <span className="text-sm ml-2 text-game-secondary">({nodeData.level})</span>
            </div>
          </div>
        )}
        {nodeData.type === 'simvar' && (
          <div className="p-3 bg-game-card/50 rounded-lg border border-game-border">
            <div className="text-[10px] text-game-muted uppercase mb-1">Current Value</div>
            <div className="text-2xl font-bold text-white">
              {nodeData.value.toFixed(1)}
            </div>
          </div>
        )}

        {/* Voter group specific */}
        {nodeData.type === 'voter' && (
          <div className="p-3 bg-game-card/50 rounded-lg border border-game-border">
            <div className="text-[10px] text-game-muted uppercase mb-1">Avg Satisfaction</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-3 bg-game-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${nodeData.satisfaction}%`,
                    backgroundColor: nodeData.satisfaction > 60 ? '#22C55E' : nodeData.satisfaction < 40 ? '#EF4444' : '#EAB308',
                  }}
                />
              </div>
              <span className="text-sm font-bold text-white">{nodeData.satisfaction}%</span>
            </div>
            <div className="text-xs text-game-muted mt-1">
              {(nodeData.populationShare * 100).toFixed(0)}% of population
            </div>
          </div>
        )}

        {/* Incoming effects */}
        {nodeData.incoming.length > 0 && (
          <div>
            <div className="text-[10px] text-game-muted uppercase mb-2">Incoming Effects</div>
            <div className="space-y-1">
              {nodeData.incoming.slice(0, 10).map((eff, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2 bg-game-card/30 rounded">
                  <span className="text-game-secondary">{eff.source}</span>
                  <span className={eff.positive ? 'text-green-400' : 'text-red-400'}>
                    {eff.value > 0 ? '+' : ''}{typeof eff.value === 'number' ? eff.value.toFixed(2) : eff.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing effects */}
        {nodeData.outgoing.length > 0 && (
          <div>
            <div className="text-[10px] text-game-muted uppercase mb-2">Outgoing Effects</div>
            <div className="space-y-1">
              {nodeData.outgoing.slice(0, 10).map((eff, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2 bg-game-card/30 rounded">
                  <span className="text-game-secondary">{eff.target}</span>
                  <span className={eff.positive ? 'text-green-400' : 'text-red-400'}>
                    {eff.value > 0 ? '+' : ''}{typeof eff.value === 'number' ? eff.value.toFixed(2) : eff.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Policy preferences for voter groups */}
        {nodeData.type === 'voter' && nodeData.policyPrefs && (
          <div>
            <div className="text-[10px] text-game-muted uppercase mb-2">Policy Preferences</div>
            <div className="space-y-1">
              {Object.entries(nodeData.policyPrefs).slice(0, 8).map(([pId, ideal]) => {
                const policy = POLICY_MAP.get(pId);
                return (
                  <div key={pId} className="flex items-center justify-between text-xs py-1 px-2 bg-game-card/30 rounded">
                    <span className="text-game-secondary">{policy?.name ?? pId}</span>
                    <span className="text-white">{ideal}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Budget cost for policies */}
        {nodeData.type === 'policy' && (
          <div className="p-3 bg-game-card/50 rounded-lg border border-game-border">
            <div className="text-[10px] text-game-muted uppercase mb-1">Budget Impact</div>
            <span className={`text-sm font-bold ${nodeData.budgetCost < 0 ? 'text-green-400' : 'text-red-400'}`}>
              {nodeData.budgetCost < 0 ? 'Revenue' : 'Cost'}: {Math.abs(nodeData.budgetCost).toFixed(1)} per point
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
