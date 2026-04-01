'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { PARTY_COLORS, CampaignAction } from '@/lib/engine/types';
import { REGIONS } from '@/lib/engine/regions';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { POLICIES } from '@/lib/engine/policies';
import { ParliamentHemicycle } from './ParliamentHemicycle';
import { TopBar } from './TopBar';
import { NewsTicker } from './NewsTicker';

type ActionType = 'campaign_rally' | 'media_blitz' | 'voter_promise';

interface PendingAction {
  type: ActionType;
  cost: number;
  label: string;
  target: string;
}

export function CampaignDashboard() {
  const { gameState, playerId } = useGameStore();
  const { submitCampaignActions, endTurnPhase } = useGameActions();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [actionType, setActionType] = useState<ActionType>('campaign_rally');
  const [promiseDirection, setPromiseDirection] = useState<Record<string, 'increase' | 'decrease'>>({});

  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  if (!myPlayer) return null;

  const pc = myPlayer.politicalCapital;
  const pendingCost = pendingActions.reduce((s, a) => s + a.cost, 0);
  const remaining = pc - pendingCost;
  const hasActedThisTurn = gameState.campaignActedThisTurn?.[myPlayer.id] ?? false;
  const opponent = gameState.players.find(p => p.id !== myPlayer.id);
  const opponentActed = opponent ? (gameState.campaignActedThisTurn?.[opponent.id] ?? false) : true;

  const addAction = (action: PendingAction) => {
    if (pendingCost + action.cost <= pc) {
      setPendingActions(prev => [...prev, action]);
    }
  };

  const removeAction = (index: number) => {
    setPendingActions(prev => prev.filter((_, j) => j !== index));
  };

  const handleSubmit = () => {
    const actions: CampaignAction[] = pendingActions.map(a => ({
      type: a.type,
      cost: a.cost,
      targetRegionId: a.type === 'campaign_rally' ? a.target : undefined,
      targetGroupId: a.type === 'media_blitz' ? a.target : undefined,
      promisePolicyId: a.type === 'voter_promise' ? a.target : undefined,
      promiseDirection: promiseDirection[a.target] ?? 'increase',
    }));
    submitCampaignActions(actions);
    setPendingActions([]);
  };

  // Vote share for my party
  const myVoteShare = gameState.voteShares?.[myPlayer.id] ?? 0;
  const opponentVoteShare = opponent ? (gameState.voteShares?.[opponent.id] ?? 0) : 0;
  const leading = myVoteShare > opponentVoteShare;

  // Total promises made across all campaign turns
  const totalPledges = (gameState.pledges ?? []).filter(p => p.playerId === myPlayer.id).length;

  // Action type descriptions
  const actionTypeInfo: Record<ActionType, { icon: string; label: string; desc: string; hint: string }> = {
    campaign_rally: { icon: '🎪', label: 'Rally', desc: 'Hold a rally in a region', hint: 'Boost support in specific regions (+8% regional bonus). Best for swing regions!' },
    media_blitz: { icon: '📺', label: 'Media Blitz', desc: 'Target a voter group', hint: 'Run targeted ads to win over specific voter groups (+6% group bonus).' },
    voter_promise: { icon: '📢', label: 'Promise', desc: 'Make a policy pledge', hint: 'Promise to change a policy if elected. Boosts overall support (+5%) but you\'ll be judged on delivery!' },
  };

  return (
    <div className="h-screen flex flex-col bg-game-bg text-white overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Vote standings & strategy info */}
        <div className="w-80 border-r border-game-border bg-game-card/50 overflow-y-auto p-4 space-y-4">
          {/* Election countdown */}
          <div className="glass-card p-4 text-center bg-gradient-to-br from-amber-950/30 to-transparent border-amber-800/30">
            <div className="text-xs text-amber-400/80 uppercase tracking-wider font-bold mb-1">Election Day</div>
            <div className="text-4xl font-bold text-amber-400 font-display">{gameState.turnsUntilElection}</div>
            <div className="text-xs text-game-muted">{gameState.turnsUntilElection === 1 ? 'turn remaining' : 'turns remaining'}</div>
          </div>

          {/* Your position */}
          <div className={`glass-card p-4 border ${leading ? 'border-emerald-800/40 bg-emerald-950/10' : 'border-red-800/40 bg-red-950/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-game-secondary font-bold uppercase tracking-wider">Your Position</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${leading ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                {leading ? '▲ Leading' : '▼ Trailing'}
              </span>
            </div>
            <div className="text-3xl font-bold" style={{ color: PARTY_COLORS[myPlayer.party.partyColor] }}>
              {myVoteShare.toFixed(1)}%
            </div>
            <div className="text-xs text-game-muted mt-1">
              vs {opponent?.party.partyName}: {opponentVoteShare.toFixed(1)}%
            </div>
          </div>

          <h3 className="text-xs font-bold text-game-secondary uppercase tracking-wider">📊 All Parties</h3>
          <div className="space-y-1.5">
            {(() => {
              const partyList: { id: string; name: string; color: string }[] = [
                ...gameState.players.map(p => ({ id: p.id, name: p.party.partyName, color: PARTY_COLORS[p.party.partyColor] })),
                ...gameState.botParties.map(b => ({ id: b.id, name: b.name, color: b.color })),
              ];
              return partyList.sort((a, b) => (gameState.voteShares?.[b.id] ?? 0) - (gameState.voteShares?.[a.id] ?? 0));
            })().map((entity) => {
              const share = gameState.voteShares?.[entity.id] ?? 0;
              return (
                <div key={entity.id} className="glass-card p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entity.color }} />
                      <span className="text-xs font-medium text-white">{entity.name}</span>
                      {entity.id === myPlayer.id && <span className="text-[9px] text-game-accent font-bold">(YOU)</span>}
                    </div>
                    <span className="text-xs font-bold" style={{ color: entity.color }}>{share.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-game-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${share}%`, backgroundColor: entity.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {gameState.parliament.seats.length > 0 && (
            <>
              <h3 className="text-xs font-bold text-game-secondary uppercase tracking-wider">🏛️ Projected Parliament</h3>
              <ParliamentHemicycle compact />
            </>
          )}

          {/* Campaign stats */}
          <div className="glass-card p-3 space-y-2">
            <h3 className="text-xs font-bold text-game-secondary uppercase tracking-wider">Campaign Stats</h3>
            <div className="flex justify-between text-xs">
              <span className="text-game-muted">Promises made</span>
              <span className="text-white font-medium">{totalPledges}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-game-muted">PC remaining</span>
              <span className="text-amber-400 font-medium">{pc}</span>
            </div>
          </div>
        </div>

        {/* Center: Campaign actions */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-game-border bg-gradient-to-r from-game-card/80 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold font-display mb-0.5">📢 Campaign Phase</h2>
                <p className="text-sm text-game-secondary">
                  Spend Political Capital to win voter support. Queue actions below, then submit.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-400">{remaining} <span className="text-sm text-game-muted">PC</span></div>
                <div className="text-[10px] text-game-muted">available to spend</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Action type tabs */}
            <div className="flex gap-2">
              {(['campaign_rally', 'media_blitz', 'voter_promise'] as ActionType[]).map(type => {
                const info = actionTypeInfo[type];
                const isActive = actionType === type;
                const count = pendingActions.filter(a => a.type === type).length;
                return (
                  <button key={type} onClick={() => setActionType(type)}
                    className={`relative flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                      isActive
                        ? 'bg-game-accent/20 border-game-accent text-white shadow-lg shadow-game-accent/10'
                        : 'glass-card border-game-border text-game-secondary hover:text-white hover:border-game-muted'
                    }`}>
                    <div className="text-lg mb-0.5">{info.icon}</div>
                    <div className="font-bold">{info.label}</div>
                    <div className="text-[10px] opacity-70">{info.desc}</div>
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-game-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action hint */}
            <div className="text-xs text-game-muted bg-game-card/30 rounded-lg px-3 py-2 border border-game-border/50">
              💡 {actionTypeInfo[actionType].hint}
            </div>

            {/* Target selection */}
            {actionType === 'campaign_rally' && (
              <div className="grid grid-cols-2 gap-3">
                {REGIONS.map(region => {
                  const alreadyQueued = pendingActions.filter(a => a.type === 'campaign_rally' && a.target === region.id).length;
                  const existingBonus = gameState.campaignBonuses?.[myPlayer.id]?.[region.id] ?? 0;
                  return (
                    <button key={region.id}
                      onClick={() => addAction({ type: 'campaign_rally', cost: 2, label: `Rally: ${region.name}`, target: region.id })}
                      disabled={remaining < 2}
                      className="glass-card p-3 text-left hover:ring-1 hover:ring-game-accent transition-all disabled:opacity-40 group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm text-white">{region.name}</div>
                        {alreadyQueued > 0 && (
                          <span className="text-[10px] bg-game-accent/20 text-game-accent px-1.5 py-0.5 rounded font-bold">
                            +{alreadyQueued} queued
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-game-muted mb-1">
                        🏛️ {region.seats} seats • {region.characteristics}
                      </div>
                      <div className="text-[10px] text-game-muted mb-1.5">
                        Key groups: {region.dominantGroups.join(', ')}
                      </div>
                      {existingBonus > 0 && (
                        <div className="text-[10px] text-emerald-400 mb-1">Current bonus: +{existingBonus}%</div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-400">⚡ 2 PC</span>
                        <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">+8% regional</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {actionType === 'media_blitz' && (
              <div className="grid grid-cols-2 gap-3">
                {VOTER_GROUPS.map(group => {
                  const alreadyQueued = pendingActions.filter(a => a.type === 'media_blitz' && a.target === group.id).length;
                  const existingBonus = gameState.campaignBonuses?.[myPlayer.id]?.[group.id] ?? 0;
                  const mySat = gameState.voterSatisfaction?.[myPlayer.id]?.[group.id] ?? 50;
                  return (
                    <button key={group.id}
                      onClick={() => addAction({ type: 'media_blitz', cost: 1, label: `Media: ${group.name}`, target: group.id })}
                      disabled={remaining < 1}
                      className="glass-card p-3 text-left hover:ring-1 hover:ring-game-accent transition-all disabled:opacity-40 group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm text-white">{group.name}</div>
                        {alreadyQueued > 0 && (
                          <span className="text-[10px] bg-game-accent/20 text-game-accent px-1.5 py-0.5 rounded font-bold">
                            +{alreadyQueued} queued
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-game-muted mb-1">
                        👥 {(group.populationShare * 100).toFixed(0)}% of voters
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 h-1.5 bg-game-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${mySat}%`,
                            backgroundColor: mySat > 60 ? '#10B981' : mySat > 40 ? '#F59E0B' : '#EF4444'
                          }} />
                        </div>
                        <span className="text-[10px] text-game-muted">{mySat.toFixed(0)}%</span>
                      </div>
                      {existingBonus > 0 && (
                        <div className="text-[10px] text-emerald-400 mb-1">Current bonus: +{existingBonus}%</div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-400">⚡ 1 PC</span>
                        <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">+6% group</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {actionType === 'voter_promise' && (
              <div className="grid grid-cols-2 gap-3">
                {POLICIES
                  .filter(policy => {
                    const pledges = gameState?.pledges ?? [];
                    const alreadyPromised = pledges.some(
                      p => p.playerId === playerId && p.policyId === policy.id
                    );
                    const pendingPromise = pendingActions.some(
                      a => a.type === 'voter_promise' && a.target === policy.id
                    );
                    return !alreadyPromised && !pendingPromise;
                  })
                  .map(policy => {
                    const dir = promiseDirection[policy.id] ?? 'increase';
                    return (
                      <div key={policy.id} className="glass-card p-3 text-left transition-all hover:ring-1 hover:ring-game-accent">
                        <div className="font-medium text-sm text-white mb-1">{policy.name}</div>
                        <div className="text-[10px] text-game-muted mb-2 uppercase tracking-wider">{policy.category}</div>
                        <div className="flex gap-1.5 mb-2">
                          <button
                            onClick={() => setPromiseDirection(prev => ({ ...prev, [policy.id]: 'increase' }))}
                            className={`flex-1 text-[10px] py-1 rounded transition-all ${
                              dir === 'increase' ? 'bg-emerald-600/80 text-white font-bold' : 'bg-game-border/50 text-game-muted hover:text-white'
                            }`}>
                            ↑ Increase
                          </button>
                          <button
                            onClick={() => setPromiseDirection(prev => ({ ...prev, [policy.id]: 'decrease' }))}
                            className={`flex-1 text-[10px] py-1 rounded transition-all ${
                              dir === 'decrease' ? 'bg-red-600/80 text-white font-bold' : 'bg-game-border/50 text-game-muted hover:text-white'
                            }`}>
                            ↓ Decrease
                          </button>
                        </div>
                        <button
                          onClick={() => addAction({ type: 'voter_promise', cost: 1, label: `Promise: ${dir === 'increase' ? '↑' : '↓'} ${policy.name}`, target: policy.id })}
                          disabled={remaining < 1}
                          className="w-full text-xs py-1.5 rounded bg-game-accent/20 hover:bg-game-accent/40 text-game-accent font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                          Make Promise • ⚡ 1 PC
                        </button>
                      </div>
                    );
                  })}
                {POLICIES.every(policy => {
                  const pledges = gameState?.pledges ?? [];
                  const pendingPromise = pendingActions.some(a => a.type === 'voter_promise' && a.target === policy.id);
                  return pledges.some(p => p.playerId === playerId && p.policyId === policy.id) || pendingPromise;
                }) && (
                  <div className="col-span-2 text-center text-sm text-game-muted py-4">
                    ✅ You&apos;ve promised all available policies
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom: pending actions queue + submit */}
          <div className="border-t border-game-border p-3 bg-game-card/80 backdrop-blur">
            {hasActedThisTurn ? (
              <div className="flex items-center justify-center gap-3 py-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm text-game-secondary">
                  {opponentActed
                    ? 'Both ready — advancing to polls...'
                    : `Waiting for ${opponent?.party.partyName ?? 'opponent'}...`}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Pending actions queue */}
                {pendingActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pendingActions.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-game-accent/10 border border-game-accent/30 text-game-accent px-2.5 py-1 rounded-lg">
                        {a.label}
                        <span className="text-amber-400">{a.cost}PC</span>
                        <button onClick={() => removeAction(i)}
                          className="text-game-muted hover:text-red-400 transition-colors ml-0.5">✕</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-game-muted">
                    {pendingActions.length === 0
                      ? 'Queue actions above, or end your turn'
                      : `${pendingActions.length} action${pendingActions.length > 1 ? 's' : ''} queued — ${pendingCost} PC total`}
                  </div>
                  <div className="flex gap-2">
                    {pendingActions.length > 0 && (
                      <>
                        <button onClick={() => setPendingActions([])}
                          className="px-3 py-2 text-xs rounded-lg bg-game-border/50 text-game-muted hover:text-white transition-all">
                          Clear All
                        </button>
                        <button onClick={handleSubmit}
                          className="px-5 py-2 text-xs rounded-lg bg-game-accent hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-game-accent/20">
                          Submit Actions ({pendingCost} PC)
                        </button>
                      </>
                    )}
                    <button
                      onClick={endTurnPhase}
                      className="px-5 py-2 text-xs rounded-lg bg-game-border hover:bg-game-muted/20 text-game-secondary hover:text-white transition-all"
                    >
                      {pendingActions.length > 0 ? 'Skip & End Turn →' : 'End Turn →'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <NewsTicker />
    </div>
  );
}
