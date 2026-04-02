'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { MinistryId, MINISTRY_NAMES, Politician } from '@/lib/engine/types';
import { getEffectiveCompetence } from '@/lib/engine/politicians';

const MINISTRY_ICONS: Record<MinistryId, string> = {
  finance: '💰',
  interior: '🏠',
  defense: '🛡️',
  health: '🏥',
  education: '📚',
  foreign: '🌍',
  environment: '🌿',
  justice: '⚖️',
};

const MINISTRY_BONUS_DESC: Record<MinistryId, string> = {
  finance: '+GDP Growth',
  interior: '-Crime Rate',
  defense: '+Security, -Threat',
  health: '+Health Index',
  education: '+Education Index',
  foreign: '+Security',
  environment: '-Pollution',
  justice: '+Freedom, -Corruption',
};

export function CabinetPanel() {
  const { gameState, playerId } = useGameStore();
  const { appointMinister, fireMinister } = useGameActions();
  const [selectedMinistry, setSelectedMinistry] = useState<MinistryId | null>(null);

  if (!gameState) return null;

  const isRuling = gameState.players.find(p => p.id === playerId)?.role === 'ruling';
  const { ministers, availablePool } = gameState.cabinet;

  // Get currently assigned politician IDs
  const assignedIds = new Set(Object.values(ministers).filter(Boolean) as string[]);

  // Available politicians (not assigned to any ministry)
  const available = availablePool.filter(p => !assignedIds.has(p.id));

  const ministryIds = Object.keys(MINISTRY_NAMES) as MinistryId[];

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-game-muted uppercase tracking-wider">Cabinet</h3>

      {ministryIds.map(mId => {
        const polId = ministers[mId];
        const politician = polId ? availablePool.find(p => p.id === polId) : null;
        const effComp = politician ? getEffectiveCompetence(politician, mId) : 0;

        return (
          <div
            key={mId}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              selectedMinistry === mId
                ? 'border-blue-600 bg-blue-900/20'
                : 'border-game-border bg-game-card/30 hover:border-game-border'
            }`}
            onClick={() => isRuling && setSelectedMinistry(selectedMinistry === mId ? null : mId)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{MINISTRY_ICONS[mId]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-game-muted truncate">{MINISTRY_NAMES[mId].replace('Minister of ', '')}</div>
                {politician ? (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: politician.avatarColor }}
                      >
                        {politician.initials}
                      </div>
                      <span className="text-xs text-white truncate">{politician.name}</span>
                      <span className={`text-[10px] ml-1 ${politician.loyalty < 3 ? 'text-red-400' : politician.loyalty < 5 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        ♥{politician.loyalty}
                      </span>
                      <span className="text-[10px] text-yellow-400 ml-auto">★{effComp}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 ml-6">
                      {politician.specialty === mId && (
                        <span className="text-[9px] px-1 py-0 rounded bg-green-900/40 text-green-400 border border-green-800/30">
                          SPECIALIST
                        </span>
                      )}
                      <span className={`text-[9px] ${
                        politician.loyalty < 3 ? 'text-red-400' :
                        effComp >= 8 ? 'text-emerald-400' : 'text-game-muted'
                      }`}>
                        {politician.loyalty < 3 ? `⚠️ ${MINISTRY_BONUS_DESC[mId]} (penalty)` :
                         effComp >= 7 ? MINISTRY_BONUS_DESC[mId] : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-game-muted italic">Vacant</span>
                )}
              </div>
              {isRuling && politician && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fireMinister(mId);
                  }}
                  className="text-red-500 hover:text-red-400 text-xs px-1"
                  title="Fire (-2 PC)"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Appointment dropdown */}
      {isRuling && selectedMinistry && !ministers[selectedMinistry] && (
        <div className="mt-2 p-2 bg-game-card border border-game-border rounded-lg animate-fade-in">
          <div className="text-xs text-game-secondary mb-2">
            Appoint {MINISTRY_NAMES[selectedMinistry]}:
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {available.map(pol => {
              const effComp = getEffectiveCompetence(pol, selectedMinistry);
              const isSpecialist = pol.specialty === selectedMinistry;

              return (
                <button
                  key={pol.id}
                  onClick={() => {
                    appointMinister(selectedMinistry, pol.id);
                    setSelectedMinistry(null);
                  }}
                  className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-game-border transition-all text-left"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: pol.avatarColor }}
                  >
                    {pol.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">
                      {pol.name}
                      {isSpecialist && <span className="text-green-400 ml-1">★</span>}
                    </div>
                    <div className="text-[10px] text-game-muted">
                      Comp: {effComp} | Loy: {pol.loyalty}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
