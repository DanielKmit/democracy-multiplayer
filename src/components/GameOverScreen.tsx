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

  useEffect(() => {
    const timer = setTimeout(() => { playSfx?.('notification'); }, 500);
    return () => clearTimeout(timer);
  }, [playSfx]);

  if (!gameState) return null;

  const p1 = gameState.players[0];
  const p2 = gameState.players[1];
  const victoryType = gameState.gameSettings?.victoryCondition ?? 'electoral';
  const victoryCondition = VICTORY_CONDITIONS.find(vc => vc.type === victoryType);

  let winner = null;
  if (victoryType === 'electoral') {
    winner = p1 && p2 ? (p1.termsWon > p2.termsWon ? p1 : p2.termsWon > p1.termsWon ? p2 : null) : null;
  } else if (victoryCondition) {
    for (const p of gameState.players) {
      if (victoryCondition.checkVictory(gameState, p.id)) { winner = p; break; }
    }
    if (!winner && p1 && p2) {
      winner = p1.termsWon > p2.termsWon ? p1 : p2.termsWon > p1.termsWon ? p2 : null;
    }
  }

  const isMe = winner?.id === playerId;

  const handlePlayAgain = () => { clearPersistedState(); window.location.href = '/'; };

  const totalTurns = gameState.turn;
  const totalElections = gameState.electionHistory.length;
  const passedBills = gameState.activeBills.filter(b => b.status === 'passed').length;
  const failedBills = gameState.activeBills.filter(b => b.status === 'failed' || b.status === 'filibustered' || b.status === 'vetoed').length;

  return (
    <div className="min-h-screen bg-game-bg bg-dot-grid bg-gradient-mesh flex items-center justify-center p-4">
      <div className="text-center animate-fade-in max-w-2xl w-full">
        {/* Trophy */}
        <div className="relative inline-block mb-6">
          <div className="text-8xl animate-bounce" style={{ animationDuration: '2s' }}>
            {isMe ? '🏆' : winner ? '😔' : '🤝'}
          </div>
          {isMe && <div className="absolute -top-2 -right-2 text-3xl animate-spin" style={{ animationDuration: '3s' }}>✨</div>}
        </div>

        <h1 className="text-5xl font-bold mb-2 font-display">
          {winner ? (
            <span style={{ color: PARTY_COLORS[winner.party.partyColor] }}>{winner.party.partyName} Wins!</span>
          ) : "It's a Tie!"}
        </h1>
        {winner && (
          <p className="text-game-secondary text-lg mb-8">
            {isMe ? 'Congratulations! You led your nation to victory.' : 'Better luck next time, Prime Minister.'}
          </p>
        )}

        {/* Scoreboard */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h3 className="text-[10px] text-game-muted uppercase tracking-wider font-bold mb-4">Final Scoreboard</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {gameState.players.map(p => (
              <div key={p.id} className="glass-card p-5 rounded-xl border-2 transition-all"
                style={{
                  borderColor: p.id === winner?.id ? PARTY_COLORS[p.party.partyColor] : 'var(--game-border)',
                  backgroundColor: p.id === winner?.id ? PARTY_COLORS[p.party.partyColor] + '10' : 'transparent',
                }}>
                <div className="text-xl font-bold mb-1 font-display" style={{ color: PARTY_COLORS[p.party.partyColor] }}>
                  {p.party.partyName}
                </div>
                <div className="text-xs text-game-muted mb-3">{p.name} • {p.id === gameState.aiPlayerId ? '🤖 AI' : '👤 Player'}</div>
                <div className="text-4xl font-bold text-amber-400 mb-2">
                  {p.termsWon} {p.termsWon === 1 ? 'term' : 'terms'}
                </div>
                <div className="text-xs text-game-muted">PC earned: ⚡{p.politicalCapital}</div>
                {p.id === winner?.id && <div className="mt-2 text-sm text-amber-400 font-semibold">👑 Winner</div>}
              </div>
            ))}
          </div>

          <div className="mb-6"><ParliamentHemicycle compact /></div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { value: totalTurns, label: 'Turns', color: 'text-white' },
              { value: totalElections, label: 'Elections', color: 'text-white' },
              { value: passedBills, label: 'Passed', color: 'text-emerald-400' },
              { value: failedBills, label: 'Failed', color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="stat-card !py-3">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-game-muted">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Election history */}
          {gameState.electionHistory.length > 0 && (
            <div>
              <h4 className="text-[10px] text-game-muted uppercase tracking-wider font-bold mb-2">Election History</h4>
              <div className="space-y-1">
                {gameState.electionHistory.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg glass-card">
                    <span className="text-game-muted text-xs">Election {i + 1}</span>
                    <div className="flex gap-3 items-center">
                      {gameState.players.map(p => (
                        <span key={p.id} className="text-xs font-medium" style={{ color: PARTY_COLORS[p.party.partyColor] }}>
                          {e.totalSeats[p.id] ?? 0} seats
                        </span>
                      ))}
                      {e.swapped && <span className="text-amber-400 text-xs">🔄</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Final stats */}
        <div className="glass-card rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-5 text-sm">
            {[
              { label: 'GDP', value: `${gameState.simulation.gdpGrowth > 0 ? '+' : ''}${gameState.simulation.gdpGrowth.toFixed(1)}%`, good: gameState.simulation.gdpGrowth > 0 },
              { label: 'Debt', value: `${gameState.budget.debtToGdp.toFixed(0)}%`, good: gameState.budget.debtToGdp < 60 },
              { label: 'Approval', value: `${gameState.rulingApproval ?? 50}%`, good: (gameState.rulingApproval ?? 50) > 50 },
              { label: 'Jobs', value: `${(100 - gameState.simulation.unemployment).toFixed(0)}%`, good: gameState.simulation.unemployment < 8 },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                {i > 0 && <div className="w-px h-8 bg-game-border" />}
                <div className="text-center">
                  <div className={`font-bold ${s.good ? 'text-emerald-400' : 'text-red-400'}`}>{s.value}</div>
                  <div className="text-[10px] text-game-muted">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={handlePlayAgain}
            className="btn-primary px-8 py-3 rounded-xl font-semibold text-lg">
            🎮 Play Again
          </button>
          <a href="/"
            className="px-6 py-3 glass-card rounded-xl font-medium text-game-secondary hover:text-white transition-all">
            ← Main Menu
          </a>
        </div>
      </div>
    </div>
  );
}
