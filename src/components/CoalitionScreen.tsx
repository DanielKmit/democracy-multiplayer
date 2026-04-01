'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { PARTY_COLORS, BotParty, CoalitionPromise } from '@/lib/engine/types';
import { POLICIES } from '@/lib/engine/policies';
import { ParliamentHemicycle } from './ParliamentHemicycle';

export function CoalitionScreen() {
  const { gameState, playerId } = useGameStore();
  const { submitCoalitionOffer, endTurnPhase } = useGameActions();
  const [timer, setTimer] = useState(90);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [promises, setPromises] = useState<CoalitionPromise[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string>('');
  const [promiseDirection, setPromiseDirection] = useState<'increase' | 'decrease'>('increase');

  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  if (!myPlayer) return null;

  const mySeats = gameState.parliament.seatsByParty[myPlayer.id] ?? 0;
  const opponentPlayer = gameState.players.find(p => p.id !== playerId);
  const opponentSeats = opponentPlayer ? (gameState.parliament.seatsByParty[opponentPlayer.id] ?? 0) : 0;

  // Coalition seats I've secured
  const myCoalitionPartnerIds = gameState.coalitionOffers
    .filter(o => o.fromPlayerId === myPlayer.id && o.accepted)
    .map(o => o.toBotPartyId);
  const myCoalitionSeats = myCoalitionPartnerIds.reduce((sum, bpId) => {
    return sum + (gameState.parliament.seatsByParty[bpId] ?? 0);
  }, 0);
  const totalMySeats = mySeats + myCoalitionSeats;
  const needSeats = Math.max(0, 51 - totalMySeats);
  const hasReachedMajority = totalMySeats >= 51;

  // Opponent coalition seats
  const opponentCoalitionPartnerIds = gameState.coalitionOffers
    .filter(o => o.fromPlayerId === opponentPlayer?.id && o.accepted)
    .map(o => o.toBotPartyId);
  const opponentCoalitionSeats = opponentCoalitionPartnerIds.reduce((sum, bpId) => {
    return sum + (gameState.parliament.seatsByParty[bpId] ?? 0);
  }, 0);
  const totalOpponentSeats = opponentSeats + opponentCoalitionSeats;

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          endTurnPhase();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addPromise = () => {
    if (!selectedPolicy) return;
    const policy = POLICIES.find(p => p.id === selectedPolicy);
    if (!policy) return;
    // Prevent duplicate
    if (promises.some(p => p.policyId === selectedPolicy)) return;

    const promise: CoalitionPromise = {
      type: 'policy_change',
      policyId: selectedPolicy,
      direction: promiseDirection,
      targetLevel: promiseDirection === 'increase' ? 75 : 25,
      description: `${promiseDirection === 'increase' ? 'Increase' : 'Decrease'} ${policy.name}`,
    };
    setPromises(prev => [...prev, promise]);
    setSelectedPolicy('');
  };

  const removePromise = (index: number) => {
    setPromises(prev => prev.filter((_, i) => i !== index));
  };

  const handleOffer = (botPartyId: string) => {
    if (promises.length === 0) return;

    submitCoalitionOffer({
      fromPlayerId: myPlayer.id,
      toBotPartyId: botPartyId,
      promises,
      accepted: false,
      rejected: false,
    });

    setSelectedBot(null);
    setPromises([]);
    setSelectedPolicy('');
  };

  const getIdeologyLabel = (econ: number, social: number) => {
    const econLabel = econ < 35 ? 'Left' : econ > 65 ? 'Right' : 'Center';
    const socialLabel = social < 35 ? 'Auth' : social > 65 ? 'Liberal' : 'Moderate';
    return `${econLabel}-${socialLabel}`;
  };

  const getAlignmentScore = (bot: BotParty) => {
    const econDiff = Math.abs(myPlayer.party.economicAxis - bot.economicAxis);
    const socialDiff = Math.abs(myPlayer.party.socialAxis - bot.socialAxis);
    return Math.round(((200 - econDiff - socialDiff) / 200) * 100);
  };

  const getAlignmentColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const timerColor = timer <= 15 ? 'text-red-400' : timer <= 30 ? 'text-amber-400' : 'text-game-muted';
  const timerBg = timer <= 15 ? 'bg-red-950/30 border-red-800/50' : 'bg-game-card/50 border-game-border';

  return (
    <div className="h-screen bg-game-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-game-border bg-gradient-to-r from-game-card/80 to-transparent">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">🤝 Coalition Negotiation</h1>
            <p className="text-sm text-game-secondary">Secure partners to build a majority government (51+ seats)</p>
          </div>
          <div className={`${timerBg} border rounded-xl px-4 py-2 text-center ${timer <= 15 ? 'animate-pulse' : ''}`}>
            <div className={`text-2xl font-bold font-mono ${timerColor}`}>{timer}s</div>
            <div className="text-[10px] text-game-muted">remaining</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: seat tracker */}
        <div className="w-72 border-r border-game-border bg-game-card/30 overflow-y-auto p-4 space-y-4">
          {/* My coalition progress */}
          <div className={`glass-card p-4 ${hasReachedMajority ? 'ring-1 ring-emerald-500 bg-emerald-950/20' : ''}`}>
            <div className="text-xs text-game-secondary font-bold uppercase tracking-wider mb-3">Your Coalition</div>
            <div className="text-center mb-3">
              <div className="text-4xl font-bold" style={{ color: hasReachedMajority ? '#10B981' : PARTY_COLORS[myPlayer.party.partyColor] }}>
                {totalMySeats}
              </div>
              <div className="text-xs text-game-muted">of 51 needed</div>
            </div>
            {/* Progress bar with majority marker */}
            <div className="relative mb-2">
              <div className="w-full h-3 bg-game-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 relative"
                  style={{
                    width: `${Math.min(100, totalMySeats)}%`,
                    backgroundColor: hasReachedMajority ? '#10B981' : PARTY_COLORS[myPlayer.party.partyColor],
                  }}
                />
              </div>
              {/* Majority line marker */}
              <div className="absolute top-0 h-3 w-0.5 bg-amber-400" style={{ left: '51%' }} />
            </div>
            <div className="flex justify-between text-[10px] text-game-muted">
              <span>0</span>
              <span className="text-amber-400 font-bold">51</span>
              <span>100</span>
            </div>

            {/* Breakdown */}
            <div className="mt-3 pt-3 border-t border-game-border space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-game-muted">{myPlayer.party.partyName}</span>
                <span className="font-bold" style={{ color: PARTY_COLORS[myPlayer.party.partyColor] }}>{mySeats}</span>
              </div>
              {myCoalitionPartnerIds.map(bpId => {
                const bot = gameState.botParties.find(b => b.id === bpId);
                if (!bot) return null;
                return (
                  <div key={bpId} className="flex justify-between text-xs">
                    <span className="text-emerald-400">+ {bot.name}</span>
                    <span className="font-bold text-emerald-400">{gameState.parliament.seatsByParty[bpId] ?? 0}</span>
                  </div>
                );
              })}
              {needSeats > 0 && (
                <div className="flex justify-between text-xs text-red-400">
                  <span>Still needed</span>
                  <span className="font-bold">{needSeats}</span>
                </div>
              )}
            </div>
          </div>

          {/* Opponent tracker */}
          {opponentPlayer && (
            <div className="glass-card p-3">
              <div className="text-xs text-game-muted mb-2">Opponent&apos;s Coalition</div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-game-secondary">{opponentPlayer.party.partyName}</span>
                <span className="text-lg font-bold" style={{ color: PARTY_COLORS[opponentPlayer.party.partyColor] }}>
                  {totalOpponentSeats}
                </span>
              </div>
              <div className="w-full h-1.5 bg-game-border rounded-full overflow-hidden mt-1.5">
                <div className="h-full rounded-full transition-all duration-700" style={{
                  width: `${Math.min(100, totalOpponentSeats)}%`,
                  backgroundColor: PARTY_COLORS[opponentPlayer.party.partyColor],
                }} />
              </div>
            </div>
          )}

          {/* Parliament */}
          <div className="glass-card p-3">
            <div className="text-xs text-game-secondary font-bold uppercase tracking-wider mb-2">Parliament</div>
            <ParliamentHemicycle compact />
          </div>
        </div>

        {/* Main content: bot party cards */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-sm font-bold text-game-secondary uppercase tracking-wider mb-4">Available Coalition Partners</h3>
            <div className="space-y-3">
              {gameState.botParties.map(bot => {
                const botSeats = gameState.parliament.seatsByParty[bot.id] ?? 0;
                const isAlreadyPartner = myCoalitionPartnerIds.includes(bot.id);
                const wasRejected = gameState.coalitionOffers.some(
                  o => o.fromPlayerId === myPlayer.id && o.toBotPartyId === bot.id && o.rejected
                );
                const hasPendingOffer = gameState.coalitionOffers.some(
                  o => o.fromPlayerId === myPlayer.id && o.toBotPartyId === bot.id && !o.accepted && !o.rejected
                );
                const opponentHasPendingOffer = gameState.coalitionOffers.some(
                  o => o.fromPlayerId !== myPlayer.id && o.toBotPartyId === bot.id && !o.accepted && !o.rejected
                );
                const isCoalitionedByOpponent = opponentCoalitionPartnerIds.includes(bot.id);
                const isSelected = selectedBot === bot.id;
                const alignment = getAlignmentScore(bot);
                const alignColor = getAlignmentColor(alignment);
                const unavailable = isAlreadyPartner || wasRejected || isCoalitionedByOpponent || hasPendingOffer;

                return (
                  <div key={bot.id} className={`glass-card overflow-hidden transition-all ${
                    isAlreadyPartner ? 'ring-1 ring-emerald-500/60 bg-emerald-950/10' :
                    wasRejected ? 'opacity-40' :
                    isCoalitionedByOpponent ? 'opacity-50' :
                    isSelected ? 'ring-2 ring-game-accent shadow-lg shadow-game-accent/10' :
                    'hover:ring-1 hover:ring-game-border cursor-pointer'
                  }`}>
                    {/* Card header */}
                    <div
                      className={`p-4 ${!unavailable ? 'cursor-pointer' : ''}`}
                      onClick={() => !unavailable && setSelectedBot(isSelected ? null : bot.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Party icon */}
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                          style={{ backgroundColor: bot.color + '20', border: `2px solid ${bot.color}40` }}>
                          {bot.logo === 'tree' ? '🌳' : bot.logo === 'shield' ? '🛡️' : bot.logo === 'fist' ? '✊' : '⚖️'}
                        </div>

                        {/* Party info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-white">{bot.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-game-border/60 text-game-muted">
                              {getIdeologyLabel(bot.economicAxis, bot.socialAxis)}
                            </span>
                          </div>
                          <div className="text-xs text-game-muted mb-1.5">Led by {bot.leaderName}</div>
                          <div className="flex flex-wrap gap-1">
                            {bot.manifesto.map(m => (
                              <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-md border border-game-border/60 text-game-secondary">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Seats + alignment */}
                        <div className="text-right shrink-0">
                          <div className="text-3xl font-bold mb-0.5" style={{ color: bot.color }}>
                            {botSeats}
                          </div>
                          <div className="text-[10px] text-game-muted mb-1">seats</div>
                          <div className={`text-xs font-bold ${alignColor}`}>
                            {alignment}% aligned
                          </div>
                        </div>
                      </div>

                      {/* Status badges */}
                      {isAlreadyPartner && (
                        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/30">
                          <span className="text-emerald-400 text-sm">✅</span>
                          <span className="text-xs text-emerald-400 font-bold">Coalition Partner — {botSeats} seats secured</span>
                        </div>
                      )}
                      {wasRejected && (
                        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-red-950/30 border border-red-800/30">
                          <span className="text-red-400 text-sm">❌</span>
                          <span className="text-xs text-red-400 font-medium">Rejected your offer — they won&apos;t negotiate further</span>
                        </div>
                      )}
                      {isCoalitionedByOpponent && (
                        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-orange-950/30 border border-orange-800/30">
                          <span className="text-orange-400 text-sm">🔒</span>
                          <span className="text-xs text-orange-400 font-medium">Already joined {opponentPlayer?.party.partyName}&apos;s coalition</span>
                        </div>
                      )}
                      {hasPendingOffer && (
                        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-blue-950/30 border border-blue-800/30">
                          <span className="text-blue-400 text-sm">📨</span>
                          <span className="text-xs text-blue-400 font-medium">Offer submitted — will be evaluated when negotiations end</span>
                          {opponentHasPendingOffer && <span className="text-[10px] text-amber-400 ml-auto">⚔️ Competing offer!</span>}
                        </div>
                      )}
                    </div>

                    {/* Expanded offer form */}
                    {isSelected && !unavailable && (
                      <div className="px-4 pb-4 border-t border-game-border/50 bg-game-card/30">
                        <div className="pt-4 space-y-3">
                          <div className="text-sm font-bold text-game-secondary">Make Policy Promises</div>
                          <p className="text-xs text-game-muted mb-2">
                            Offer policy changes to improve your chances. Click a suggested promise below or add custom ones.
                          </p>

                          {/* Quick-add suggested promises based on bot preferences */}
                          <div className="space-y-1">
                            <div className="text-[10px] text-game-muted font-bold uppercase tracking-wider">🎯 {bot.name} wants:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(bot.policyPreferences).slice(0, 6).map(([policyId, prefValue]) => {
                                const policy = POLICIES.find(p => p.id === policyId);
                                if (!policy) return null;
                                const alreadyAdded = promises.some(p => p.policyId === policyId);
                                const dir = prefValue > 50 ? 'increase' : 'decrease';
                                return (
                                  <button key={policyId}
                                    disabled={alreadyAdded}
                                    onClick={() => {
                                      if (alreadyAdded) return;
                                      const promise: CoalitionPromise = {
                                        type: 'policy_change',
                                        policyId,
                                        direction: dir as 'increase' | 'decrease',
                                        targetLevel: prefValue > 50 ? 75 : 25,
                                        description: `${dir === 'increase' ? 'Increase' : 'Decrease'} ${policy.name}`,
                                      };
                                      setPromises(prev => [...prev, promise]);
                                    }}
                                    className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${
                                      alreadyAdded
                                        ? 'bg-game-accent/10 text-game-accent border border-game-accent/30'
                                        : dir === 'increase'
                                          ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30 hover:bg-emerald-900/50'
                                          : 'bg-red-900/30 text-red-400 border border-red-800/30 hover:bg-red-900/50'
                                    }`}>
                                    {alreadyAdded ? '✓' : dir === 'increase' ? '↑' : '↓'} {policy.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Current promises */}
                          {promises.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {promises.map((p, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-game-accent/10 border border-game-accent/30 text-game-accent px-2 py-1 rounded-lg">
                                  {p.direction === 'increase' ? '↑' : '↓'} {POLICIES.find(pol => pol.id === p.policyId)?.name ?? p.policyId}
                                  <button onClick={() => removePromise(i)} className="text-game-muted hover:text-red-400">✕</button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Add promise */}
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="text-[10px] text-game-muted mb-1 block">Policy</label>
                              <select
                                value={selectedPolicy}
                                onChange={e => setSelectedPolicy(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg bg-game-bg border border-game-border text-white"
                              >
                                <option value="">Select policy...</option>
                                {POLICIES.filter(p => !promises.some(pr => pr.policyId === p.id)).map(p => (
                                  <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setPromiseDirection('increase')}
                                className={`text-xs px-3 py-2 rounded-lg transition-all ${
                                  promiseDirection === 'increase' ? 'bg-emerald-600 text-white' : 'bg-game-border text-game-muted hover:text-white'
                                }`}>
                                ↑
                              </button>
                              <button
                                onClick={() => setPromiseDirection('decrease')}
                                className={`text-xs px-3 py-2 rounded-lg transition-all ${
                                  promiseDirection === 'decrease' ? 'bg-red-600 text-white' : 'bg-game-border text-game-muted hover:text-white'
                                }`}>
                                ↓
                              </button>
                            </div>
                            <button
                              onClick={addPromise}
                              disabled={!selectedPolicy}
                              className="text-xs px-3 py-2 rounded-lg bg-game-accent/20 text-game-accent hover:bg-game-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
                            >
                              + Add
                            </button>
                          </div>

                          {/* Submit offer */}
                          <button
                            onClick={() => handleOffer(bot.id)}
                            disabled={promises.length === 0}
                            className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                              promises.length > 0
                                ? 'bg-gradient-to-r from-game-accent to-blue-500 text-white hover:shadow-lg hover:shadow-game-accent/20'
                                : 'bg-game-border text-game-muted cursor-not-allowed'
                            }`}
                          >
                            {promises.length === 0
                              ? 'Add at least one promise to make an offer'
                              : `🤝 Offer Coalition Deal (${promises.length} promise${promises.length > 1 ? 's' : ''})`}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: form government button */}
      <div className="border-t border-game-border p-4 bg-game-card/80 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm text-game-secondary">
            {hasReachedMajority
              ? <span className="text-emerald-400 font-bold">✓ Majority secured with {totalMySeats} seats!</span>
              : <span>Form a minority government with {totalMySeats}/51 seats (bills will be harder to pass)</span>}
          </div>
          <button
            onClick={endTurnPhase}
            className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${
              hasReachedMajority
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40'
                : 'bg-game-border hover:bg-game-muted/20 text-game-secondary hover:text-white'
            }`}
          >
            {hasReachedMajority ? '🏛️ Form Government →' : 'Form Minority Government →'}
          </button>
        </div>
      </div>
    </div>
  );
}
