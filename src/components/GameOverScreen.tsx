'use client';

import { useGameStore } from '@/lib/store';
import { PARTY_COLORS } from '@/lib/engine/types';
import { VICTORY_CONDITIONS } from '@/lib/engine/victoryConditions';
import { ParliamentHemicycle } from './ParliamentHemicycle';
import { clearPersistedState } from '@/lib/gameHost';
import { useAudio } from './AudioManager';
import { useEffect } from 'react';

export function GameOverScreen() {
  const { gameState, playerId } = useGameStore();
  const { playSfx } = useAudio();
  
  // Play victory/defeat sound on mount
  useEffect(() => {
    // Small delay for dramatic effect
    const timer = setTimeout(() => {
      playSfx?.('notification');
    }, 500);
    return () => clearTimeout(timer);
  }, [playSfx]);

  if (!gameState) return null;

  const p1 = gameState.players[0];
  const p2 = gameState.players[1];

  const victoryType = gameState.gameSettings?.victoryCondition ?? 'electoral';
  const victoryCondition = VICTORY_CONDITIONS.find(vc => vc.type === victoryType);

  // Determine winner based on victory condition
  let winner = null;
  if (victoryType === 'electoral') {
    winner = p1 && p2
      ? (p1.termsWon > p2.termsWon ? p1 : p2.termsWon > p1.termsWon ? p2 : null)
      : null;
  } else if (victoryCondition) {
    for (const p of gameState.players) {
      if (victoryCondition.checkVictory(gameState, p.id)) {
        winner = p;
        break;
      }
    }
    if (!winner && p1 && p2) {
      winner = p1.termsWon > p2.termsWon ? p1 : p2.termsWon > p1.termsWon ? p2 : null;
    }
  }

  const isMe = winner?.id === playerId;

  const handlePlayAgain = () => {
    clearPersistedState();
    window.location.href = '/';
  };

  // Calculate game stats
  const totalTurns = gameState.turn;
  const totalElections = gameState.electionHistory.length;
  const totalBills = gameState.activeBills.length;
  const passedBills = gameState.activeBills.filter(b => b.status === 'passed').length;
  const failedBills = gameState.activeBills.filter(b => b.status === 'failed' || b.status === 'filibustered' || b.status === 'vetoed').length;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center animate-fade-in max-w-2xl w-full">
        {/* Trophy animation */}
        <div className="relative inline-block mb-6">
          <div className="text-8xl animate-bounce" style={{ animationDuration: '2s' }}>
            {isMe ? '🏆' : winner ? '😔' : '🤝'}
          </div>
          {isMe && (
            <div className="absolute -top-2 -right-2 text-3xl animate-spin" style={{ animationDuration: '3s' }}>
              ✨
            </div>
          )}
        </div>

        <h1 className="text-5xl font-bold mb-2 font-display">
          {winner ? (
            <span style={{ color: PARTY_COLORS[winner.party.partyColor] }}>
              {winner.party.partyName} Wins!
            </span>
          ) : "It's a Tie!"}
        </h1>
        
        {winner && (
          <p className="text-slate-400 text-lg mb-8">
            {isMe ? 'Congratulations! You led your nation to victory.' : 'Better luck next time, Prime Minister.'}
          </p>
        )}

        {/* Final Scoreboard */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-slate-700/50">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-4">Final Scoreboard</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {gameState.players.map(p => (
              <div
                key={p.id}
                className="p-5 rounded-xl border-2 transition-all"
                style={{
                  borderColor: p.id === winner?.id ? PARTY_COLORS[p.party.partyColor] : '#334155',
                  backgroundColor: p.id === winner?.id ? PARTY_COLORS[p.party.partyColor] + '15' : 'rgba(30,41,59,0.5)',
                }}
              >
                <div className="text-xl font-bold mb-1 font-display" style={{ color: PARTY_COLORS[p.party.partyColor] }}>
                  {p.party.partyName}
                </div>
                <div className="text-xs text-slate-400 mb-3">{p.name} • {p.id === gameState.aiPlayerId ? '🤖 AI' : '👤 Player'}</div>
                <div className="text-4xl font-bold text-yellow-400 mb-2">
                  {p.termsWon} {p.termsWon === 1 ? 'term' : 'terms'}
                </div>
                <div className="text-xs text-slate-500">
                  PC earned: ⚡{p.politicalCapital}
                </div>
                {p.id === winner?.id && (
                  <div className="mt-2 text-sm text-yellow-400 font-semibold">👑 Winner</div>
                )}
              </div>
            ))}
          </div>

          {/* Parliament visualization */}
          <div className="mb-6">
            <ParliamentHemicycle compact />
          </div>

          {/* Game Statistics */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{totalTurns}</div>
              <div className="text-[10px] text-slate-400">Turns Played</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{totalElections}</div>
              <div className="text-[10px] text-slate-400">Elections</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{passedBills}</div>
              <div className="text-[10px] text-slate-400">Bills Passed</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-400">{failedBills}</div>
              <div className="text-[10px] text-slate-400">Bills Failed</div>
            </div>
          </div>

          {/* Election history */}
          {gameState.electionHistory.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-500 uppercase mb-3 tracking-wider">Election History</h4>
              <div className="space-y-1">
                {gameState.electionHistory.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-slate-700/20 hover:bg-slate-700/30 transition-colors">
                    <span className="text-slate-400 text-xs">Election {i + 1}</span>
                    <div className="flex gap-3 items-center">
                      {gameState.players.map(p => (
                        <span key={p.id} className="text-xs font-medium" style={{ color: PARTY_COLORS[p.party.partyColor] }}>
                          {e.totalSeats[p.id] ?? 0} seats
                        </span>
                      ))}
                      {e.swapped && <span className="text-yellow-400 text-xs">🔄 Power shift</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Final state summary */}
        <div className="bg-slate-800/30 rounded-xl p-4 mb-6 border border-slate-700/30">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <div className={`font-bold ${gameState.simulation.gdpGrowth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {gameState.simulation.gdpGrowth > 0 ? '+' : ''}{gameState.simulation.gdpGrowth.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500">GDP Growth</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <div className={`font-bold ${gameState.budget.debtToGdp < 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                {gameState.budget.debtToGdp.toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-500">National Debt</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <div className={`font-bold ${(gameState.rulingApproval ?? 50) > 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {gameState.rulingApproval ?? 50}%
              </div>
              <div className="text-[10px] text-slate-500">Final Approval</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <div className={`font-bold ${gameState.simulation.unemployment < 8 ? 'text-emerald-400' : 'text-red-400'}`}>
                {gameState.simulation.unemployment.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500">Unemployment</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handlePlayAgain}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] text-lg"
          >
            🎮 Play Again
          </button>
          <a
            href="/"
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-medium transition-all text-slate-300"
          >
            ← Main Menu
          </a>
        </div>
      </div>
    </div>
  );
}
