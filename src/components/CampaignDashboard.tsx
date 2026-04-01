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

type ActionType = 'campaign_rally' | 'media_blitz' | 'voter_promise' | 'attack_ad' | 'fundraiser' | 'endorsement';

interface PendingAction {
  type: ActionType;
  cost: number;
  label: string;
  target: string;
}

const ACTION_TABS: { type: ActionType; icon: string; label: string; cost: number; hint: string }[] = [
  { type: 'campaign_rally', icon: '🎪', label: 'Rally', cost: 2, hint: 'Hold a rally to boost support in a region (+8%). Target swing regions for maximum impact.' },
  { type: 'media_blitz', icon: '📺', label: 'Media', cost: 1, hint: 'Run targeted media ads to win over a specific voter group (+6%).' },
  { type: 'voter_promise', icon: '📜', label: 'Promise', cost: 1, hint: 'Pledge to change a policy if elected (+5%). You must make at least 1 promise before your first end-of-turn.' },
  { type: 'attack_ad', icon: '⚔️', label: 'Attack', cost: 2, hint: 'Run negative ads against your opponent (-4% for them, but -1% for you too — risky!).' },
  { type: 'fundraiser', icon: '💰', label: 'Fundraise', cost: 1, hint: 'Host a fundraiser to gain +2 PC. Net gain of +1 PC after cost. Invest early for more actions later.' },
  { type: 'endorsement', icon: '🌟', label: 'Endorse', cost: 2, hint: 'Seek a prominent endorsement (+4% target group, +2% adjacent groups). Broad but expensive.' },
];

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
      targetGroupId: ['media_blitz', 'attack_ad', 'endorsement'].includes(a.type) ? a.target : undefined,
      promisePolicyId: a.type === 'voter_promise' ? a.target : undefined,
      promiseDirection: promiseDirection[a.target] ?? 'increase',
    }));
    submitCampaignActions(actions);
    setPendingActions([]);
  };

  const myVoteShare = gameState.voteShares?.[myPlayer.id] ?? 0;
  const opponentVoteShare = opponent ? (gameState.voteShares?.[opponent.id] ?? 0) : 0;
  const leading = myVoteShare > opponentVoteShare;
  const totalPledges = (gameState.pledges ?? []).filter(p => p.playerId === myPlayer.id).length;
  const needsPromise = totalPledges === 0;

  const currentTab = ACTION_TABS.find(t => t.type === actionType)!;

  return (
    <div className="h-screen flex flex-col bg-game-bg text-white overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: standings & intel */}
        <div className="w-[300px] border-r border-game-border bg-game-card/40 overflow-y-auto p-4 space-y-3">
          {/* Election countdown */}
          <div className="glass-card p-4 text-center bg-gradient-to-br from-amber-950/20 to-transparent border-amber-900/20">
            <div className="text-[10px] text-amber-400/70 uppercase tracking-widest font-bold mb-1">Election In</div>
            <div className="text-5xl font-bold text-amber-400 font-display leading-none">{gameState.turnsUntilElection}</div>
            <div className="text-[10px] text-game-muted mt-1">{gameState.turnsUntilElection === 1 ? 'turn' : 'turns'}</div>
          </div>

          {/* Head-to-head */}
          <div className="glass-card p-3">
            <div className="text-[10px] text-game-secondary font-bold uppercase tracking-wider mb-2">Head to Head</div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-xs text-game-muted">{myPlayer.party.partyName}</div>
                <div className="text-2xl font-bold" style={{ color: PARTY_COLORS[myPlayer.party.partyColor] }}>
                  {myVoteShare.toFixed(1)}%
                </div>
              </div>
              <div className={`text-xs font-bold px-2 py-0.5 rounded-md mb-1 ${
                leading ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/30' : 'bg-red-900/40 text-red-400 border border-red-800/30'
              }`}>
                {leading ? `+${(myVoteShare - opponentVoteShare).toFixed(1)}` : `${(myVoteShare - opponentVoteShare).toFixed(1)}`}
              </div>
              <div className="text-right">
                <div className="text-xs text-game-muted">{opponent?.party.partyName ?? 'Opponent'}</div>
                <div className="text-2xl font-bold" style={{ color: opponent ? PARTY_COLORS[opponent.party.partyColor] : '#ef4444' }}>
                  {opponentVoteShare.toFixed(1)}%
                </div>
              </div>
            </div>
            {/* Dual bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-game-border/50">
              <div className="h-full transition-all duration-700 rounded-l-full" style={{
                width: `${myVoteShare}%`,
                backgroundColor: PARTY_COLORS[myPlayer.party.partyColor],
              }} />
              <div className="h-full transition-all duration-700 rounded-r-full" style={{
                width: `${opponentVoteShare}%`,
                backgroundColor: opponent ? PARTY_COLORS[opponent.party.partyColor] : '#ef4444',
              }} />
            </div>
          </div>

          {/* All parties list */}
          <div className="space-y-1">
            <div className="text-[10px] text-game-secondary font-bold uppercase tracking-wider px-1">All Parties</div>
            {(() => {
              const partyList = [
                ...gameState.players.map(p => ({ id: p.id, name: p.party.partyName, color: PARTY_COLORS[p.party.partyColor], isMe: p.id === myPlayer.id })),
                ...gameState.botParties.map(b => ({ id: b.id, name: b.name, color: b.color, isMe: false })),
              ];
              return partyList.sort((a, b) => (gameState.voteShares?.[b.id] ?? 0) - (gameState.voteShares?.[a.id] ?? 0));
            })().map((entity, i) => {
              const share = gameState.voteShares?.[entity.id] ?? 0;
              return (
                <div key={entity.id} className={`flex items-center gap-2 p-2 rounded-lg transition-all animate-fade-in ${entity.isMe ? 'bg-white/[0.03]' : ''}`}
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entity.color }} />
                  <span className="text-xs text-game-secondary flex-1 truncate">{entity.name}</span>
                  {entity.isMe && <span className="text-[8px] text-game-accent font-bold">YOU</span>}
                  <span className="text-xs font-bold tabular-nums" style={{ color: entity.color }}>{share.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>

          {/* Parliament preview */}
          <div className="glass-card p-3">
            <div className="text-[10px] text-game-secondary font-bold uppercase tracking-wider mb-2">Projected Seats</div>
            <ParliamentHemicycle compact />
          </div>

          {/* Campaign stats */}
          <div className="glass-card p-3 space-y-1.5">
            <div className="text-[10px] text-game-secondary font-bold uppercase tracking-wider">Your Campaign</div>
            <div className="flex justify-between text-xs">
              <span className="text-game-muted">Promises made</span>
              <span className={`font-bold ${totalPledges > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalPledges}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-game-muted">PC available</span>
              <span className="text-amber-400 font-bold">{pc}</span>
            </div>
          </div>
        </div>

        {/* Center: Campaign actions */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 pb-3 border-b border-game-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold font-display">Campaign Phase</h2>
                <p className="text-xs text-game-secondary mt-0.5">
                  Spend Political Capital to win voters before election day
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="stat-card !px-3 !py-2">
                  <span className="text-amber-400 text-lg font-bold">⚡ {remaining}</span>
                  <span className="text-[10px] text-game-muted ml-1">PC left</span>
                </div>
              </div>
            </div>

            {/* Action type tabs */}
            <div className="flex gap-1.5">
              {ACTION_TABS.map(tab => {
                const isActive = actionType === tab.type;
                const count = pendingActions.filter(a => a.type === tab.type).length;
                const canAfford = remaining >= tab.cost;
                return (
                  <button key={tab.type} onClick={() => setActionType(tab.type)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      isActive
                        ? 'bg-white/[0.06] border-white/10 text-white shadow-lg'
                        : `border-transparent ${canAfford ? 'text-game-secondary hover:text-white hover:bg-white/[0.03]' : 'text-game-muted/50'}`
                    }`}>
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span className="text-[9px] text-amber-400/70">{tab.cost}PC</span>
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-game-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-lg">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hint bar */}
          <div className="px-4 py-2 bg-white/[0.01] border-b border-game-border/50">
            <p className="text-[11px] text-game-muted">
              {currentTab.icon} {currentTab.hint}
              {needsPromise && actionType !== 'voter_promise' && (
                <span className="text-amber-400 ml-2 font-medium">⚠ You must make at least 1 promise before ending your turn.</span>
              )}
            </p>
          </div>

          {/* Target selection grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {actionType === 'campaign_rally' && (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                {REGIONS.map((region, i) => {
                  const queued = pendingActions.filter(a => a.type === 'campaign_rally' && a.target === region.id).length;
                  const bonus = gameState.campaignBonuses?.[myPlayer.id]?.[region.id] ?? 0;
                  return (
                    <button key={region.id}
                      onClick={() => addAction({ type: 'campaign_rally', cost: 2, label: `Rally: ${region.name}`, target: region.id })}
                      disabled={remaining < 2}
                      className="glass-card p-3 text-left hover:border-white/10 transition-all disabled:opacity-30 animate-fade-in group"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-sm text-white">{region.name}</span>
                        <span className="text-sm font-bold text-game-muted">{region.seats} 🏛️</span>
                      </div>
                      <div className="text-[10px] text-game-muted mb-1">{region.characteristics}</div>
                      <div className="text-[10px] text-game-muted mb-2">👥 {region.dominantGroups.join(', ')}</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {bonus > 0 && <span className="text-[10px] text-emerald-400 font-medium">+{bonus}% active</span>}
                          {queued > 0 && <span className="text-[10px] bg-game-accent/20 text-game-accent px-1.5 py-0.5 rounded font-bold">{queued} queued</span>}
                        </div>
                        <span className="text-[10px] text-emerald-400/60 opacity-0 group-hover:opacity-100 transition-opacity">+8%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {actionType === 'media_blitz' && (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                {VOTER_GROUPS.map((group, i) => {
                  const queued = pendingActions.filter(a => a.type === 'media_blitz' && a.target === group.id).length;
                  const bonus = gameState.campaignBonuses?.[myPlayer.id]?.[group.id] ?? 0;
                  const mySat = gameState.voterSatisfaction?.[myPlayer.id]?.[group.id] ?? 50;
                  const oppSat = opponent ? (gameState.voterSatisfaction?.[opponent.id]?.[group.id] ?? 50) : 50;
                  const satColor = mySat > 60 ? '#10B981' : mySat > 40 ? '#F59E0B' : '#EF4444';
                  return (
                    <button key={group.id}
                      onClick={() => addAction({ type: 'media_blitz', cost: 1, label: `Media: ${group.name}`, target: group.id })}
                      disabled={remaining < 1}
                      className="glass-card p-3 text-left hover:border-white/10 transition-all disabled:opacity-30 animate-fade-in group"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-white">{group.name}</span>
                        <span className="text-[10px] text-game-muted">{(group.populationShare * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 progress-bar-track">
                          <div className="h-full progress-bar-fill" style={{ width: `${mySat}%`, backgroundColor: satColor }} />
                        </div>
                        <span className="text-[10px] font-bold tabular-nums" style={{ color: satColor }}>{mySat.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {bonus > 0 && <span className="text-[10px] text-emerald-400 font-medium">+{bonus}%</span>}
                          {queued > 0 && <span className="text-[10px] bg-game-accent/20 text-game-accent px-1.5 py-0.5 rounded font-bold">{queued}x</span>}
                        </div>
                        <span className="text-[10px] text-game-muted">opp: {oppSat.toFixed(0)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {actionType === 'voter_promise' && (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                {POLICIES
                  .filter(policy => {
                    const pledges = gameState?.pledges ?? [];
                    const alreadyPromised = pledges.some(p => p.playerId === playerId && p.policyId === policy.id);
                    const pendingPromise = pendingActions.some(a => a.type === 'voter_promise' && a.target === policy.id);
                    return !alreadyPromised && !pendingPromise;
                  })
                  .map((policy, i) => {
                    const dir = promiseDirection[policy.id] ?? 'increase';
                    return (
                      <div key={policy.id} className="glass-card p-3 transition-all hover:border-white/10 animate-fade-in"
                        style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}>
                        <div className="font-medium text-sm text-white mb-0.5">{policy.name}</div>
                        <div className="text-[10px] text-game-muted uppercase tracking-wider mb-2">{policy.category}</div>
                        <div className="flex gap-1 mb-2">
                          <button onClick={() => setPromiseDirection(prev => ({ ...prev, [policy.id]: 'increase' }))}
                            className={`flex-1 text-[10px] py-1.5 rounded-md transition-all font-medium ${
                              dir === 'increase' ? 'bg-emerald-600/70 text-white' : 'bg-white/[0.03] text-game-muted hover:text-white'
                            }`}>↑ Increase</button>
                          <button onClick={() => setPromiseDirection(prev => ({ ...prev, [policy.id]: 'decrease' }))}
                            className={`flex-1 text-[10px] py-1.5 rounded-md transition-all font-medium ${
                              dir === 'decrease' ? 'bg-red-600/70 text-white' : 'bg-white/[0.03] text-game-muted hover:text-white'
                            }`}>↓ Decrease</button>
                        </div>
                        <button
                          onClick={() => addAction({ type: 'voter_promise', cost: 1, label: `${dir === 'increase' ? '↑' : '↓'} ${policy.name}`, target: policy.id })}
                          disabled={remaining < 1}
                          className="w-full text-[11px] py-1.5 rounded-md bg-game-accent/15 hover:bg-game-accent/25 text-game-accent font-medium transition-all disabled:opacity-30">
                          Pledge • ⚡1
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            {actionType === 'attack_ad' && (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                <div className="col-span-full glass-card p-3 border-red-900/20 bg-red-950/10 mb-1">
                  <div className="text-xs text-red-400 font-medium">⚠ Negative campaigning is risky — it hurts your opponent (-4%) but also costs you credibility (-1%).</div>
                </div>
                {VOTER_GROUPS.map((group, i) => {
                  const oppSat = opponent ? (gameState.voterSatisfaction?.[opponent.id]?.[group.id] ?? 50) : 50;
                  const queued = pendingActions.filter(a => a.type === 'attack_ad' && a.target === group.id).length;
                  return (
                    <button key={group.id}
                      onClick={() => addAction({ type: 'attack_ad', cost: 2, label: `Attack: ${group.name}`, target: group.id })}
                      disabled={remaining < 2}
                      className="glass-card p-3 text-left hover:border-red-800/30 transition-all disabled:opacity-30 animate-fade-in"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-white">{group.name}</span>
                        <span className="text-[10px] text-game-muted">{(group.populationShare * 100).toFixed(0)}%</span>
                      </div>
                      <div className="text-[10px] text-game-muted mb-2">
                        {opponent?.party.partyName} support: <span className="text-red-400 font-medium">{oppSat.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-400">⚡ 2 PC</span>
                        {queued > 0 && <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded font-bold">{queued}x</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {actionType === 'fundraiser' && (() => {
              const alreadyFundraised = (gameState.campaignBonuses?.[myPlayer.id]?.['_fundraised_this_turn'] ?? 0) > 0;
              const queuedFundraiser = pendingActions.some(a => a.type === 'fundraiser');
              const canFundraise = !alreadyFundraised && !queuedFundraiser && remaining >= 1;
              return (
              <div className="max-w-md mx-auto mt-8">
                <div className="glass-card p-6 text-center bg-gradient-to-br from-amber-950/10 to-transparent border-amber-900/20">
                  <div className="text-4xl mb-3">💰</div>
                  <h3 className="text-lg font-bold text-white mb-2">Host a Fundraising Dinner</h3>
                  <p className="text-sm text-game-secondary mb-4">
                    Spend 1 PC to gain 2 PC. A net gain of +1 PC for future campaign actions.
                    Best used early in the campaign when you have turns to spend the extra capital.
                  </p>
                  <div className="text-xs text-game-muted mb-4">
                    Cost: <span className="text-amber-400">1 PC</span> → Gain: <span className="text-emerald-400">+2 PC</span> = Net: <span className="text-emerald-400 font-bold">+1 PC</span>
                  </div>
                  {alreadyFundraised ? (
                    <div className="text-xs text-amber-400 font-medium py-3">✓ Already hosted a fundraiser this turn — try again next turn</div>
                  ) : (
                    <button
                      onClick={() => addAction({ type: 'fundraiser', cost: 1, label: 'Fundraiser (+2 PC)', target: 'fundraiser' })}
                      disabled={!canFundraise}
                      className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:shadow-lg hover:shadow-amber-600/20 transition-all disabled:opacity-30">
                      {queuedFundraiser ? '✓ Queued' : 'Host Fundraiser • ⚡1'}
                    </button>
                  )}
                </div>
              </div>
              );
            })()}

            {actionType === 'endorsement' && (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                {VOTER_GROUPS.map((group, i) => {
                  const queued = pendingActions.filter(a => a.type === 'endorsement' && a.target === group.id).length;
                  const bonus = gameState.campaignBonuses?.[myPlayer.id]?.[group.id] ?? 0;
                  const groupIdx = VOTER_GROUPS.findIndex(g => g.id === group.id);
                  const prevGroup = VOTER_GROUPS[(groupIdx - 1 + VOTER_GROUPS.length) % VOTER_GROUPS.length];
                  const nextGroup = VOTER_GROUPS[(groupIdx + 1) % VOTER_GROUPS.length];
                  return (
                    <button key={group.id}
                      onClick={() => addAction({ type: 'endorsement', cost: 2, label: `Endorse: ${group.name}`, target: group.id })}
                      disabled={remaining < 2}
                      className="glass-card p-3 text-left hover:border-purple-800/30 transition-all disabled:opacity-30 animate-fade-in"
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-white">{group.name}</span>
                        <span className="text-sm">🌟</span>
                      </div>
                      <div className="text-[10px] text-game-muted mb-2">
                        +4% {group.name}, +2% {prevGroup.name}, +2% {nextGroup.name}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-400">⚡ 2 PC</span>
                        <div className="flex items-center gap-1.5">
                          {bonus > 0 && <span className="text-[10px] text-emerald-400">+{bonus}%</span>}
                          {queued > 0 && <span className="text-[10px] bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded font-bold">{queued}x</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom: action queue + controls */}
          <div className="border-t border-game-border p-3 bg-game-card/80 backdrop-blur-sm">
            {hasActedThisTurn ? (
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm text-game-secondary">
                  {opponentActed ? 'Both ready — advancing to polls...' : `Waiting for ${opponent?.party.partyName ?? 'opponent'}...`}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Pending actions display */}
                {pendingActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pendingActions.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-white/[0.04] border border-white/[0.06] text-game-secondary px-2 py-1 rounded-lg animate-fade-in">
                        {a.label}
                        <span className="text-amber-400/70">{a.cost}</span>
                        <button onClick={() => removeAction(i)} className="text-game-muted hover:text-red-400 transition-colors">✕</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Controls row */}
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-game-muted">
                    {pendingActions.length === 0
                      ? (needsPromise ? '⚠ Make at least 1 promise before ending turn' : 'Queue actions above or end turn')
                      : `${pendingActions.length} queued • ${pendingCost} PC`}
                  </div>
                  <div className="flex gap-2">
                    {pendingActions.length > 0 && (
                      <>
                        <button onClick={() => setPendingActions([])}
                          className="px-3 py-1.5 text-xs rounded-lg text-game-muted hover:text-white hover:bg-white/[0.03] transition-all">
                          Clear
                        </button>
                        <button onClick={handleSubmit}
                          className="btn-primary px-5 py-1.5 text-xs rounded-lg font-bold">
                          Submit ({pendingCost} PC)
                        </button>
                      </>
                    )}
                    <button
                      onClick={endTurnPhase}
                      disabled={needsPromise}
                      className={`px-5 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        needsPromise
                          ? 'bg-game-border/30 text-game-muted/50 cursor-not-allowed'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-game-secondary hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {needsPromise ? 'Make a Promise First' : 'End Turn →'}
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
