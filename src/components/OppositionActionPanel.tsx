'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { POLICIES } from '@/lib/engine/policies';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { REGIONS } from '@/lib/engine/regions';
import { OppositionAction, OppositionActionType, SimVarKey, GameState } from '@/lib/engine/types';

interface ActionDef {
  type: OppositionActionType;
  name: string;
  cost: number;
  description: string;
  emoji: string;
  category: 'parliamentary' | 'public' | 'blocking' | 'campaign';
  needsTarget: 'policy' | 'group' | 'simvar' | 'region' | 'policy_value' | 'none';
  condition?: (gs: GameState) => boolean;
  conditionLabel?: string;
}

const ACTION_DEFS: ActionDef[] = [
  // Parliamentary
  { type: 'question_time', name: 'Question Time', cost: 0, emoji: '🎤', category: 'parliamentary',
    description: 'Grill the PM on a topic. Free, 1x per turn. Bad stats = approval hit.',
    needsTarget: 'simvar', condition: (gs) => !gs.questionTimeUsed, conditionLabel: 'Once per turn' },
  { type: 'table_motion', name: 'Table Motion', cost: 1, emoji: '📋', category: 'parliamentary',
    description: 'Force parliament to debate. Government must respond or lose approval.',
    needsTarget: 'simvar' },
  { type: 'propose_counter_bill', name: 'Counter-Bill', cost: 3, emoji: '📜', category: 'parliamentary',
    description: 'Propose alternative policy. If more popular → -5% ruling approval.',
    needsTarget: 'policy_value' },
  { type: 'vote_of_no_confidence', name: 'No Confidence', cost: 4, emoji: '⚡', category: 'parliamentary',
    description: 'If approval < 35%, snap election. Fail = -15 credibility.',
    needsTarget: 'none', condition: (gs) => (gs.rulingApproval ?? 50) < 35, conditionLabel: 'Approval < 35%' },

  // Public
  { type: 'campaign', name: 'Campaign', cost: 1, emoji: '📢', category: 'public',
    description: 'Target a voter group: +5% support.', needsTarget: 'group' },
  { type: 'rally_protest', name: 'Rally/Protest', cost: 2, emoji: '✊', category: 'public',
    description: 'Target a region: +10% support (suppressed if police > 65).', needsTarget: 'region' },
  { type: 'media_attack', name: 'Media Campaign', cost: 2, emoji: '📺', category: 'public',
    description: 'Amplify a negative stat for 3 turns.', needsTarget: 'simvar' },
  { type: 'leak_scandal', name: 'Leak Scandal', cost: 3, emoji: '🔍', category: 'public',
    description: '-8% approval if corruption > 30 or intel < 30. Risk of exposure.',
    needsTarget: 'none' },
  { type: 'form_ngo_alliance', name: 'NGO Alliance', cost: 2, emoji: '🤝', category: 'public',
    description: 'Permanent +3% with a voter group. Max 3.',
    needsTarget: 'group', condition: (gs) => (gs.ngoAlliances?.length ?? 0) < 3, conditionLabel: 'Max 3' },
  { type: 'coalition_building', name: 'Lock Voter Group', cost: 3, emoji: '🔒', category: 'public',
    description: 'Lock a voter group for 4 turns.', needsTarget: 'group' },

  // Blocking
  { type: 'filibuster', name: 'Filibuster', cost: 2, emoji: '🚫', category: 'blocking',
    description: 'Block ONE policy change next turn.', needsTarget: 'policy' },
  { type: 'senate_veto', name: 'Senate Veto', cost: 4, emoji: '🏛️', category: 'blocking',
    description: 'Block a bill entirely. Need > 40 seats.',
    needsTarget: 'policy', conditionLabel: '> 40 seats' },
  { type: 'constitutional_challenge', name: 'Constitutional Challenge', cost: 5, emoji: '⚖️', category: 'blocking',
    description: 'Challenge a law. Succeeds if freedom < 50. Fail = -10 credibility.',
    needsTarget: 'policy' },
  { type: 'delay_tactics', name: 'Delay Tactics', cost: 1, emoji: '⏳', category: 'blocking',
    description: 'Delay a policy change by 2 turns.', needsTarget: 'policy' },

  // New: Plant Evidence
  { type: 'plant_evidence', name: 'Plant Evidence', cost: 3, emoji: '🕵️', category: 'public',
    description: 'Plant scandal evidence — 40% chance BACKFIRES onto you!',
    needsTarget: 'none',
    condition: (gs) => gs.gameSettings?.scandalsEnabled !== false, conditionLabel: 'Scandals enabled' },

  // Campaign phase
  { type: 'campaign_visit', name: 'Campaign Visit', cost: 1, emoji: '🎪', category: 'campaign',
    description: 'Visit a region: +5% permanent support.', needsTarget: 'region',
    condition: (gs) => gs.campaignPhase, conditionLabel: 'Campaign phase' },
  { type: 'run_ads', name: 'Run Ads', cost: 2, emoji: '📺', category: 'campaign',
    description: 'Target voter group with ads: +5% for election.',
    needsTarget: 'group', condition: (gs) => gs.campaignPhase, conditionLabel: 'Campaign phase' },
];

