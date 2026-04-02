'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { POLICIES } from '@/lib/engine/policies';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { OppositionAction, OppositionActionType, SimVarKey } from '@/lib/engine/types';

const ACTION_DEFS: {
  type: OppositionActionType;
  name: string;
  cost: number;
  description: string;
  emoji: string;
  needsTarget: 'policy' | 'group' | 'simvar' | 'policy_value' | 'none';
}[] = [
  { type: 'filibuster', name: 'Filibuster', cost: 2, description: 'Block ONE policy change next turn', emoji: '🚫', needsTarget: 'policy' },
  { type: 'campaign', name: 'Campaign', cost: 1, description: 'Target a voter group: +5% support', emoji: '📢', needsTarget: 'group' },
  { type: 'propose_alternative', name: 'Propose Alternative', cost: 2, description: 'If popular, ruling loses 3% approval', emoji: '📋', needsTarget: 'policy_value' },
  { type: 'media_attack', name: 'Media Attack', cost: 1, description: 'Amplify a negative stat for 2 turns', emoji: '📺', needsTarget: 'simvar' },
  { type: 'coalition_building', name: 'Coalition Building', cost: 3, description: 'Lock a voter group for 4 turns', emoji: '🤝', needsTarget: 'group' },
  { type: 'vote_of_no_confidence', name: 'No Confidence Vote', cost: 5, description: 'If approval < 25%, snap election', emoji: '⚡', needsTarget: 'none' },
];

const SIM_VARS: { key: SimVarKey; label: string }[] = [
  { key: 'unemployment', label: 'Unemployment' },
  { key: 'crime', label: 'Crime' },
  { key: 'pollution', label: 'Pollution' },
  { key: 'inflation', label: 'Inflation' },
];

