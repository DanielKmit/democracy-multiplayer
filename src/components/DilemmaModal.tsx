'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { getDilemmaById } from '@/lib/engine/dilemmas';
import { motion, MotionButton, springs, PulseIndicator } from './Motion';

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
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

      <motion.div className="relative max-w-xl w-full mx-4 glass-card rounded-2xl overflow-hidden border border-amber-500/20"
        initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={springs.gentle}>

        {/* Header */}
        <div className="p-6 pb-4 text-center bg-gradient-to-b from-amber-950/20 to-transparent">
          <motion.div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/15 mb-3"
            initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={springs.bouncy}>
            <span className="text-3xl">{dilemma.icon}</span>
          </motion.div>
          <motion.h2 className="text-xl font-bold font-display mb-1"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.smooth, delay: 0.15 }}>
            {dilemma.title}
          </motion.h2>
          <motion.p className="text-sm text-game-secondary leading-relaxed"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            {dilemma.description}
          </motion.p>
          {canDecide && (
            <motion.div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-mono ${
              timeLeft <= 10 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/[0.03] text-game-muted border border-game-border'
            }`}
              key={timeLeft}
              initial={{ scale: timeLeft <= 10 ? 1.1 : 1 }}
              animate={{ scale: 1 }}
              transition={springs.snappy}>
              ⏱ {timeLeft}s
            </motion.div>
          )}
        </div>

        {/* Options */}
        <div className="px-6 pb-6">
          {canDecide ? (
            <motion.div className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.smooth, delay: 0.3 }}>
              {/* Option A */}
              <motion.button onClick={() => resolveDilemma('a')}
                whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.3), 0 0 30px rgba(59,130,246,0.08)' }}
                whileTap={{ scale: 0.97 }}
                transition={springs.snappy}
                className="glass-card p-4 text-left border border-blue-500/15 hover:border-blue-500/30 group rounded-xl">
                <h4 className="font-bold text-blue-300 mb-1.5 group-hover:text-blue-200">{dilemma.optionA.label}</h4>
                <p className="text-xs text-game-muted mb-3 leading-relaxed">{dilemma.optionA.description}</p>
                <div className="flex flex-wrap gap-1">
                  {renderEffects(dilemma.optionA.effects)}
                </div>
              </motion.button>

              {/* Option B */}
              <motion.button onClick={() => resolveDilemma('b')}
                whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.3), 0 0 30px rgba(239,68,68,0.08)' }}
                whileTap={{ scale: 0.97 }}
                transition={springs.snappy}
                className="glass-card p-4 text-left border border-red-500/15 hover:border-red-500/30 group rounded-xl">
                <h4 className="font-bold text-red-300 mb-1.5 group-hover:text-red-200">{dilemma.optionB.label}</h4>
                <p className="text-xs text-game-muted mb-3 leading-relaxed">{dilemma.optionB.description}</p>
                <div className="flex flex-wrap gap-1">
                  {renderEffects(dilemma.optionB.effects)}
                </div>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div className="text-center py-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={springs.smooth}>
              <div className="flex justify-center mb-3"><PulseIndicator color="amber" /></div>
              <p className="text-game-secondary">Waiting for the ruling party to decide...</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
