'use client';

import { motion, AnimatePresence, springs } from './Motion';

const PHASE_CONFIG: Record<string, { title: string; subtitle: string; icon: string; color: string; gradient: string }> = {
  ruling: { title: 'Your Turn', subtitle: 'Set policies and propose bills', icon: '👑', color: '#3b82f6',
    gradient: 'from-blue-900/40 via-blue-950/20 to-transparent' },
  opposition: { title: 'Opposition Turn', subtitle: 'Challenge the government', icon: '⚔️', color: '#ef4444',
    gradient: 'from-red-900/40 via-red-950/20 to-transparent' },
  events: { title: 'Events', subtitle: 'The world reacts', icon: '📰', color: '#f59e0b',
    gradient: 'from-amber-900/40 via-amber-950/20 to-transparent' },
  polling: { title: 'Polling', subtitle: 'The people have spoken', icon: '📊', color: '#8b5cf6',
    gradient: 'from-purple-900/40 via-purple-950/20 to-transparent' },
  election: { title: 'Election Day', subtitle: 'The fate of Novaria is decided', icon: '🗳️', color: '#10b981',
    gradient: 'from-emerald-900/40 via-emerald-950/20 to-transparent' },
  campaigning: { title: 'Campaign Season', subtitle: 'Win hearts and minds', icon: '📢', color: '#f97316',
    gradient: 'from-orange-900/40 via-orange-950/20 to-transparent' },
  debate: { title: 'National Debate', subtitle: 'Make your case to the nation', icon: '🎤', color: '#06b6d4',
    gradient: 'from-cyan-900/40 via-cyan-950/20 to-transparent' },
  coalition_negotiation: { title: 'Coalition Talks', subtitle: 'Build your alliance', icon: '🤝', color: '#a855f7',
    gradient: 'from-purple-900/40 via-purple-950/20 to-transparent' },
  government_formation: { title: 'Form Government', subtitle: 'Appoint your cabinet', icon: '🏛️', color: '#3b82f6',
    gradient: 'from-blue-900/40 via-blue-950/20 to-transparent' },
  dilemma: { title: 'Dilemma', subtitle: 'A critical decision awaits', icon: '⚖️', color: '#eab308',
    gradient: 'from-yellow-900/40 via-yellow-950/20 to-transparent' },
};

/**
 * Cinematic full-screen overlay that plays briefly when the game phase changes.
 * Shows phase title, icon, and a dramatic gradient wipe.
 */
export function PhaseOverlay({ phase, turn }: { phase: string; turn: number }) {
  const config = PHASE_CONFIG[phase];
  if (!config) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={`${phase}-${turn}`}
        className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Dramatic gradient wipe */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-b ${config.gradient}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2, times: [0, 0.15, 0.7, 1] }}
        />

        {/* Horizontal light streak */}
        <motion.div
          className="absolute left-0 right-0 h-[1px]"
          style={{ top: '50%', background: `linear-gradient(90deg, transparent, ${config.color}40, transparent)` }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1.2, 1], opacity: [0, 0.8, 0] }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />

        {/* Content */}
        <div className="relative text-center">
          {/* Icon */}
          <motion.div
            className="text-6xl mb-4"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.2, 1], rotate: [0, 5, 0] }}
            transition={{ ...springs.bouncy, duration: 0.6 }}
          >
            {config.icon}
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-4xl font-bold font-display tracking-tight mb-2"
            style={{ color: config.color }}
            initial={{ opacity: 0, y: 20, letterSpacing: '0.2em' }}
            animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -10], letterSpacing: ['0.2em', '0.05em', '0.05em', '0em'] }}
            transition={{ duration: 2, times: [0, 0.2, 0.7, 1] }}
          >
            {config.title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-game-secondary text-sm tracking-wide"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: [0, 0.8, 0.8, 0], y: [10, 0, 0, -5] }}
            transition={{ duration: 2, times: [0, 0.25, 0.7, 1] }}
          >
            {config.subtitle}
          </motion.p>

          {/* Turn counter */}
          <motion.div
            className="mt-4 text-xs text-game-muted font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.5, 0] }}
            transition={{ duration: 2, times: [0, 0.3, 0.7, 1] }}
          >
            Turn {turn}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
