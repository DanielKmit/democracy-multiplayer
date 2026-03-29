'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { FOREIGN_NATIONS } from '@/lib/engine/internationalRelations';

export function DiplomacyPanel() {
  const { gameState, playerId } = useGameStore();
  const { resolveDiplomaticIncident } = useGameActions();

  if (!gameState || !gameState.gameSettings?.internationalRelationsEnabled) return null;
  if (!gameState.diplomaticRelations || gameState.diplomaticRelations.length === 0) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const isRuling = myPlayer?.role === 'ruling';
  const incident = gameState.activeDiplomaticIncident;

  return (
    <div className="glass-card p-3 mb-3">
      <h3 className="text-xs font-bold text-game-secondary uppercase tracking-wider mb-2">
        🌐 International Relations
      </h3>

      {/* Diplomatic Incident (if active) */}
      {incident && isRuling && (
        <div className="mb-3 p-3 rounded-lg border border-amber-500/50 bg-amber-950/20 animate-fade-in">
          <div className="text-sm font-bold text-amber-300 mb-1">{incident.title}</div>
          <p className="text-[11px] text-game-secondary mb-2">{incident.description}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => resolveDiplomaticIncident('a')}
              className="text-[11px] p-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all"
            >
              {incident.optionA.label}
              <div className="text-[9px] text-blue-200 mt-0.5">
                Relations: {incident.optionA.relationDelta > 0 ? '+' : ''}{incident.optionA.relationDelta}
              </div>
            </button>
            <button
              onClick={() => resolveDiplomaticIncident('b')}
              className="text-[11px] p-2 rounded bg-red-600 hover:bg-red-500 text-white font-bold transition-all"
            >
              {incident.optionB.label}
              <div className="text-[9px] text-red-200 mt-0.5">
                Relations: {incident.optionB.relationDelta > 0 ? '+' : ''}{incident.optionB.relationDelta}
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {gameState.diplomaticRelations.map(rel => {
          const nation = FOREIGN_NATIONS.find(n => n.id === rel.nationId);
          if (!nation) return null;

          const relationColor = rel.relation >= 70 ? 'text-emerald-400' :
            rel.relation >= 40 ? 'text-amber-400' : 'text-red-400';
          const barColor = rel.relation >= 70 ? '#10B981' :
            rel.relation >= 40 ? '#F59E0B' : '#EF4444';

          return (
            <div key={rel.nationId} className="p-2 rounded bg-game-bg/50 border border-game-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{nation.flag}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{nation.name}</span>
                    <span className={`text-[10px] font-bold ${relationColor}`}>
                      {rel.relation}/100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-game-border rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${rel.relation}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] text-game-muted">
                {rel.hasTradeAgreement && (
                  <span className="px-1 py-0.5 rounded bg-emerald-900/50 text-emerald-400">
                    📊 Trade Deal
                  </span>
                )}
                {rel.hasForeignAid && (
                  <span className="px-1 py-0.5 rounded bg-blue-900/50 text-blue-400">
                    🤝 Aid: ${rel.aidAmount}B
                  </span>
                )}
                {rel.warThreat && (
                  <span className="px-1 py-0.5 rounded bg-red-900/50 text-red-400 animate-pulse">
                    ⚠️ WAR THREAT
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
