'use client';

import { useGameStore } from '@/lib/store';
import { PARTY_COLORS } from '@/lib/engine/types';
import { ParliamentHemicycle } from './ParliamentHemicycle';

export function GameOverScreen() {
  const { gameState, playerId } = useGameStore();
  if (!gameState) return null;

  const p1 = gameState.players[0];
  const p2 = gameState.players[1];

  const winner = p1 && p2
    ? (p1.termsWon > p2.termsWon ? p1 : p2.termsWon > p1.termsWon ? p2 : null)
    : null;

  const isMe = winner?.id === playerId;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center animate-fade-in max-w-lg">
        <div className="text-7xl mb-6">{isMe ? '🏆' : winner ? '😔' : '🤝'}</div>

        <h1 className="text-4xl font-bold mb-4">
          {winner ? (
            <span style={{ color: PARTY_COLORS[winner.party.partyColor] }}>
              {winner.party.partyName} Wins!
            </span>
          ) : "It's a Tie!"}
        </h1>

        <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
          <h3 className="text-sm text-slate-500 uppercase tracking-wider mb-4">Final Scoreboard</h3>

          <div className="grid grid-cols-2 gap-4">
            {gameState.players.map(p => (
              <div
                key={p.id}
                className="p-4 rounded-lg border"
                style={{
                  borderColor: p.id === winner?.id ? PARTY_COLORS[p.party.partyColor] : '#334155',
                  backgroundColor: p.id === winner?.id ? PARTY_COLORS[p.party.partyColor] + '15' : 'transparent',
                }}
              >
                <div className="text-lg font-bold mb-1" style={{ color: PARTY_COLORS[p.party.partyColor] }}>
                  {p.party.partyName}
                </div>
                <div className="text-xs text-slate-400 mb-2">{p.name}</div>
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {p.termsWon} {p.termsWon === 1 ? 'term' : 'terms'}
                </div>
                {p.id === winner?.id && <span className="text-xs text-yellow-400">👑 Winner</span>}
              </div>
            ))}
          </div>

          {/* Parliament */}
          <div className="mt-4">
            <ParliamentHemicycle compact />
          </div>

          {/* Election history */}
          <div className="mt-6">
            <h4 className="text-xs text-slate-500 uppercase mb-2">Election History</h4>
            {gameState.electionHistory.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-slate-700 last:border-0">
                <span className="text-slate-400">Election {i + 1}</span>
                <div className="flex gap-2">
                  {gameState.players.map(p => (
                    <span key={p.id} style={{ color: PARTY_COLORS[p.party.partyColor] }}>
                      {e.totalSeats[p.id] ?? 0} seats
                    </span>
                  ))}
                  {e.swapped && <span className="text-yellow-400">🔄</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-slate-500 mb-4">
            Final: GDP {gameState.simulation.gdpGrowth.toFixed(1)}% | Debt {gameState.budget.debtToGdp.toFixed(0)}% | Ruling Approval {gameState.rulingApproval ?? 50}%
          </div>
          <a href="/" className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all">
            Play Again
          </a>
        </div>
      </div>
    </div>
  );
}
