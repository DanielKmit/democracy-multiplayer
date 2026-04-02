'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { PolicyDefinition, POLICY_LEVELS, PolicyLevel, valueToPolicyLevel, policyLevelToValue, SimVarKey } from '@/lib/engine/types';

const SIM_VAR_LABELS: Record<string, string> = {
  gdpGrowth: 'GDP Growth', unemployment: 'Unemployment', inflation: 'Inflation',
  crime: 'Crime', pollution: 'Pollution', equality: 'Equality', healthIndex: 'Health',
  educationIndex: 'Education', freedomIndex: 'Freedom', nationalSecurity: 'Security', corruption: 'Corruption',
};

const CATEGORY_ICONS: Record<string, string> = {
  economy: '💰', welfare: '🏥', society: '⚖️', environment: '🌿', security: '🛡️', infrastructure: '🏗️',
};

const LEVEL_COLORS: Record<PolicyLevel, string> = {
  Off: '#64748b', Low: '#3B82F6', Medium: '#8B5CF6', High: '#F59E0B', Maximum: '#EF4444',
};

interface PolicyCardProps {
  policy: PolicyDefinition;
  currentValue: number;
  disabled?: boolean;
  isFilibustered?: boolean;
  onConfirmChange?: (policyId: string, newValue: number, cost: number) => void;
}

export function PolicyCard({ policy, currentValue, disabled, isFilibustered, onConfirmChange }: PolicyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<PolicyLevel>(valueToPolicyLevel(currentValue));

  const currentLevel = valueToPolicyLevel(currentValue);
  const currentLevelIndex = POLICY_LEVELS.indexOf(currentLevel);
  const selectedLevelIndex = POLICY_LEVELS.indexOf(selectedLevel);
  const stepDiff = Math.abs(selectedLevelIndex - currentLevelIndex);
  const changeCost = stepDiff; // 1 PC per step

  const handleConfirm = () => {
    if (onConfirmChange && stepDiff > 0) {
      onConfirmChange(policy.id, policyLevelToValue(selectedLevel), changeCost);
      setExpanded(false);
    }
  };

  const effectEntries = Object.entries(policy.effects) as [SimVarKey, number][];

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isFilibustered
          ? 'bg-red-950/30 border-red-800/50'
          : expanded
          ? 'bg-game-card border-blue-700/50 shadow-lg shadow-blue-900/20'
          : 'bg-game-card/60 border-game-border hover:border-game-border cursor-pointer'
      }`}
      onClick={() => !expanded && !disabled && setExpanded(true)}
    >
      {/* Compact view */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">{CATEGORY_ICONS[policy.category]}</span>
            <span className="font-medium text-sm text-white">{policy.name}</span>
            {isFilibustered && (
              <span className="text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded-full border border-red-800/50">BLOCKED</span>
            )}
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
            backgroundColor: LEVEL_COLORS[currentLevel] + '20',
            color: LEVEL_COLORS[currentLevel],
            border: `1px solid ${LEVEL_COLORS[currentLevel]}40`,
          }}>
            {currentLevel}
          </span>
        </div>

        {/* Level segments */}
        <div className="flex gap-1 mb-2">
          {POLICY_LEVELS.map((level, i) => (
            <div
              key={level}
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{
                backgroundColor: i <= currentLevelIndex
                  ? LEVEL_COLORS[currentLevel]
                  : '#1e293b',
                opacity: i <= currentLevelIndex ? 0.8 : 0.3,
              }}
            />
          ))}
        </div>

        {/* Effects preview */}
        <div className="flex flex-wrap gap-1.5">
          {effectEntries.slice(0, 3).map(([key, val]) => {
            const isGood = (key === 'crime' || key === 'pollution' || key === 'corruption' || key === 'unemployment' || key === 'inflation')
              ? val < 0 : val > 0;
            const strength = Math.abs(val) > 0.04 ? '↑↑' : '↑';
            return (
              <span key={key} className={`text-[10px] ${isGood ? 'text-green-400' : 'text-red-400'}`}>
                {SIM_VAR_LABELS[key]} {isGood ? strength : (Math.abs(val) > 0.04 ? '↓↓' : '↓')}
              </span>
            );
          })}
        </div>
      </div>

      {/* Expanded detail view */}
      {expanded && (
        <div className="border-t border-game-border p-3 animate-fade-in">
          <p className="text-xs text-game-secondary mb-3">{policy.description}</p>

          {/* Stepped level selector */}
          <div className="mb-3">
            <div className="text-[10px] text-game-muted uppercase mb-1.5">Implementation Level</div>
            <div className="flex gap-1">
              {POLICY_LEVELS.map((level) => {
                const isSelected = level === selectedLevel;
                const isCurrent = level === currentLevel;
                return (
                  <button
                    key={level}
                    onClick={(e) => { e.stopPropagation(); !disabled && setSelectedLevel(level); }}
                    disabled={disabled || isFilibustered}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                      isSelected
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                        : isCurrent
                        ? 'bg-game-border/50 border-game-border text-white'
                        : 'bg-game-card/50 border-game-border text-game-muted hover:border-game-border'
                    }`}
                  >
                    {level}
                    {isCurrent && !isSelected && <span className="block text-[8px] text-game-muted">current</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full effects list */}
          <div className="mb-3">
            <div className="text-[10px] text-game-muted uppercase mb-1">Effects</div>
            <div className="space-y-1">
              {effectEntries.map(([key, val]) => {
                const isGood = (key === 'crime' || key === 'pollution' || key === 'corruption' || key === 'unemployment' || key === 'inflation')
                  ? val < 0 : val > 0;
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-game-secondary">{SIM_VAR_LABELS[key]}</span>
                    <span className={isGood ? 'text-green-400' : 'text-red-400'}>
                      {val > 0 ? '+' : ''}{(val * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cost + Confirm */}
          {stepDiff > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-yellow-400">⚡ {changeCost} PC</span>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedLevel(currentLevel); setExpanded(false); }}
                  className="px-3 py-1.5 text-xs bg-game-border hover:bg-game-muted/30 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
                  disabled={disabled || isFilibustered}
                  className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-game-border rounded-lg font-medium transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
          {stepDiff === 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              className="w-full py-1.5 text-xs text-game-muted hover:text-white transition-all"
            >
              Close
            </button>
          )}
        </div>
      )}
    </div>
  );
}
