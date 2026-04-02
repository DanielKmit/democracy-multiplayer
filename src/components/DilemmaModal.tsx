'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { getDilemmaById } from '@/lib/engine/dilemmas';

const SIM_VAR_LABELS: Record<string, string> = {
  gdpGrowth: 'GDP Growth', unemployment: 'Unemployment', inflation: 'Inflation',
  crime: 'Crime', pollution: 'Pollution', equality: 'Equality',
  healthIndex: 'Health', educationIndex: 'Education', freedomIndex: 'Freedom',
  nationalSecurity: 'Security', corruption: 'Corruption',
};

export function DilemmaModal() {
  const { gameState, playerId } = useGameStore();
  const { resolveDilemma, endTurnPhase } = useGameActions();
  const [timeLeft, setTimeLeft] = useState(30);

  const isRuling = gameState?.players.find(p => p.id === playerId)?.role === 'ruling';
  // During campaign (no ruling), allow host to decide
  const canDecide = isRuling || (!gameState?.players.some(p => p.role === 'ruling') && playerId === 'host');
  const activeDilemma = gameState?.activeDilemma;
  const dilemma = activeDilemma ? getDilemmaById(activeDilemma.dilemmaId) : null;

  useEffect(() => {
    if (!dilemma || !canDecide) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          resolveDilemma(dilemma.defaultOption);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [dilemma, canDecide]);

  if (!gameState || !dilemma || !activeDilemma) return null;

  const inversedVars = ['unemployment', 'crime', 'pollution', 'corruption', 'inflation'];

  const renderEffects = (effects: Record<string, number>) =>
    Object.entries(effects)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => {
        const isGood = inversedVars.includes(k) ? v < 0 : v > 0;
        return (
          <span key={k} className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
            isGood ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                   : 'bg-red-500/10 text-red-400 border border-red-500/15'
          }`}>
            {SIM_VAR_LABELS[k] ?? k}: {v > 0 ? '+' : ''}{v}
          </span>
        );
      });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="max-w-xl w-full mx-4 glass-card rounded-2xl overflow-hidden border border-amber-800/30 animate-fade-in-scale">
        {/* Header */}
        <div className="p-6 pb-4 text-center bg-gradient-to-b from-amber-950/30 to-transparent">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-900/30 border border-amber-800/30 mb-3">
            <span className="text-3xl">{dilemma.icon}</span>
          </div>
          <h2 className="text-xl font-bold font-display mb-1">{dilemma.title}</h2>
          <p className="text-sm text-game-secondary leading-relaxed">{dilemma.description}</p>
          {canDecide && (
            <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-mono ${
              timeLeft <= 10 ? 'bg-red-900/30 text-red-400 border border-red-800/30 animate-pulse' : 'bg-game-card text-game-muted border border-game-border'
            }`}>
              ⏱ {timeLeft}s
            </div>
          )}
        </div>

        {/* Options */}
        <div className="px-6 pb-6">
          {canDecide ? (
            <div className="grid grid-cols-2 gap-3">
              {/* Option A */}
              <button onClick={() => resolveDilemma('a')}
                className="glass-card p-4 text-left border border-blue-800/30 hover:border-blue-600/50 hover:bg-blue-950/20 transition-all group rounded-xl">
                <h4 className="font-bold text-blue-300 mb-1.5 group-hover:text-blue-200 transition-colors">{dilemma.optionA.label}</h4>
                <p className="text-[11px] text-game-muted mb-3 leading-relaxed">{dilemma.optionA.description}</p>
                <div className="flex flex-wrap gap-1">
                  {renderEffects(dilemma.optionA.effects)}
                </div>
              </button>

              {/* Option B */}
              <button onClick={() => resolveDilemma('b')}
                className="glass-card p-4 text-left border border-red-800/30 hover:border-red-600/50 hover:bg-red-950/20 transition-all group rounded-xl">
                <h4 className="font-bold text-red-300 mb-1.5 group-hover:text-red-200 transition-colors">{dilemma.optionB.label}</h4>
                <p className="text-[11px] text-game-muted mb-3 leading-relaxed">{dilemma.optionB.description}</p>
                <div className="flex flex-wrap gap-1">
                  {renderEffects(dilemma.optionB.effects)}
                </div>
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-4xl mb-3 animate-pulse">⏳</div>
              <p className="text-game-secondary">Waiting for the ruling party to decide...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
