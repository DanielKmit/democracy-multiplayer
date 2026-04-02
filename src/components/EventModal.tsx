'use client';

import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { motion, MotionButton, MotionList, MotionListItem, springs } from './Motion';

const SIM_VAR_LABELS: Record<string, string> = {
  gdpGrowth: 'GDP Growth',
  unemployment: 'Unemployment',
  inflation: 'Inflation',
  crime: 'Crime Rate',
  pollution: 'Pollution',
  equality: 'Equality',
  healthIndex: 'Public Health',
  educationIndex: 'Education',
  freedomIndex: 'Freedom',
  nationalSecurity: 'National Security',
  corruption: 'Corruption',
};

export function EventModal() {
  const { gameState } = useGameStore();
  const { acknowledgeEvent } = useGameActions();
  if (!gameState || !gameState.currentEvent) return null;

  const event = gameState.currentEvent;
  const isPositive = event.approvalImpact > 0;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Backdrop */}
      <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

      {/* Card */}
      <motion.div className={`relative max-w-md w-full mx-4 glass-card rounded-2xl overflow-hidden border ${
        isPositive ? 'border-emerald-500/20' : 'border-red-500/20'
      }`}
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springs.gentle}>

        {/* Header */}
        <div className={`p-6 pb-4 text-center ${isPositive ? 'bg-gradient-to-b from-emerald-950/20 to-transparent' : 'bg-gradient-to-b from-red-950/20 to-transparent'}`}>
          <motion.div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
            isPositive ? 'bg-emerald-500/10 border border-emerald-500/15' : 'bg-red-500/10 border border-red-500/15'
          }`}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={springs.bouncy}>
            <span className="text-4xl">{isPositive ? '📈' : '📉'}</span>
          </motion.div>
          <motion.h2 className="text-xl font-bold font-display mb-1"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.smooth, delay: 0.15 }}>
            {event.name}
          </motion.h2>
          <motion.p className="text-sm text-game-secondary leading-relaxed"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            {event.description}
          </motion.p>
        </div>

        {/* Effects */}
        <div className="px-6 pb-6">
          <motion.div className="rounded-xl bg-game-bg/50 border border-game-border/50 p-4 mb-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.smooth, delay: 0.2 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-label">Effects</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] text-game-muted font-medium">
                {event.duration} turn{event.duration !== 1 ? 's' : ''}
              </span>
            </div>
            <MotionList className="space-y-2">
              {Object.entries(event.effects).map(([key, val]) => {
                const value = val as number;
                const label = SIM_VAR_LABELS[key] ?? key;
                const inversed = ['unemployment', 'crime', 'pollution', 'corruption', 'inflation'].includes(key);
                const isGood = inversed ? value < 0 : value > 0;
                return (
                  <MotionListItem key={key}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-game-secondary">{label}</span>
                      <motion.span className={`text-sm font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}
                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={springs.snappy}>
                        {value > 0 ? '+' : ''}{value}
                      </motion.span>
                    </div>
                  </MotionListItem>
                );
              })}
              {event.approvalImpact !== 0 && (
                <MotionListItem>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-game-border/30">
                    <span className="text-sm text-game-secondary">Approval Rating</span>
                    <motion.span className={`text-sm font-bold ${event.approvalImpact > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={springs.bouncy}>
                      {event.approvalImpact > 0 ? '+' : ''}{event.approvalImpact}%
                    </motion.span>
                  </div>
                </MotionListItem>
              )}
            </MotionList>
          </motion.div>

          <MotionButton variant="primary" onClick={acknowledgeEvent}
            className="w-full py-3 rounded-xl font-semibold text-sm">
            Acknowledged →
          </MotionButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
