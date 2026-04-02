'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { REGIONS } from '@/lib/engine/regions';
import { PARTY_COLORS } from '@/lib/engine/types';
import { ParliamentHemicycle } from './ParliamentHemicycle';
import { ElectionShareCard } from './ElectionShareCard';

export function ElectionScreen() {
  const { gameState, playerId } = useGameStore();
  const { endTurnPhase } = useGameActions();
  const [revealIndex, setRevealIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  if (!gameState) return null;

  const latestElection = gameState.electionHistory[gameState.electionHistory.length - 1];
  if (!latestElection) return null;

  // Build ALL parties list
  const allParties: { id: string; name: string; color: string }[] = [
    ...gameState.players.map(p => ({
      id: p.id, name: p.party.partyName, color: PARTY_COLORS[p.party.partyColor],
    })),
    ...gameState.botParties.map(b => ({
      id: b.id, name: b.name, color: b.color,
    })),
  ];

  useEffect(() => {
    if (revealIndex < REGIONS.length) {
      const timer = setTimeout(() => setRevealIndex(i => i + 1), 500);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setRevealed(true), 800);
      return () => clearTimeout(timer);
    }
  }, [revealIndex]);

  const mySeats = latestElection.totalSeats[playerId ?? ''] ?? 0;

  return (
    <div className="min-h-screen bg-game-bg flex flex-col items-center justify-center p-8 overflow-y-auto">
      <h1 className="text-3xl font-bold font-display mb-2">🗳️ Election Results</h1>
      <p className="text-game-secondary mb-8">Republic of Novaria — Turn {latestElection.turn}</p>

      {/* Region by region results */}
      <div className="w-full max-w-3xl space-y-3 mb-8">
        {REGIONS.map((region, i) => {
          if (i >= revealIndex) {
            return (
              <div key={region.id} className="p-3 glass-card rounded-xl opacity-30">
                <div className="text-sm text-game-muted">{region.name} ({region.seats} seats)</div>
                <div className="w-full h-4 bg-game-border rounded-full mt-1" />
              </div>
            );
          }

          const regionVotes = latestElection.voteShares[region.id] ?? {};
          const regionSeats = latestElection.seatResults[region.id] ?? {};

          return (
            <div key={region.id} className="p-3 glass-card rounded-xl animate-slide-in">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white font-medium">{region.name}</span>
                <span className="text-xs text-game-muted">{region.seats} seats</span>
              </div>
              {/* Stacked vote bar */}
              <div className="w-full h-5 bg-game-border rounded-full overflow-hidden flex mb-1">
                {allParties.map(party => {
                  const share = regionVotes[party.id] ?? 0;
                  if (share < 1) return null;
                  return (
                    <div
                      key={party.id}
                      className="h-full transition-all duration-700"
                      style={{ width: `${share}%`, backgroundColor: party.color }}
                    />
                  );
                })}
              </div>
              {/* Per-party seat counts */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                {allParties.map(party => {
                  const seats = regionSeats[party.id] ?? 0;
                  if (seats === 0) return null;
                  const vote = regionVotes[party.id] ?? 0;
                  return (
                    <span key={party.id} style={{ color: party.color }}>
                      {party.name}: {seats} ({vote.toFixed(1)}%)
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Result */}
      {revealed && (
        <div className="text-center animate-fade-in max-w-lg">
          {/* Parliament hemicycle */}
          <div className="mb-6">
            <ParliamentHemicycle />
          </div>

          {/* Seat totals — ALL parties */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {allParties
              .sort((a, b) => (latestElection.totalSeats[b.id] ?? 0) - (latestElection.totalSeats[a.id] ?? 0))
              .map(party => (
                <div key={party.id} className="text-center glass-card px-4 py-2 rounded-xl">
                  <div className="text-2xl font-bold" style={{ color: party.color }}>
                    {latestElection.totalSeats[party.id] ?? 0}
                  </div>
                  <div className="text-xs text-game-secondary">{party.name}</div>
                </div>
              ))}
          </div>

          <p className="text-xl font-bold font-display mb-2">
            No party has a majority — coalition negotiation begins!
          </p>

          <div className="text-sm text-game-muted mb-6">
            Election {gameState.electionHistory.length} of 3 • Need 51 seats for majority
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowShareCard(true)}
              className="px-6 py-3 glass-card rounded-lg font-semibold transition-all cursor-pointer text-game-secondary hover:text-white"
            >
              📸 Share Results
            </button>
            <button
              onClick={endTurnPhase}
              className="btn-primary px-8 py-3 rounded-lg font-semibold cursor-pointer"
            >
              {gameState.electionHistory.length >= 3 ? 'See Final Results' : 'Begin Coalition Talks →'}
            </button>
          </div>

          {showShareCard && <ElectionShareCard onClose={() => setShowShareCard(false)} />}
        </div>
      )}
    </div>
  );
}
