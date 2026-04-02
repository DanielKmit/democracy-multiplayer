'use client';

import { motion, springs } from './Motion';

/**
 * Animated radial gauge — AA-quality stat visualization.
 * Renders an SVG arc with spring-animated fill and glow.
 */
export function RadialGauge({
  value, max = 100, size = 48, strokeWidth = 3,
  color = '#3b82f6', label, showValue = true, format,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showValue?: boolean;
  format?: (v: number) => string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, value / max));
  const offset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Animated fill arc */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={springs.smooth}
            style={{ filter: `drop-shadow(0 0 4px ${color}50)` }}
          />
        </svg>

        {/* Center value */}
        {showValue && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center text-white font-bold"
            style={{ fontSize: size * 0.25 }}
            key={Math.round(value)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springs.snappy}
          >
            {format ? format(value) : Math.round(value)}
          </motion.div>
        )}

        {/* Glow ring at high values */}
        {progress > 0.8 && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                `0 0 ${size * 0.1}px ${color}20`,
                `0 0 ${size * 0.2}px ${color}30`,
                `0 0 ${size * 0.1}px ${color}20`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {/* Label */}
      {label && (
        <span className="text-[10px] text-game-muted uppercase tracking-wider font-medium">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Horizontal stat bar — compact version for tight spaces.
 */
export function StatBar({
  value, max = 100, color = '#3b82f6', label, suffix = '',
}: {
  value: number;
  max?: number;
  color?: string;
  label: string;
  suffix?: string;
}) {
  const progress = Math.max(0, Math.min(1, value / max));
  const isNegative = value < 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-game-secondary">{label}</span>
        <motion.span
          className="text-xs font-bold"
          style={{ color }}
          key={Math.round(value * 10)}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.snappy}
        >
          {isNegative ? '' : '+'}{typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}{suffix}
        </motion.span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={springs.smooth}
        />
      </div>
    </div>
  );
}
