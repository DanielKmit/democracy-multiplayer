'use client';

import { useGameStore } from '@/lib/store';

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
    <div className="bg-slate-900/80 border-t border-slate-800 px-4 py-1.5 overflow-hidden">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        <span className="text-xs font-bold text-red-500 flex-shrink-0 uppercase">Breaking</span>
        <div className="flex gap-6 animate-ticker">
          {gameState.newsTicker.slice(0, 8).map(item => (
            <span key={item.id} className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
              {typeIcons[item.type] ?? '📢'} {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
