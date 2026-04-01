'use client';

import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className={`max-w-md w-full mx-4 glass-card rounded-2xl overflow-hidden border ${
        isPositive ? 'border-emerald-800/50' : 'border-red-800/50'
      } animate-fade-in-scale`}>
        {/* Header */}
        <div className={`p-6 pb-4 text-center ${isPositive ? 'bg-gradient-to-b from-emerald-950/30 to-transparent' : 'bg-gradient-to-b from-red-950/30 to-transparent'}`}>
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
            isPositive ? 'bg-emerald-900/30 border border-emerald-800/30' : 'bg-red-900/30 border border-red-800/30'
          }`}>
            <span className="text-4xl">{isPositive ? '📈' : '📉'}</span>
          </div>
          <h2 className="text-xl font-bold font-display mb-1">{event.name}</h2>
          <p className="text-sm text-game-secondary leading-relaxed">{event.description}</p>
        </div>

        {/* Effects */}
        <div className="px-6 pb-6">
          <div className="rounded-xl bg-game-bg/50 border border-game-border/50 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-game-muted uppercase tracking-wider font-bold">Effects</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-game-border/50 text-game-muted font-medium">
                {event.duration} turn{event.duration !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(event.effects).map(([key, val]) => {
                const value = val as number;
                const label = SIM_VAR_LABELS[key] ?? key;
                // For most vars, positive is good. For unemployment, crime, pollution, corruption, inflation — positive is bad
                const inversed = ['unemployment', 'crime', 'pollution', 'corruption', 'inflation'].includes(key);
                const isGood = inversed ? value < 0 : value > 0;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-game-secondary">{label}</span>
                    <span className={`text-sm font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
                      {value > 0 ? '+' : ''}{value}
                    </span>
                  </div>
                );
              })}
              {event.approvalImpact !== 0 && (
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-game-border/30">
                  <span className="text-sm text-game-secondary">Approval Rating</span>
                  <span className={`text-sm font-bold ${event.approvalImpact > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {event.approvalImpact > 0 ? '+' : ''}{event.approvalImpact}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <button onClick={acknowledgeEvent}
            className="w-full py-3 btn-primary rounded-xl font-semibold text-sm">
            Acknowledged →
          </button>
        </div>
      </div>
    </div>
  );
}
