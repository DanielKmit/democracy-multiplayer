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

  const pendingBills = gameState.activeBills.filter(b => b.status === 'pending').length;
  const votingBills = gameState.activeBills.filter(b => b.status === 'voting').length;

  const views: { id: RulingView; icon: string; label: string }[] = [
    { id: 'bills', icon: '📋', label: 'Bills' },
    { id: 'web', icon: '🕸️', label: 'Policy Web' },
    { id: 'map', icon: '🗺️', label: 'Map' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-game-border bg-game-card/40">
        <div className="flex items-center gap-1">
          {views.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === v.id
                  ? 'bg-white/[0.06] text-white border border-white/10'
                  : 'text-game-muted hover:text-game-secondary'
              }`}>
              <span>{v.icon}</span>
              <span>{v.label}</span>
              {v.id === 'bills' && (pendingBills + votingBills) > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-amber-900/50 text-amber-400 text-[9px] font-bold border border-amber-800/30">
                  {pendingBills + votingBills}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="stat-card !py-1 !px-2.5 flex items-center gap-1.5">
            <span className="text-amber-400">⚡</span>
            <span className="text-sm font-bold text-amber-400">{pc}</span>
            <span className="text-[9px] text-game-muted">PC</span>
          </div>
          {pendingBills > 0 && view !== 'bills' && (
            <button onClick={() => setView('bills')} className="text-[10px] text-amber-400 hover:text-amber-300 transition-all">
              📋 {pendingBills} pending
            </button>
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
      <div className="border-t border-game-border bg-game-card/50 p-3 flex items-center justify-end">
        <button onClick={() => { playSfx('endTurn'); endTurnPhase(); }}
          className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold">
          End Turn →
        </button>
      </div>
    </div>
  );
}
