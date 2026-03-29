'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { POLICIES, POLICIES_BY_CATEGORY } from '@/lib/engine/policies';
import { PolicyCard } from './PolicyCard';
import { PolicyWeb } from './PolicyWeb';
import { NovariMap } from './NovariMap';
import { PolicyCategory, PolicyChange, policyLevelToValue, valueToPolicyLevel } from '@/lib/engine/types';

const CATEGORY_LABELS: Record<PolicyCategory, { label: string; icon: string }> = {
  economy: { label: 'Economy', icon: '💰' },
  welfare: { label: 'Welfare', icon: '🏥' },
  society: { label: 'Society', icon: '⚖️' },
  environment: { label: 'Environment', icon: '🌿' },
  security: { label: 'Security', icon: '🛡️' },
  infrastructure: { label: 'Infrastructure', icon: '🏗️' },
};

type RulingView = 'web' | 'map' | 'policies';

export function RulingDashboard() {
  const { gameState, playerId, pendingPolicyChanges, addPolicyChange, clearPolicyChanges, getPendingPolicyCost, setCenterView, centerView } = useGameStore();
  const { submitPolicyChanges, endTurnPhase } = useGameActions();
  const [activeCategory, setActiveCategory] = useState<PolicyCategory>('economy');
  const [view, setView] = useState<RulingView>('policies');

  if (!gameState) return null;
  const myPlayer = gameState.players.find(p => p.id === playerId);
  const pc = myPlayer?.politicalCapital ?? 0;
  const pendingCost = getPendingPolicyCost();
  const remainingPC = pc - pendingCost;

  const handleConfirmChange = (policyId: string, newValue: number, cost: number) => {
    const currentValue = gameState.policies[policyId];
    addPolicyChange({ policyId, oldValue: currentValue, newValue, cost });
  };

  const handleSubmit = () => {
    submitPolicyChanges(pendingPolicyChanges);
    clearPolicyChanges();
  };

  const handlePass = () => {
    endTurnPhase();
    clearPolicyChanges();
  };

  const currentPolicies = POLICIES_BY_CATEGORY[activeCategory] ?? [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar: Policies / Web / Map */}
      <div className="flex items-center justify-between p-2 border-b border-slate-800/50 bg-slate-900/30">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('policies')}
            className={`px-3 py-1 rounded text-xs transition-all ${view === 'policies' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            📋 Policies
          </button>
          <button onClick={() => setView('web')}
            className={`px-3 py-1 rounded text-xs transition-all ${view === 'web' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            🕸️ Web
          </button>
          <button onClick={() => setView('map')}
            className={`px-3 py-1 rounded text-xs transition-all ${view === 'map' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            🗺️ Map
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            PC: <span className={`font-bold ${remainingPC >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
              {remainingPC}
            </span>
            {pendingCost > 0 && <span className="text-slate-600">/{pc}</span>}
          </span>
          {pendingPolicyChanges.length > 0 && (
            <span className="text-xs text-blue-400">{pendingPolicyChanges.length} changes</span>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {view === 'web' && <PolicyWeb />}
        {view === 'map' && <NovariMap />}
        {view === 'policies' && (
          <div className="flex h-full">
            {/* Category sidebar */}
            <div className="w-36 border-r border-slate-800/50 bg-slate-900/30 p-1.5 space-y-0.5 flex-shrink-0">
              {(Object.keys(CATEGORY_LABELS) as PolicyCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-2 py-2 rounded-lg text-xs transition-all ${
                    activeCategory === cat
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-700/30'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  {CATEGORY_LABELS[cat].icon} {CATEGORY_LABELS[cat].label}
                  <span className="text-[9px] text-slate-600 block">{POLICIES_BY_CATEGORY[cat].length} policies</span>
                </button>
              ))}
            </div>

            {/* Policy cards grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {currentPolicies.map(policy => (
                  <PolicyCard
                    key={policy.id}
                    policy={policy}
                    currentValue={gameState.policies[policy.id]}
                    disabled={remainingPC <= 0 && !pendingPolicyChanges.some(c => c.policyId === policy.id)}
                    isFilibustered={gameState.filibusteredPolicies.includes(policy.id)}
                    onConfirmChange={handleConfirmChange}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar — pending changes & submit */}
      <div className="border-t border-slate-800/50 bg-slate-900/50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {pendingPolicyChanges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pendingPolicyChanges.map(change => {
                  const policy = POLICIES.find(p => p.id === change.policyId);
                  const oldLevel = valueToPolicyLevel(change.oldValue);
                  const newLevel = valueToPolicyLevel(change.newValue);
                  return (
                    <span key={change.policyId} className="text-xs bg-blue-900/30 border border-blue-700/30 text-blue-300 px-2 py-1 rounded-lg">
                      {policy?.name}: {oldLevel} → {newLevel} ({change.cost} PC)
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-slate-500">No changes queued — adjust policies or pass</span>
            )}
          </div>

          <div className="flex gap-2 ml-4 flex-shrink-0">
            {pendingPolicyChanges.length > 0 && (
              <button onClick={() => clearPolicyChanges()}
                className="px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-all">
                Clear
              </button>
            )}
            <button onClick={handleSubmit}
              disabled={pendingPolicyChanges.length === 0}
              className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-medium transition-all">
              Submit ({pendingCost} PC)
            </button>
            <button onClick={handlePass}
              className="px-4 py-2 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg transition-all">
              Pass Turn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
