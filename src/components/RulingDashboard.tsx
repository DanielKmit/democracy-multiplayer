'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { PolicyWeb } from './PolicyWeb';
import { NovariMap } from './NovariMap';
import { BillsPanel } from './BillsPanel';
import { useAudio } from './AudioManager';

type RulingView = 'bills' | 'web' | 'map';

export function RulingDashboard() {
  const { gameState, playerId } = useGameStore();
  const { endTurnPhase } = useGameActions();
  const { playSfx } = useAudio();
  const [view, setView] = useState<RulingView>('bills');

  if (!gameState) return null;
  const myPlayer = gameState.players.find(p => p.id === playerId);
  const pc = myPlayer?.politicalCapital ?? 0;

  const pendingBills = gameState.activeBills.filter(b => b.status === 'pending' && b.authorId === playerId).length;
  const votingBills = gameState.activeBills.filter(b => b.status === 'voting').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between p-2 border-b border-slate-800/50 bg-slate-900/30">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('bills')}
            className={`px-3 py-1 rounded text-xs transition-all ${view === 'bills' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            📋 Bills
            {(pendingBills + votingBills) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[9px]">
                {pendingBills + votingBills}
              </span>
            )}
          </button>
          <button onClick={() => setView('web')}
            className={`px-3 py-1 rounded text-xs transition-all ${view === 'web' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            🕸️ Policy Web
          </button>
          <button onClick={() => setView('map')}
            className={`px-3 py-1 rounded text-xs transition-all ${view === 'map' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            🗺️ Map
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            ⚡ <span className="text-yellow-400 font-bold">{pc}</span> PC
          </span>
          {pendingBills > 0 && view !== 'bills' && (
            <span className="text-xs text-amber-400">📋 {pendingBills} pending</span>
          )}
          {votingBills > 0 && view !== 'bills' && (
            <span className="text-xs text-blue-400 animate-pulse">🗳️ {votingBills} in vote</span>
          )}
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 overflow-hidden">
        {view === 'bills' ? (
          <div className="h-full overflow-y-auto p-4">
            <BillsPanel />
          </div>
        ) : view === 'web' ? (
          <PolicyWeb />
        ) : (
          <NovariMap />
        )}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800/50 bg-slate-900/50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {view !== 'bills' && (
              <button onClick={() => setView('bills')}
                className="text-xs text-blue-400 hover:text-blue-300 transition-all">
                ← Back to Bills
              </button>
            )}
            {/* Turn indicator */}
          </div>
          <button onClick={() => { playSfx('endTurn'); endTurnPhase(); }}
            className="px-6 py-2.5 text-xs bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-semibold transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]">
            End Turn →
          </button>
        </div>
      </div>
    </div>
  );
}
