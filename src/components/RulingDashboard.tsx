'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { POLICIES_BY_CATEGORY } from '@/lib/engine/policies';
import { VOTER_GROUPS } from '@/lib/engine/voters';
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
    const socket = getSocket();
    socket.emit('submitPolicyChanges', pendingPolicyChanges);
    clearPolicyChanges();
  };

  const handlePass = () => {
    const socket = getSocket();
    socket.emit('endTurnPhase');
    clearPolicyChanges();
  };

  const categories = Object.keys(POLICIES_BY_CATEGORY) as PolicyCategory[];

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Category tabs */}
      <div className="w-48 flex-shrink-0 space-y-1">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Policy Categories</h3>
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

        {/* Budget Summary */}
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Budget</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Revenue</span>
              <span className="text-green-400">{gameState.budget.revenue.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Spending</span>
              <span className="text-red-400">{gameState.budget.spending.toFixed(0)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-1">
              <span className="text-slate-400">Deficit</span>
              <span className={gameState.budget.deficit > 0 ? 'text-red-400' : 'text-green-400'}>
                {gameState.budget.deficit > 0 ? '-' : '+'}{Math.abs(gameState.budget.deficit).toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit / Pass */}
        <div className="mt-4 space-y-2">
          <button
            onClick={handleSubmit}
            disabled={pendingPolicyChanges.length === 0}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-semibold transition-all"
          >
            Submit Changes ({pendingCost} PC)
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
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">
            {categoryInfo[activeCategory].emoji} {categoryInfo[activeCategory].label} Policies
          </h2>
          <div className="text-sm">
            <span className="text-slate-400">Political Capital: </span>
            <span className={`font-bold ${remainingPC < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
              ⚡{remainingPC}/{pc}
            </span>
          </div>
        </div>

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

      {/* Right: Voter Satisfaction */}
      <div className="w-64 flex-shrink-0">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Voter Satisfaction</h3>
        <div className="space-y-3">
          {VOTER_GROUPS.map(group => {
            const satisfaction = gameState.voterSatisfaction[group.id] ?? 50;
            const isLocked = gameState.activeEffects.some(
              e => e.type === 'coalition' && e.data.groupId === group.id
            );

            return (
              <div key={group.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-300">
                    {group.name}
                    {isLocked && <span className="ml-1 text-red-400 text-xs">🔒</span>}
                  </span>
                  <span className={`font-medium ${
                    satisfaction > 60 ? 'text-green-400' : satisfaction < 40 ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {satisfaction}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`satisfaction-bar h-full rounded-full ${
                      satisfaction > 60 ? 'bg-green-500' : satisfaction < 40 ? 'bg-red-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${satisfaction}%` }}
                  />
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {(group.populationShare * 100).toFixed(0)}% of voters
                </div>
              </div>
            );
          })}
        </div>

        {/* Simulation Stats */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Key Statistics</h3>
          <div className="space-y-2 text-sm">
            <StatRow label="Crime" value={gameState.simulation.crime} inverse />
            <StatRow label="Pollution" value={gameState.simulation.pollution} inverse />
            <StatRow label="Equality" value={gameState.simulation.equality} />
            <StatRow label="Health" value={gameState.simulation.healthIndex} />
            <StatRow label="Education" value={gameState.simulation.educationIndex} />
            <StatRow label="Freedom" value={gameState.simulation.freedomIndex} />
            <StatRow label="Security" value={gameState.simulation.nationalSecurity} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const good = inverse ? value < 40 : value > 60;
  const bad = inverse ? value > 60 : value < 40;

  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-medium ${good ? 'text-green-400' : bad ? 'text-red-400' : 'text-yellow-400'}`}>
        {value.toFixed(0)}
      </span>
    </div>
  );
}
