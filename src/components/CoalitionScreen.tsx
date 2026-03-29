'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { PARTY_COLORS, BotParty, CoalitionPromise } from '@/lib/engine/types';
import { POLICIES } from '@/lib/engine/policies';
import { ParliamentHemicycle } from './ParliamentHemicycle';
import { getPartyLogo } from './icons/PartyLogos';

export function CoalitionScreen() {
  const { gameState, playerId } = useGameStore();
  const { submitCoalitionOffer, endTurnPhase } = useGameActions();
  const [timer, setTimer] = useState(60);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
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
  const needSeats = 51 - totalMySeats;

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

  const handleOffer = (botPartyId: string) => {
    if (!selectedPolicy) return;

    const policy = POLICIES.find(p => p.id === selectedPolicy);
    if (!policy) return;

    const promise: CoalitionPromise = {
      type: 'policy_change',
      policyId: selectedPolicy,
      direction: promiseDirection,
      targetLevel: promiseDirection === 'increase' ? 75 : 25,
      description: `${promiseDirection === 'increase' ? 'Increase' : 'Decrease'} ${policy.name}`,
    };

    submitCoalitionOffer({
      fromPlayerId: myPlayer.id,
      toBotPartyId: botPartyId,
      promises: [promise],
      accepted: false,
      rejected: false,
    });

    setSelectedBot(null);
    setSelectedPolicy('');
  };

  const hasReachedMajority = totalMySeats >= 51;

  return (
    <div className="h-screen bg-game-bg flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold font-display mb-2">🤝 Coalition Negotiation</h1>
          <p className="text-game-secondary">Build a majority government — you need 51 seats</p>
          <div className={`mt-2 text-sm font-mono ${timer <= 15 ? 'text-red-400 animate-pulse' : 'text-game-muted'}`}>
            ⏱ {timer}s remaining
          </div>
        </div>

        {/* Seat count progress */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-game-secondary">Your coalition: <span className="text-white font-bold">{totalMySeats} seats</span></span>
            <span className="text-sm text-game-secondary">Need: <span className={needSeats <= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{needSeats <= 0 ? 'MAJORITY ✓' : `${needSeats} more`}</span></span>
          </div>
          <div className="w-full h-3 bg-game-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (totalMySeats / 100) * 100)}%`,
                backgroundColor: totalMySeats >= 51 ? '#10B981' : PARTY_COLORS[myPlayer.party.partyColor],
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-game-muted mt-1">
            <span>0</span>
            <span className="text-amber-400">51 (majority)</span>
            <span>100</span>
          </div>
        </div>

        {/* Parliament hemicycle */}
        <div className="glass-card p-4 mb-6">
          <ParliamentHemicycle />
        </div>

        {/* Seat breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Human players */}
          {gameState.players.map(p => (
            <div key={p.id} className={`glass-card p-3 ${p.id === myPlayer.id ? 'ring-1 ring-game-accent' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PARTY_COLORS[p.party.partyColor] }} />
                <span className="text-sm font-bold text-white">{p.party.partyName}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: PARTY_COLORS[p.party.partyColor] }}>
                {gameState.parliament.seatsByParty[p.id] ?? 0} <span className="text-xs text-game-muted">seats</span>
              </div>
              {p.id === myPlayer.id && myCoalitionSeats > 0 && (
                <div className="text-xs text-emerald-400 mt-1">+{myCoalitionSeats} coalition</div>
              )}
            </div>
          ))}
        </div>

        {/* Bot party cards */}
        <h3 className="text-sm font-bold text-game-secondary uppercase tracking-wider mb-3">Available Coalition Partners</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {gameState.botParties.map(bot => {
            const botSeats = gameState.parliament.seatsByParty[bot.id] ?? 0;
            const isAlreadyPartner = myCoalitionPartnerIds.includes(bot.id);
            const wasRejected = gameState.coalitionOffers.some(
              o => o.fromPlayerId === myPlayer.id && o.toBotPartyId === bot.id && o.rejected
            );
            const isPending = gameState.coalitionOffers.some(
              o => o.fromPlayerId === myPlayer.id && o.toBotPartyId === bot.id && !o.accepted && !o.rejected
            );

            return (
              <div
                key={bot.id}
                className={`glass-card p-4 transition-all cursor-pointer ${
                  isAlreadyPartner ? 'ring-1 ring-emerald-500 bg-emerald-950/20' :
                  wasRejected ? 'opacity-50' :
                  selectedBot === bot.id ? 'ring-1 ring-game-accent' : 'hover:ring-1 hover:ring-game-border'
                }`}
                onClick={() => !isAlreadyPartner && !wasRejected && setSelectedBot(bot.id)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: bot.color + '30', border: `2px solid ${bot.color}` }}>
                    {bot.logo === 'tree' ? '🌳' : bot.logo === 'shield' ? '🛡️' : bot.logo === 'fist' ? '✊' : '⚖️'}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{bot.name}</div>
                    <div className="text-xs text-game-muted">{bot.leaderName}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xl font-bold" style={{ color: bot.color }}>
                      {botSeats}
                    </div>
                    <div className="text-[10px] text-game-muted">seats</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {bot.manifesto.map(m => (
                    <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-game-border/50 text-game-secondary">
                      {m}
                    </span>
                  ))}
                </div>

                {isAlreadyPartner && (
                  <div className="text-xs text-emerald-400 font-bold">✅ Coalition partner</div>
                )}
                {wasRejected && (
                  <div className="text-xs text-red-400">❌ Rejected your offer</div>
                )}
                {isPending && (
                  <div className="text-xs text-amber-400">⏳ Evaluating offer...</div>
                )}

                {/* Offer UI */}
                {selectedBot === bot.id && !isAlreadyPartner && !wasRejected && (
                  <div className="mt-3 pt-3 border-t border-game-border animate-fade-in">
                    <div className="text-xs text-game-secondary mb-2">Make a policy promise:</div>
                    <select
                      value={selectedPolicy}
                      onChange={e => setSelectedPolicy(e.target.value)}
                      className="w-full text-xs p-2 rounded bg-game-bg border border-game-border text-white mb-2"
                    >
                      <option value="">Select policy...</option>
                      {POLICIES.slice(0, 20).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPromiseDirection('increase'); }}
                        className={`flex-1 text-xs py-1 rounded ${promiseDirection === 'increase' ? 'bg-emerald-600 text-white' : 'bg-game-border text-game-muted'}`}
                      >
                        ↑ Increase
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPromiseDirection('decrease'); }}
                        className={`flex-1 text-xs py-1 rounded ${promiseDirection === 'decrease' ? 'bg-red-600 text-white' : 'bg-game-border text-game-muted'}`}
                      >
                        ↓ Decrease
                      </button>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOffer(bot.id); }}
                      disabled={!selectedPolicy}
                      className="w-full text-xs py-2 rounded bg-game-accent hover:bg-blue-500 disabled:bg-game-border disabled:text-game-muted text-white font-bold transition-all"
                    >
                      Offer Coalition Deal
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Done button */}
        <div className="text-center">
          <button
            onClick={endTurnPhase}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              hasReachedMajority
                ? 'btn-primary animate-pulse'
                : 'bg-game-border hover:bg-game-muted/20 text-game-secondary'
            }`}
          >
            {hasReachedMajority ? '🏛️ Form Government →' : 'Form Minority Government →'}
          </button>
          {!hasReachedMajority && (
            <p className="text-xs text-game-muted mt-2">
              Without a majority, governing will be harder — bills are less likely to pass
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