const SIM_VARS: { key: SimVarKey; label: string }[] = [
  { key: 'gdpGrowth', label: 'GDP' }, { key: 'unemployment', label: 'Unemployment' },
  { key: 'crime', label: 'Crime' }, { key: 'pollution', label: 'Pollution' },
  { key: 'inflation', label: 'Inflation' }, { key: 'corruption', label: 'Corruption' },
  { key: 'healthIndex', label: 'Health' }, { key: 'educationIndex', label: 'Education' },
  { key: 'freedomIndex', label: 'Freedom' }, { key: 'nationalSecurity', label: 'Security' },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  parliamentary: { label: 'Parliamentary', icon: '🏛️' },
  public: { label: 'Public Influence', icon: '📢' },
  blocking: { label: 'Blocking Power', icon: '🛡️' },
  campaign: { label: 'Election Campaign', icon: '🗳️' },
};

interface RecommendedAction {
  emoji: string;
  label: string;
  cost: number;
  action: OppositionAction;
}

function getRecommendedActions(gs: GameState): RecommendedAction[] {
  const recs: RecommendedAction[] = [];
  const rulingApproval = gs.rulingApproval ?? 50;

  // If ruling approval < 40: recommend Vote of No Confidence
  if (rulingApproval < 35) {
    recs.push({
      emoji: '⚡',
      label: 'Call Vote of No Confidence',
      cost: 4,
      action: { type: 'vote_of_no_confidence', cost: 4 },
    });
  }

  // If corruption is high or scandal situation active
  if (gs.simulation.corruption > 40 || (gs.policies.intelligence ?? 30) < 30) {
    recs.push({
      emoji: '🔍',
      label: 'Leak Scandal — corruption is ripe',
      cost: 3,
      action: { type: 'leak_scandal', cost: 3 },
    });
  }

  // If election soon: media campaign in swing regions
  if (gs.turnsUntilElection <= 3 && gs.campaignPhase) {
    recs.push({
      emoji: '📺',
      label: 'Run Ads targeting swing voters',
      cost: 2,
      action: { type: 'run_ads', cost: 2, targetGroupId: 'workers' },
    });
  }

  // If broken pledges exist
  if ((gs.pledges ?? []).some(p => gs.turn - p.madeOnTurn > 6)) {
    recs.push({
      emoji: '💔',
      label: 'Call Out Broken Promise',
      cost: 2,
      action: { type: 'media_attack', cost: 2, targetSimVar: 'corruption' as SimVarKey },
    });
  }

  // If extremism > 60
  const maxExtremism = Math.max(gs.extremism.far_left, gs.extremism.far_right, gs.extremism.religious, gs.extremism.eco);
  if (maxExtremism > 60) {
    recs.push({
      emoji: '🎤',
      label: 'Question Time on Security',
      cost: 0,
      action: { type: 'question_time', cost: 0, targetSimVar: 'nationalSecurity' as SimVarKey, topic: 'nationalSecurity' },
    });
  }

  // If unemployment > 12
  if (gs.simulation.unemployment > 12) {
    recs.push({
      emoji: '📺',
      label: 'Media Attack on Unemployment',
      cost: 2,
      action: { type: 'media_attack', cost: 2, targetSimVar: 'unemployment' as SimVarKey },
    });
  }

  // Fallback: Campaign targeting weakest voter group
  if (recs.length < 3) {
    // Find voter group where ruling party is weakest
    const ruling = gs.players.find(p => p.role === 'ruling');
    if (ruling && gs.voterSatisfaction[ruling.id]) {
      const weakest = Object.entries(gs.voterSatisfaction[ruling.id])
        .sort(([, a], [, b]) => (a as number) - (b as number))[0];
      if (weakest) {
        recs.push({
          emoji: '📢',
          label: `Campaign — target ${weakest[0]} (${weakest[1]}% sat)`,
          cost: 1,
          action: { type: 'campaign', cost: 1, targetGroupId: weakest[0] },
        });
      }
    }
  }

  // Default filler
  if (recs.length < 3) {
    recs.push({
      emoji: '📋',
      label: 'Table Motion on Economy',
      cost: 1,
      action: { type: 'table_motion', cost: 1, targetSimVar: 'gdpGrowth' as SimVarKey, topic: 'Economy' },
    });
  }

  return recs.slice(0, 3);
}

