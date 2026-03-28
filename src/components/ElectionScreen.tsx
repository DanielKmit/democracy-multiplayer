'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { VOTER_GROUPS } from '@/lib/engine/voters';

export function ElectionScreen() {
  const { gameState, playerId } = useGameStore();
  const [revealed, setRevealed] = useState(false);
  const [revealIndex, setRevealIndex] = useState(0);

  if (!gameState) return null;

  const latestElection = gameState.electionHistory[gameState.electionHistory.length - 1];
  if (!latestElection) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);

  // Animate group reveals
  useEffect(() => {
    if (revealIndex < VOTER_GROUPS.length) {
      const timer = setTimeout(() => setRevealIndex(i => i + 1), 400);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setRevealed(true), 800);
      return () => clearTimeout(timer);
    }
  }, [revealIndex]);

  const won = (myPlayer?.role === 'ruling' && latestElection.winner === 'ruling') ||
              (myPlayer?.role === 'opposition' && latestElection.winner === 'opposition');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">🗳️ Election Results</h1>

      {/* Group by group results */}
      <div className="w-full max-w-2xl space-y-3 mb-8">
        {VOTER_GROUPS.map((group, i) => {
          const result = latestElection.groupResults[group.id];
          if (!result || i >= revealIndex) {
            return (
              <div key={group.id} className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg opacity-30">
                <div className="text-sm text-slate-500">{group.name}</div>
                <div className="w-full h-4 bg-slate-700 rounded-full mt-1" />
              </div>
            );
          }

          return (
            <div key={group.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg animate-slide-in">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{group.name}</span>
                <span className="text-xs text-slate-500">{(group.populationShare * 100).toFixed(0)}% weight</span>
              </div>
              <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${result.ruling}%` }}
                />
                <div
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${result.opposition}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-0.5">
                <span className="text-blue-400">{result.ruling.toFixed(1)}%</span>
                <span className="text-red-400">{result.opposition.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Result */}
      {revealed && (
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-4">{won ? '🎉' : '😔'}</div>
          <div className="text-xl mb-2">
            <span className="text-blue-400 font-bold">{latestElection.rulingVoteShare}%</span>
            {' vs '}
            <span className="text-red-400 font-bold">{latestElection.oppositionVoteShare}%</span>
          </div>
          <p className="text-2xl font-bold mb-2">
            {latestElection.winner === 'ruling' ? '🏛️ Ruling Party Wins!' : '⚔️ Opposition Wins!'}
          </p>
          {latestElection.swapped && (
            <p className="text-yellow-400 mb-4">🔄 Roles have been swapped!</p>
          )}

          <div className="text-sm text-slate-400 mb-6">
            Election {gameState.electionHistory.length} of 3
          </div>

          <button
            onClick={() => getSocket().emit('endTurnPhase')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all"
          >
            {gameState.electionHistory.length >= 3 ? 'See Final Results' : 'Continue to Next Term →'}
          </button>
        </div>
      )}
    </div>
  );
}
