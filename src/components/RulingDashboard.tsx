'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { POLICIES_BY_CATEGORY } from '@/lib/engine/policies';
import { PolicyCategory } from '@/lib/engine/types';

const categoryInfo: Record<PolicyCategory, { emoji: string; label: string }> = {
  economy: { emoji: '💰', label: 'Economy' },
  welfare: { emoji: '🏥', label: 'Welfare' },
  society: { emoji: '⚖️', label: 'Society' },
  environment: { emoji: '🌿', label: 'Environment' },
  security: { emoji: '🛡️', label: 'Security' },
  infrastructure: { emoji: '🏗️', label: 'Infrastructure' },
};

export function RulingDashboard() {
  const { gameState, playerId, pendingPolicyChanges, addPolicyChange, clearPolicyChanges, getPendingPolicyCost } = useGameStore();
  const { submitPolicyChanges, endTurnPhase } = useGameActions();
  const [activeCategory, setActiveCategory] = useState<PolicyCategory>('economy');

  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const pc = myPlayer?.politicalCapital ?? 0;
  const pendingCost = getPendingPolicyCost();
  const remainingPC = pc - pendingCost;

  const handleSliderChange = (policyId: string, newValue: number) => {
    const currentValue = gameState.policies[policyId];
    addPolicyChange({
      policyId,
      oldValue: currentValue,
      newValue,
      cost: Math.ceil(Math.abs(newValue - currentValue) / 10),
    });
  };

  const handleSubmit = () => {
    submitPolicyChanges(pendingPolicyChanges);
    clearPolicyChanges();
  };

  const handlePass = () => {
    endTurnPhase();
    clearPolicyChanges();
  };

  const categories = Object.keys(POLICIES_BY_CATEGORY) as PolicyCategory[];

  return (
    <div className="flex gap-4 h-full p-4">
      {/* Left: Category tabs */}
      <div className="w-44 flex-shrink-0 space-y-1">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Categories</h3>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
              activeCategory === cat
                ? 'bg-blue-600/20 text-blue-300 border border-blue-800'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
            }`}
          >
            {categoryInfo[cat].emoji} {categoryInfo[cat].label}
            <span className="text-xs text-slate-500 ml-1">
              ({POLICIES_BY_CATEGORY[cat].length})
            </span>
          </button>
        ))}

        {/* Submit / Pass */}
        <div className="mt-4 space-y-2 pt-4 border-t border-slate-700">
          <div className="text-center text-sm">
            <span className="text-slate-400">PC: </span>
            <span className={`font-bold ${remainingPC < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
              ⚡{remainingPC}/{pc}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={pendingPolicyChanges.length === 0 || remainingPC < 0}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-semibold transition-all"
          >
            Submit ({pendingCost} PC)
          </button>
          <button
            onClick={handlePass}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-all"
          >
            Pass Turn
          </button>
        </div>
      </div>

      {/* Center: Policy Sliders */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2">
          {categoryInfo[activeCategory].emoji} {categoryInfo[activeCategory].label} Policies
        </h2>

        {POLICIES_BY_CATEGORY[activeCategory]?.map(policy => {
          const currentValue = gameState.policies[policy.id];
          const pending = pendingPolicyChanges.find(c => c.policyId === policy.id);
          const displayValue = pending ? pending.newValue : currentValue;
          const isFilibustered = gameState.filibusteredPolicies.includes(policy.id);
          const changeCost = pending ? Math.ceil(Math.abs(pending.newValue - pending.oldValue) / 10) : 0;

          return (
            <div
              key={policy.id}
              className={`p-4 rounded-lg border ${
                isFilibustered
                  ? 'bg-red-900/20 border-red-800'
                  : pending
                  ? 'bg-blue-900/20 border-blue-800'
                  : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-medium text-sm">{policy.name}</span>
                  {isFilibustered && (
                    <span className="ml-2 text-xs bg-red-800 text-red-300 px-2 py-0.5 rounded">BLOCKED</span>
                  )}
                  {pending && changeCost > 0 && (
                    <span className="ml-2 text-xs bg-blue-800 text-blue-300 px-2 py-0.5 rounded">{changeCost} PC</span>
                  )}
                </div>
                <span className="text-lg font-bold text-slate-200">{displayValue}</span>
              </div>
              <p className="text-xs text-slate-500 mb-2">{policy.description}</p>
              <input
                type="range"
                min={0}
                max={100}
                value={displayValue}
                onChange={(e) => handleSliderChange(policy.id, parseInt(e.target.value))}
                disabled={isFilibustered || gameState.phase !== 'ruling'}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0</span>
                <span className="text-slate-600">|</span>
                <span>50</span>
                <span className="text-slate-600">|</span>
                <span>100</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
