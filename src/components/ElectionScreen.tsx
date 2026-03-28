'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { REGIONS } from '@/lib/engine/regions';
import { PARTY_COLORS } from '@/lib/engine/types';
import { ParliamentHemicycle } from './ParliamentHemicycle';

export function ElectionScreen() {
  const { gameState, playerId } = useGameStore();
  const { endTurnPhase } = useGameActions();
  const [revealIndex, setRevealIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (!gameState) return null;

  const latestElection = gameState.electionHistory[gameState.electionHistory.length - 1];
  if (!latestElection) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);

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
  const won = mySeats >= 51;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-2">🗳️ Election Results</h1>
      <p className="text-slate-400 mb-8">Republic of Novaria — Turn {latestElection.turn}</p>

      {/* Region by region results */}
      <div className="w-full max-w-3xl space-y-3 mb-8">
        {REGIONS.map((region, i) => {
          if (i >= revealIndex) {
            return (
              <div key={region.id} className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg opacity-30">
                <div className="text-sm text-slate-500">{region.name} ({region.seats} seats)</div>
                <div className="w-full h-4 bg-slate-700 rounded-full mt-1" />
              </div>
            );
          }

          const regionVotes = latestElection.voteShares[region.id] ?? {};
          const regionSeats = latestElection.seatResults[region.id] ?? {};

          return (
            <div key={region.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg animate-slide-in">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300 font-medium">{region.name}</span>
                <span className="text-xs text-slate-500">{region.seats} seats</span>
              </div>
              <div className="w-full h-5 bg-slate-700 rounded-full overflow-hidden flex mb-1">
                {gameState.players.map(player => {
                  const share = regionVotes[player.id] ?? 0;
                  return (
                    <div
                      key={player.id}
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${share}%`,
                        backgroundColor: PARTY_COLORS[player.party.partyColor],
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs">
                {gameState.players.map(player => (
                  <span key={player.id} style={{ color: PARTY_COLORS[player.party.partyColor] }}>
                    {player.party.partyName}: {regionSeats[player.id] ?? 0} seats ({(regionVotes[player.id] ?? 0).toFixed(1)}%)
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Result */}
      {revealed && (
        <div className="text-center animate-fade-in max-w-lg">
          <div className="text-6xl mb-4">{won ? '🎉' : '😔'}</div>

          {/* Parliament hemicycle */}
          <div className="mb-4">
            <ParliamentHemicycle />
          </div>

          {/* Seat totals */}
          <div className="flex justify-center gap-8 mb-4">
            {gameState.players.map(player => (
              <div key={player.id} className="text-center">
                <div className="text-2xl font-bold" style={{ color: PARTY_COLORS[player.party.partyColor] }}>
                  {latestElection.totalSeats[player.id] ?? 0}
                </div>
                <div className="text-xs text-slate-400">{player.party.partyName}</div>
              </div>
            ))}
          </div>

          <p className="text-xl font-bold mb-2">
            {latestElection.swapped ? '🔄 Power changes hands!' : '🏛️ Government retained!'}
          </p>

          <div className="text-sm text-slate-400 mb-6">
            Election {gameState.electionHistory.length} of 3
          </div>

          <button
            onClick={endTurnPhase}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all"
          >
            {gameState.electionHistory.length >= 3 ? 'See Final Results' : 'Continue →'}
          </button>
        </div>
      )}
    </div>
  );
}
