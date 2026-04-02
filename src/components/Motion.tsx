'use client';

import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';
import { type ReactNode } from 'react';

// ---- Spring presets ----

export const springs = {
  /** Snappy — buttons, tabs, small elements */
  snappy: { type: 'spring', stiffness: 500, damping: 30, mass: 1 } as Transition,
  /** Smooth — cards, panels, medium elements */
  smooth: { type: 'spring', stiffness: 300, damping: 30, mass: 1 } as Transition,
  /** Gentle — modals, full-screen transitions */
  gentle: { type: 'spring', stiffness: 200, damping: 25, mass: 1 } as Transition,
  /** Bouncy — celebratory elements, notifications */
  bouncy: { type: 'spring', stiffness: 400, damping: 15, mass: 1 } as Transition,
};

// ---- Variant presets ----

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.85 },
};

// ---- Stagger container ----

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// ---- Reusable components ----

/** Animated presence wrapper for page/modal transitions */
export function MotionPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeUp}
      transition={springs.smooth}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Glass card with hover lift + glow */
export function MotionCard({
  children, className, onClick, delay = 0, glow,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
  glow?: 'blue' | 'red' | 'green' | 'purple' | 'amber';
}) {
  const glowColor = glow ? {
    blue: 'rgba(59, 130, 246, 0.08)',
    red: 'rgba(239, 68, 68, 0.08)',
    green: 'rgba(16, 185, 129, 0.08)',
    purple: 'rgba(168, 85, 247, 0.08)',
    amber: 'rgba(245, 158, 11, 0.08)',
  }[glow] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.smooth, delay }}
      whileHover={{
        y: -2,
        boxShadow: glowColor
          ? `0 8px 30px rgba(0,0,0,0.4), 0 0 40px ${glowColor}`
          : '0 8px 30px rgba(0,0,0,0.4)',
        transition: springs.snappy,
      }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`glass-card ${className ?? ''}`}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      {children}
    </motion.div>
  );
}

/** Animated button with spring press */
export function MotionButton({
  children, className, onClick, disabled, variant = 'primary',
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-tertiary',
  }[variant];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={springs.snappy}
      className={`${variantClass} ${className ?? ''}`}
    >
      {children}
    </motion.button>
  );
}

/** Number counter with spring animation */
export function MotionNumber({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.snappy}
      className={className}
    >
      {value}
    </motion.span>
  );
}

/** Animated list with stagger */
export function MotionList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionListItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerItem}
      transition={springs.smooth}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Modal with backdrop blur + scale-in */
export function MotionModal({
  children, onClose, className,
}: {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={springs.gentle}
          className={`relative z-10 ${className ?? ''}`}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Phase transition wrapper — swaps content with crossfade */
export function PhaseTransition({ phaseKey, children }: { phaseKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phaseKey}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={springs.smooth}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Progress bar with spring fill */
export function MotionProgress({
  value, max = 100, color = 'blue', className,
}: {
  value: number;
  max?: number;
  color?: 'blue' | 'red' | 'green' | 'amber' | 'purple';
  className?: string;
}) {
  const colorClass = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
  }[color];

  return (
    <div className={`progress-bar-track h-1.5 ${className ?? ''}`}>
      <motion.div
        className={`h-full rounded-full ${colorClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${(value / max) * 100}%` }}
        transition={springs.smooth}
      />
    </div>
  );
}

/** Pulse indicator — live status dot */
export function PulseIndicator({ color = 'blue' }: { color?: 'blue' | 'red' | 'green' | 'amber' }) {
  const hex = { blue: '#3b82f6', red: '#ef4444', green: '#10b981', amber: '#f59e0b' }[color];
  return (
    <motion.div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: hex }}
      animate={{
        boxShadow: [
          `0 0 0 0 ${hex}40`,
          `0 0 0 6px ${hex}00`,
        ],
      }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

export { motion, AnimatePresence };