export function OppositionDashboard() {
  const { gameState, playerId, pendingOppositionActions, addOppositionAction, removeOppositionAction, clearOppositionActions, getPendingOppositionCost } = useGameStore();
  const { submitOppositionActions, endTurnPhase } = useGameActions();
  const [selectedAction, setSelectedAction] = useState<typeof ACTION_DEFS[0] | null>(null);
  const [targetPolicy, setTargetPolicy] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [targetSimVar, setTargetSimVar] = useState<SimVarKey>('unemployment');
  const [proposedValue, setProposedValue] = useState(50);

  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const pc = myPlayer?.politicalCapital ?? 0;
  const pendingCost = getPendingOppositionCost();
  const remainingPC = pc - pendingCost;

  const handleAddAction = () => {
    if (!selectedAction) return;
    const action: OppositionAction = { type: selectedAction.type, cost: selectedAction.cost };
    if (selectedAction.needsTarget === 'policy' && targetPolicy) action.targetPolicyId = targetPolicy;
    if (selectedAction.needsTarget === 'group' && targetGroup) action.targetGroupId = targetGroup;
    if (selectedAction.needsTarget === 'simvar') action.targetSimVar = targetSimVar;
    if (selectedAction.needsTarget === 'policy_value' && targetPolicy) {
      action.proposedPolicyId = targetPolicy;
      action.proposedValue = proposedValue;
    }
    addOppositionAction(action);
    setSelectedAction(null);
    setTargetPolicy('');
    setTargetGroup('');
  };

  const handleSubmit = () => { submitOppositionActions(pendingOppositionActions); clearOppositionActions(); };
  const handlePass = () => { endTurnPhase(); clearOppositionActions(); };

  return (
    <div className="flex gap-4 h-full p-4">
      {/* Left: Action Cards */}
      <div className="w-64 flex-shrink-0 space-y-2">
        <h3 className="text-xs font-semibold text-game-muted uppercase tracking-wider mb-2">Actions</h3>
        {ACTION_DEFS.map(action => {
          const canAfford = remainingPC >= action.cost;
          return (
            <button
              key={action.type}
              onClick={() => canAfford && setSelectedAction(action)}
              disabled={!canAfford}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedAction?.type === action.type
                  ? 'bg-red-900/30 border-red-700'
                  : canAfford
                  ? 'bg-game-card/50 border-game-border hover:border-red-700'
                  : 'bg-game-card/20 border-game-border opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium text-sm">{action.emoji} {action.name}</span>
                <span className="text-xs bg-game-border px-2 py-0.5 rounded text-yellow-400">{action.cost}</span>
              </div>
              <p className="text-xs text-game-muted">{action.description}</p>
            </button>
          );
        })}

        <div className="mt-4 space-y-2 pt-4 border-t border-game-border">
          <div className="text-center text-sm">
            <span className="text-game-secondary">PC: </span>
            <span className={`font-bold ${remainingPC < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
              ⚡{remainingPC}/{pc}
            </span>
          </div>
          <button onClick={handleSubmit} disabled={pendingOppositionActions.length === 0}
            className="w-full py-2 bg-red-600 hover:bg-red-500 disabled:bg-game-border disabled:text-game-muted rounded-lg text-sm font-semibold transition-all">
            Execute ({pendingCost} PC)
          </button>
          <button onClick={handlePass} className="w-full py-2 bg-game-border hover:bg-game-muted/30 rounded-lg text-sm text-white transition-all">
            Pass Turn
          </button>
        </div>
      </div>

      {/* Center: Config + Queue */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {selectedAction && (
          <div className="p-4 bg-game-card/50 border border-red-800 rounded-lg animate-fade-in">
            <h4 className="font-medium mb-3">{selectedAction.emoji} {selectedAction.name}</h4>
            {selectedAction.needsTarget === 'policy' && (
              <select value={targetPolicy} onChange={(e) => setTargetPolicy(e.target.value)}
                className="w-full p-2 bg-game-border border border-game-border rounded text-sm">
                <option value="">Select policy...</option>
                {POLICIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {selectedAction.needsTarget === 'group' && (
              <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}
                className="w-full p-2 bg-game-border border border-game-border rounded text-sm">
                <option value="">Select group...</option>
                {VOTER_GROUPS.map(g => <option key={g.id} value={g.id}>{g.name} ({(g.populationShare * 100).toFixed(0)}%)</option>)}
              </select>
            )}
            {selectedAction.needsTarget === 'simvar' && (
              <select value={targetSimVar} onChange={(e) => setTargetSimVar(e.target.value as SimVarKey)}
                className="w-full p-2 bg-game-border border border-game-border rounded text-sm">
                {SIM_VARS.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
              </select>
            )}
            {selectedAction.needsTarget === 'policy_value' && (
              <div className="space-y-2">
                <select value={targetPolicy} onChange={(e) => setTargetPolicy(e.target.value)}
                  className="w-full p-2 bg-game-border border border-game-border rounded text-sm">
                  <option value="">Select policy...</option>
                  {POLICIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div>
                  <label className="text-sm text-game-secondary">Proposed: {proposedValue}</label>
                  <input type="range" min={0} max={100} value={proposedValue}
                    onChange={(e) => setProposedValue(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
            )}
            <button onClick={handleAddAction}
              disabled={(selectedAction.needsTarget === 'policy' && !targetPolicy) || (selectedAction.needsTarget === 'group' && !targetGroup) || (selectedAction.needsTarget === 'policy_value' && !targetPolicy)}
              className="mt-3 w-full py-2 bg-red-600 hover:bg-red-500 disabled:bg-game-border rounded text-sm font-medium transition-all">
              Add to Queue
            </button>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-game-muted uppercase tracking-wider mb-2">Queue</h3>
          {pendingOppositionActions.length === 0 ? (
            <div className="p-8 text-center text-game-muted border border-dashed border-game-border rounded-lg">
              Select actions to build your strategy
            </div>
          ) : (
            <div className="space-y-2">
              {pendingOppositionActions.map((action, i) => {
                const def = ACTION_DEFS.find(a => a.type === action.type);
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-game-card/50 border border-game-border rounded-lg">
                    <div>
                      <span className="text-sm font-medium">{def?.emoji} {def?.name}</span>
                      {action.targetGroupId && <span className="text-xs text-game-secondary ml-2">→ {VOTER_GROUPS.find(g => g.id === action.targetGroupId)?.name}</span>}
                      {action.targetPolicyId && <span className="text-xs text-game-secondary ml-2">→ {POLICIES.find(p => p.id === action.targetPolicyId)?.name}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-yellow-400">{action.cost} PC</span>
                      <button onClick={() => removeOppositionAction(i)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
