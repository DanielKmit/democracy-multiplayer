'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { getDilemmaById } from '@/lib/engine/dilemmas';

export function DilemmaModal() {
  const { gameState, playerId } = useGameStore();
  const { resolveDilemma, endTurnPhase } = useGameActions();
  const [timeLeft, setTimeLeft] = useState(30);

  const isRuling = gameState?.players.find(p => p.id === playerId)?.role === 'ruling';
  const activeDilemma = gameState?.activeDilemma;
  const dilemma = activeDilemma ? getDilemmaById(activeDilemma.dilemmaId) : null;

  useEffect(() => {
    if (!dilemma || !isRuling) return;
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
  }, [dilemma, isRuling]);

  if (!gameState || !dilemma || !activeDilemma) return null;

  const effectsList = (effects: Record<string, number>) =>
    Object.entries(effects)
      .filter(([_, v]) => v !== 0)
      .map(([k, v]) => (
        <span key={k} className={`text-xs ${v > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {k}: {v > 0 ? '+' : ''}{v}
        </span>
      ));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="max-w-xl w-full mx-4 p-6 rounded-xl bg-slate-800 border border-amber-800/50">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{dilemma.icon}</div>
          <h2 className="text-xl font-bold mb-1">{dilemma.title}</h2>
          <p className="text-sm text-slate-400">{dilemma.description}</p>
          {isRuling && (
            <div className={`mt-2 text-sm font-mono ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
              ⏱ {timeLeft}s
            </div>
          )}
        </div>

        {isRuling ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Option A */}
            <button
              onClick={() => resolveDilemma('a')}
              className="p-4 rounded-lg border border-blue-700 bg-blue-900/20 hover:bg-blue-900/40 transition-all text-left"
            >
              <h4 className="font-semibold text-blue-300 mb-1">{dilemma.optionA.label}</h4>
              <p className="text-xs text-slate-400 mb-2">{dilemma.optionA.description}</p>
              <div className="flex flex-wrap gap-2">
                {effectsList(dilemma.optionA.effects)}
              </div>
            </button>

            {/* Option B */}
            <button
              onClick={() => resolveDilemma('b')}
              className="p-4 rounded-lg border border-red-700 bg-red-900/20 hover:bg-red-900/40 transition-all text-left"
            >
              <h4 className="font-semibold text-red-300 mb-1">{dilemma.optionB.label}</h4>
              <p className="text-xs text-slate-400 mb-2">{dilemma.optionB.description}</p>
              <div className="flex flex-wrap gap-2">
                {effectsList(dilemma.optionB.effects)}
              </div>
            </button>
          </div>
        ) : (
          <div className="text-center text-slate-400">
            <p>Waiting for the ruling party to decide...</p>
          </div>
        )}
      </div>
    </div>
  );
}