export function OppositionActionPanel() {
  const { gameState, playerId, pendingOppositionActions, addOppositionAction, removeOppositionAction, clearOppositionActions, getPendingOppositionCost } = useGameStore();
  const { submitOppositionActions, endTurnPhase } = useGameActions();
  const [selectedAction, setSelectedAction] = useState<ActionDef | null>(null);
  const [targetPolicy, setTargetPolicy] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [targetSimVar, setTargetSimVar] = useState<SimVarKey>('unemployment');
  const [targetRegion, setTargetRegion] = useState('');
  const [proposedValue, setProposedValue] = useState(50);
  const [activeCategory, setActiveCategory] = useState<string>('parliamentary');

  if (!gameState) return null;
  const myPlayer = gameState.players.find(p => p.id === playerId);
  const pc = myPlayer?.politicalCapital ?? 0;
  const pendingCost = getPendingOppositionCost();
  const remainingPC = pc - pendingCost;
  const credibility = gameState.oppositionCredibility ?? 80;

  const handleAddAction = () => {
    if (!selectedAction) return;
    const effectiveCost = credibility < 30 ? Math.ceil(selectedAction.cost * 1.5) : selectedAction.cost;
    const action: OppositionAction = { type: selectedAction.type, cost: effectiveCost };
    if (selectedAction.needsTarget === 'policy' && targetPolicy) action.targetPolicyId = targetPolicy;
    if (selectedAction.needsTarget === 'group' && targetGroup) action.targetGroupId = targetGroup;
    if (selectedAction.needsTarget === 'simvar') { action.targetSimVar = targetSimVar; action.topic = targetSimVar; }
    if (selectedAction.needsTarget === 'region' && targetRegion) action.targetRegionId = targetRegion;
    if (selectedAction.needsTarget === 'policy_value' && targetPolicy) {
      action.proposedPolicyId = targetPolicy;
      action.proposedValue = proposedValue;
    }
    // Plant evidence: randomly pick a scandal type
    if (selectedAction.type === 'plant_evidence') {
      const types: ('corruption' | 'personal' | 'policy')[] = ['corruption', 'personal', 'policy'];
      action.scandalType = types[Math.floor(Math.random() * types.length)];
    }
    addOppositionAction(action);
    setSelectedAction(null);
  };

  const handleSubmit = () => { submitOppositionActions(pendingOppositionActions); clearOppositionActions(); };
  const handlePass = () => { endTurnPhase(); clearOppositionActions(); };

  const categories = Object.keys(CATEGORY_LABELS);
  const filteredActions = ACTION_DEFS.filter(a => a.category === activeCategory);

  return (
    <div className="w-80 border-l border-slate-700/50 bg-slate-900/50 overflow-y-auto flex-shrink-0 flex flex-col">
      {/* Header with credibility + PC */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">Opposition Actions</h3>
          <span className="text-xs font-bold text-yellow-400">⚡{remainingPC}/{pc}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">Credibility:</span>
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{
              width: `${credibility}%`,
              backgroundColor: credibility > 60 ? '#22C55E' : credibility < 30 ? '#EF4444' : '#EAB308',
            }} />
          </div>
          <span className="text-[10px] text-slate-400">{credibility}</span>
        </div>
        {credibility < 30 && (
          <p className="text-[9px] text-red-400 mt-1">⚠️ Low credibility — actions cost 1.5x</p>
        )}
      </div>

      {/* Recommended Actions */}
      <div className="p-3 border-b border-slate-700/50 bg-amber-950/10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">💡 Recommended</h4>
          <button
            onClick={() => {
              // Toggle auto-pilot — will be handled by parent
              if (typeof window !== 'undefined') {
                const event = new CustomEvent('toggleAutoPilot');
                window.dispatchEvent(event);
              }
            }}
            className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
              gameState.autoPilotOpposition
                ? 'bg-amber-600/20 border-amber-600 text-amber-300'
                : 'border-slate-600 text-slate-500 hover:text-amber-400'
            }`}
          >
            {gameState.autoPilotOpposition ? '🤖 Auto-Pilot ON' : '🤖 Auto-Pilot'}
          </button>
        </div>
        <div className="space-y-1">
          {getRecommendedActions(gameState).slice(0, 3).map((rec, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-slate-800/30 border border-slate-700/30">
              <span className="text-amber-400">{rec.emoji}</span>
              <span className="text-slate-300 flex-1">{rec.label}</span>
              <span className="text-[9px] text-slate-500">{rec.cost} PC</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-slate-700/50">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 py-2 text-[10px] font-medium transition-all ${
              activeCategory === cat
                ? 'text-red-400 border-b-2 border-red-500 bg-red-950/10'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {CATEGORY_LABELS[cat].icon}
          </button>
        ))}
      </div>

      {/* Actions list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredActions.map(action => {
          const effectiveCost = credibility < 30 ? Math.ceil(action.cost * 1.5) : action.cost;
          const canAfford = remainingPC >= effectiveCost;
          const meetsCondition = !action.condition || action.condition(gameState);
          const canUse = canAfford && meetsCondition;

          return (
            <button
              key={action.type}
              onClick={() => canUse && setSelectedAction(selectedAction?.type === action.type ? null : action)}
              disabled={!canUse}
              className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                selectedAction?.type === action.type
                  ? 'bg-red-950/30 border-red-700/50'
                  : canUse
                  ? 'bg-slate-800/30 border-slate-700/30 hover:border-red-700/30'
                  : 'bg-slate-800/10 border-slate-800/30 opacity-40'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium text-slate-200">
                  {action.emoji} {action.name}
                </span>
                <span className={`text-[10px] font-bold ${effectiveCost === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {effectiveCost === 0 ? 'FREE' : `${effectiveCost} PC`}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">{action.description}</p>
              {action.conditionLabel && !meetsCondition && (
                <span className="text-[9px] text-red-400 mt-0.5 block">Requires: {action.conditionLabel}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Target selection */}
      {selectedAction && (
        <div className="p-3 border-t border-slate-700/50 bg-slate-800/30 animate-fade-in">
          <h4 className="text-xs font-medium text-slate-300 mb-2">{selectedAction.emoji} {selectedAction.name}</h4>
          {selectedAction.needsTarget === 'policy' && (
            <select value={targetPolicy} onChange={(e) => setTargetPolicy(e.target.value)}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-xs mb-2">
              <option value="">Select policy...</option>
              {POLICIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {selectedAction.needsTarget === 'group' && (
            <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-xs mb-2">
              <option value="">Select group...</option>
              {VOTER_GROUPS.map(g => <option key={g.id} value={g.id}>{g.name} ({(g.populationShare * 100).toFixed(0)}%)</option>)}
            </select>
          )}
          {selectedAction.needsTarget === 'simvar' && (
            <select value={targetSimVar} onChange={(e) => setTargetSimVar(e.target.value as SimVarKey)}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-xs mb-2">
              {SIM_VARS.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
          )}
          {selectedAction.needsTarget === 'region' && (
            <select value={targetRegion} onChange={(e) => setTargetRegion(e.target.value)}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-xs mb-2">
              <option value="">Select region...</option>
              {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name} ({r.seats} seats)</option>)}
            </select>
          )}
          {selectedAction.needsTarget === 'policy_value' && (
            <div className="space-y-2 mb-2">
              <select value={targetPolicy} onChange={(e) => setTargetPolicy(e.target.value)}
                className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-xs">
                <option value="">Select policy...</option>
                {POLICIES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex gap-1">
                {(['Off', 'Low', 'Medium', 'High', 'Maximum'] as const).map((level) => {
                  const val = { Off: 0, Low: 25, Medium: 50, High: 75, Maximum: 100 }[level];
                  return (
                    <button key={level} onClick={() => setProposedValue(val)}
                      className={`flex-1 py-1 text-[9px] rounded border ${
                        proposedValue === val ? 'bg-red-600/20 border-red-600 text-red-300' : 'border-slate-600 text-slate-500'
                      }`}>{level}</button>
                  );
                })}
              </div>
            </div>
          )}
          <button onClick={handleAddAction}
            disabled={
              (selectedAction.needsTarget === 'policy' && !targetPolicy) ||
              (selectedAction.needsTarget === 'group' && !targetGroup) ||
              (selectedAction.needsTarget === 'region' && !targetRegion) ||
              (selectedAction.needsTarget === 'policy_value' && !targetPolicy)
            }
            className="w-full py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 rounded-lg text-xs font-medium transition-all">
            Add to Queue
          </button>
        </div>
      )}

      {/* Queue */}
      {pendingOppositionActions.length > 0 && (
        <div className="p-3 border-t border-slate-700/50">
          <h4 className="text-[10px] text-slate-500 uppercase mb-2">Queue ({pendingCost} PC)</h4>
          <div className="space-y-1 mb-3">
            {pendingOppositionActions.map((action, i) => {
              const def = ACTION_DEFS.find(a => a.type === action.type);
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg text-xs">
                  <span>{def?.emoji} {def?.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">{action.cost}</span>
                    <button onClick={() => removeOppositionAction(i)} className="text-red-400 hover:text-red-300">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit / Pass */}
      <div className="p-3 border-t border-slate-700/50 space-y-2">
        <button onClick={handleSubmit} disabled={pendingOppositionActions.length === 0 || remainingPC < 0}
          className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-semibold transition-all">
          Execute Actions
        </button>
        <button onClick={handlePass}
          className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 transition-all">
          Pass Turn
        </button>
      </div>
    </div>
  );
}
