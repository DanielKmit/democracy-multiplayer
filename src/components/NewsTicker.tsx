'use client';

import { useGameStore } from '@/lib/store';

const typeColors: Record<string, string> = {
  bill: '#3b82f6',
  situation: '#f59e0b',
  dilemma: '#8b5cf6',
  event: '#06b6d4',
  election: '#ef4444',
  cabinet: '#10b981',
  general: '#94a3b8',
};

const typeIcons: Record<string, string> = {
  bill: '📋',
  situation: '⚠️',
  dilemma: '⚖️',
  event: '📰',
  election: '🗳️',
  cabinet: '👔',
  general: '📢',
};

export function NewsTicker() {
  const { gameState } = useGameStore();
  if (!gameState || gameState.newsTicker.length === 0) return null;

  return (
    <div className="glass-card rounded-none border-x-0 border-b-0 px-4 py-1.5 overflow-hidden">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold text-red-500 flex-shrink-0 uppercase tracking-wider">Breaking</span>
        <div className="flex gap-6 animate-ticker">
          {gameState.newsTicker.slice(0, 8).map(item => (
            <span key={item.id} className="text-xs whitespace-nowrap flex-shrink-0 flex items-center gap-1">
              <span>{typeIcons[item.type] ?? '📢'}</span>
              <span style={{ color: typeColors[item.type] ?? '#94a3b8' }}>{item.text}</span>
            </span>
          ))}
          {/* Duplicate for seamless scroll */}
          {gameState.newsTicker.slice(0, 8).map(item => (
            <span key={`dup_${item.id}`} className="text-xs whitespace-nowrap flex-shrink-0 flex items-center gap-1">
              <span>{typeIcons[item.type] ?? '📢'}</span>
              <span style={{ color: typeColors[item.type] ?? '#94a3b8' }}>{item.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
