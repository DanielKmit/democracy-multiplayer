'use client';

import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';

export function EventModal() {
  const { gameState } = useGameStore();
  const { acknowledgeEvent } = useGameActions();
  if (!gameState || !gameState.currentEvent) return null;

  const event = gameState.currentEvent;
  const isPositive = event.approvalImpact > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className={`max-w-md w-full mx-4 p-6 rounded-xl border ${
        isPositive ? 'bg-slate-800 border-green-800' : 'bg-slate-800 border-red-800'
      }`}>
        <div className="text-center">
          <div className="text-5xl mb-4">{isPositive ? '📈' : '📉'}</div>
          <h2 className="text-xl font-bold mb-2">{event.name}</h2>
          <p className="text-slate-400 mb-4">{event.description}</p>

          {/* Effects */}
          <div className="bg-slate-900 rounded-lg p-3 mb-4 text-sm">
            <div className="text-xs text-slate-500 uppercase mb-2">Effects ({event.duration} turns)</div>
            {Object.entries(event.effects).map(([key, val]) => (
              <div key={key} className="flex justify-between">
                <span className="text-slate-400">{key}</span>
                <span className={val > 0 ? 'text-green-400' : 'text-red-400'}>
                  {val > 0 ? '+' : ''}{val}
                </span>
              </div>
            ))}
            {event.approvalImpact !== 0 && (
              <div className="flex justify-between mt-1 border-t border-slate-800 pt-1">
                <span className="text-slate-400">Approval</span>
                <span className={event.approvalImpact > 0 ? 'text-green-400' : 'text-red-400'}>
                  {event.approvalImpact > 0 ? '+' : ''}{event.approvalImpact}%
                </span>
              </div>
            )}
          </div>

          <button
            onClick={acknowledgeEvent}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all"
          >
            Acknowledged →
          </button>
        </div>
      </div>
    </div>
  );
}
