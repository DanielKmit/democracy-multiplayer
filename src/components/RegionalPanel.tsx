'use client';

import { useGameStore } from '@/lib/store';
import { REGIONS } from '@/lib/engine/regions';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { PARTY_COLORS } from '@/lib/engine/types';

export function RegionalPanel() {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Regional Satisfaction</h3>

      {REGIONS.map(region => {
        const regSat = gameState.regionalSatisfaction[region.id];
        return (
          <div key={region.id} className="p-2 rounded-lg bg-slate-800/30 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-300">{region.name}</span>
              <span className="text-[10px] text-slate-600">{region.seats} seats</span>
            </div>
            {gameState.players.map(player => {
              const sat = regSat?.[player.id] ?? 50;
              return (
                <div key={player.id} className="flex items-center gap-2 mb-0.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PARTY_COLORS[player.party.partyColor] }} />
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${sat}%`,
                        backgroundColor: PARTY_COLORS[player.party.partyColor],
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 w-7 text-right">{sat}%</span>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Voter Groups */}
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">Voter Groups</h3>
      {VOTER_GROUPS.map(group => {
        const satisfaction = gameState.voterSatisfaction[group.id] ?? 50;
        return (
          <div key={group.id} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-20 truncate">{group.name}</span>
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${satisfaction}%`,
                  backgroundColor: satisfaction > 60 ? '#22C55E' : satisfaction < 40 ? '#EF4444' : '#EAB308',
                }}
              />
            </div>
            <span className={`text-[10px] w-7 text-right ${
              satisfaction > 60 ? 'text-green-400' : satisfaction < 40 ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {satisfaction}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
