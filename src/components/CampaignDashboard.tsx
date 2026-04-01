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

  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  if (!myPlayer) return null;

  const pc = myPlayer.politicalCapital;
  const pendingCost = pendingActions.reduce((s, a) => s + a.cost, 0);
  const remaining = pc - pendingCost;
  const hasActedThisTurn = gameState.campaignActedThisTurn?.[myPlayer.id] ?? false;
  const opponent = gameState.players.find(p => p.id !== myPlayer.id);
  const opponentActed = opponent ? (gameState.campaignActedThisTurn?.[opponent.id] ?? false) : true;

  // Count promises made this campaign turn (submitted + pending)
  const submittedPromisesThisTurn = (gameState.pledges ?? []).filter(
    p => p.playerId === myPlayer.id && p.madeOnTurn === gameState.turn
  ).length;
  const pendingPromises = pendingActions.filter(a => a.type === 'voter_promise').length;
  const promisesThisTurn = submittedPromisesThisTurn + pendingPromises;
  const canEndTurn = promisesThisTurn >= 1;

  const addAction = (action: PendingAction) => {
    if (pendingCost + action.cost <= pc) {
      setPendingActions(prev => [...prev, action]);
    }
  };

  const handleSubmit = () => {
    const actions: CampaignAction[] = pendingActions.map(a => ({
      type: a.type,
      cost: a.cost,
      targetRegionId: a.type === 'campaign_rally' ? a.target : undefined,
      targetGroupId: a.type === 'media_blitz' ? a.target : undefined,
      promisePolicyId: a.type === 'voter_promise' ? a.target : undefined,
      promiseDirection: 'increase',
    }));
    submitCampaignActions(actions);
    setPendingActions([]);
  };

  // Vote share for my party
  const myVoteShare = gameState.voteShares?.[myPlayer.id] ?? 0;

  return (
    <div className="h-screen flex flex-col bg-game-bg text-white overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Vote standings */}
        <div className="w-80 border-r border-game-border bg-game-card/50 overflow-y-auto p-4 space-y-4">
          <h3 className="text-xs font-bold text-game-secondary uppercase tracking-wider">📊 Current Standings</h3>

          <div className="space-y-2">
            {(() => {
            const partyList: { id: string; name: string; color: string }[] = [
              ...gameState.players.map(p => ({ id: p.id, name: p.party.partyName, color: PARTY_COLORS[p.party.partyColor] })),
              ...gameState.botParties.map(b => ({ id: b.id, name: b.name, color: b.color })),
            ];
            return partyList.sort((a, b) => (gameState.voteShares?.[b.id] ?? 0) - (gameState.voteShares?.[a.id] ?? 0));
          })().map((entity) => {
              const color = entity.color;
              const name = entity.name;
              const share = gameState.voteShares?.[entity.id] ?? 0;

              return (
                <div key={entity.id} className="glass-card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm font-medium text-white">{name}</span>
                      {entity.id === myPlayer.id && <span className="text-[9px] text-game-accent">(YOU)</span>}
                    </div>
                    <span className="text-sm font-bold" style={{ color }}>{share.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-game-border rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${share}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {gameState.parliament.seats.length > 0 && (
            <>
              <h3 className="text-xs font-bold text-game-secondary uppercase tracking-wider">🏛️ Caretaker Parliament</h3>
              <ParliamentHemicycle compact />
            </>
          )}

          <div className="glass-card p-3">
            <div className="text-xs text-game-muted">Election in</div>
            <div className="text-2xl font-bold text-amber-400">{gameState.turnsUntilElection} turns</div>
          </div>
        </div>

        {/* Center: Campaign actions */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-game-border">
            <h2 className="text-xl font-bold font-display mb-1">📢 Campaign Phase — Turn {gameState.turn}</h2>
            <p className="text-sm text-game-secondary">
              Win voter support before the election. No policies yet — that comes after you win!
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Action type tabs */}
            <div className="flex gap-2">
              {[
                { type: 'campaign_rally' as ActionType, label: '🎪 Rally', desc: 'Target a region' },
                { type: 'media_blitz' as ActionType, label: '📺 Media Blitz', desc: 'Target voter group' },
                { type: 'voter_promise' as ActionType, label: '📢 Promise', desc: 'Promise policy change' },
              ].map(({ type, label }) => (
                <button key={type} onClick={() => setActionType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    actionType === type ? 'bg-game-accent text-white' : 'glass-card text-game-secondary hover:text-white'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Target selection */}
            {actionType === 'campaign_rally' && (
              <div className="grid grid-cols-2 gap-3">
                {REGIONS.map(region => (
                  <button key={region.id}
                    onClick={() => addAction({ type: 'campaign_rally', cost: 2, label: `Rally in ${region.name}`, target: region.id })}
                    disabled={remaining < 2}
                    className="glass-card p-3 text-left hover:ring-1 hover:ring-game-accent transition-all disabled:opacity-40">
                    <div className="font-medium text-sm text-white">{region.name}</div>
                    <div className="text-[10px] text-game-muted">{region.seats} seats • {region.characteristics}</div>
                    <div className="text-xs text-amber-400 mt-1">⚡ 2 PC</div>
                  </button>
                ))}
              </div>
            )}

            {actionType === 'media_blitz' && (
              <div className="grid grid-cols-2 gap-3">
                {VOTER_GROUPS.map(group => (
                  <button key={group.id}
                    onClick={() => addAction({ type: 'media_blitz', cost: 1, label: `Media: ${group.name}`, target: group.id })}
                    disabled={remaining < 1}
                    className="glass-card p-3 text-left hover:ring-1 hover:ring-game-accent transition-all disabled:opacity-40">
                    <div className="font-medium text-sm text-white">{group.name}</div>
                    <div className="text-[10px] text-game-muted">{(group.populationShare * 100).toFixed(0)}% of population</div>
                    <div className="text-xs text-amber-400 mt-1">⚡ 1 PC</div>
                  </button>
                ))}
              </div>
            )}

            {actionType === 'voter_promise' && (
              <div className="grid grid-cols-2 gap-3">
                {POLICIES
                  .filter(policy => {
                    // Filter out policies the player has already promised
                    const pledges = gameState?.pledges ?? [];
                    const alreadyPromised = pledges.some(
                      p => p.playerId === playerId && p.policyId === policy.id
                    );
                    // Also filter policies already queued in pending actions
                    const pendingPromise = pendingActions.some(
                      a => a.type === 'voter_promise' && a.target === policy.id
                    );
                    return !alreadyPromised && !pendingPromise;
                  })
                  .map(policy => (
                  <button key={policy.id}
                    onClick={() => addAction({ type: 'voter_promise', cost: 1, label: `Promise: ${policy.name}`, target: policy.id })}
                    disabled={remaining < 1}
                    className="glass-card p-3 text-left hover:ring-1 hover:ring-game-accent transition-all disabled:opacity-40">
                    <div className="font-medium text-sm text-white">{policy.name}</div>
                    <div className="text-[10px] text-game-muted">{policy.category}</div>
                    <div className="text-xs text-amber-400 mt-1">⚡ 1 PC</div>
                  </button>
                ))}
                {POLICIES.every(policy => {
                  const pledges = gameState?.pledges ?? [];
                  return pledges.some(p => p.playerId === playerId && p.policyId === policy.id);
                }) && (
                  <div className="col-span-2 text-center text-sm text-game-muted py-4">
                    ✅ You&apos;ve promised all available policies
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom: pending + submit */}
          <div className="border-t border-game-border p-3 bg-game-card/50">
            {hasActedThisTurn ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm text-game-secondary">
                  {opponentActed
                    ? 'Both ready — advancing...'
                    : `Waiting for ${opponent?.party.partyName ?? 'opponent'} to finish their campaign actions...`}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {pendingActions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {pendingActions.map((a, i) => (
                        <span key={i} className="text-xs glass-card px-2 py-1 text-game-accent">
                          {a.label} ({a.cost} PC)
                          <button onClick={() => setPendingActions(prev => prev.filter((_, j) => j !== i))}
                            className="ml-1 text-game-muted hover:text-red-400">✕</button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-game-muted">Select campaign actions or pass</span>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <span className="text-xs text-game-muted self-center">
                    PC: <span className={`font-bold ${remaining >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{remaining}</span>/{pc}
                  </span>
                  {pendingActions.length > 0 && (
                    <button onClick={handleSubmit} className="btn-primary px-4 py-2 text-xs rounded-lg font-medium">
                      Submit ({pendingCost} PC)
                    </button>
                  )}
                  {!canEndTurn && (
                    <span className="text-yellow-400 text-[10px] self-center max-w-[140px] leading-tight">
                      ⚠️ Make at least 1 campaign promise before ending your turn
                    </span>
                  )}
                  <button
                    onClick={endTurnPhase}
                    disabled={!canEndTurn}
                    className={`px-4 py-2 text-xs rounded-lg transition-all ${
                      canEndTurn
                        ? 'bg-game-border hover:bg-game-muted/20'
                        : 'bg-game-border/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {!canEndTurn
                      ? 'Make 1 promise first'
                      : pendingActions.length > 0 ? 'Skip' : 'End Turn →'}
                  </button>
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
