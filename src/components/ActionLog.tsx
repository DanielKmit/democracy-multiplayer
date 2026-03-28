'use client';

import { useGameStore } from '@/lib/store';

const typeColors: Record<string, string> = {
  info: 'text-slate-400',
  ruling: 'text-blue-400',
  opposition: 'text-red-400',
  event: 'text-yellow-400',
  election: 'text-purple-400',
  situation: 'text-orange-400',
  dilemma: 'text-amber-400',
  cabinet: 'text-cyan-400',
};

export function ActionLog() {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-slate-800">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">News Feed</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {gameState.actionLog.slice().reverse().map((entry, i) => (
          <div key={i} className="text-xs animate-fade-in">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-slate-600">T{entry.turn}</span>
              <span className={`font-medium ${typeColors[entry.type] ?? 'text-slate-400'}`}>
                {entry.message}
              </span>
            </div>
          </div>
        ))}
        {gameState.actionLog.length === 0 && (
          <div className="text-xs text-slate-600 text-center mt-8">
            No events yet...
          </div>
        )}
      </div>
    </div>
  );
}
