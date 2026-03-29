'use client';

import { useState, useMemo } from 'react';
import { useGameStore } from '@/lib/store';
import { REGIONS } from '@/lib/engine/regions';
import { PARTY_COLORS, RegionDefinition, GameState } from '@/lib/engine/types';

// SVG paths for Novaria's 6 regions — irregular borders for realistic country shape
const REGION_PATHS: Record<string, string> = {
  nordmark:   'M 250,50 C 280,30 350,20 420,35 C 470,45 500,60 520,80 L 480,140 L 380,160 L 280,145 L 230,110 Z',
  westhafen:  'M 100,180 C 80,200 70,260 90,310 L 150,350 L 250,320 L 280,250 L 280,145 L 230,110 L 160,130 Z',
  capitalis:  'M 280,145 L 380,160 L 480,140 L 500,200 L 480,280 L 380,310 L 280,320 L 250,320 L 280,250 Z',
  ostwald:    'M 480,140 L 520,80 C 560,100 620,140 650,190 C 670,230 660,280 640,320 L 560,340 L 480,280 L 500,200 Z',
  sudfeld:    'M 150,350 L 250,320 L 280,320 L 380,310 L 480,280 L 560,340 L 520,420 L 400,460 L 280,450 L 180,410 Z',
  bergland:   'M 180,410 L 280,450 L 400,460 L 520,420 C 500,480 460,530 420,560 C 380,580 320,590 280,570 C 240,555 200,520 180,480 Z',
};

// Label positions (center of each region roughly)
const LABEL_POS: Record<string, { x: number; y: number }> = {
  nordmark:  { x: 380, y: 95 },
  westhafen: { x: 190, y: 240 },
  capitalis: { x: 380, y: 235 },
  ostwald:   { x: 570, y: 210 },
  sudfeld:   { x: 370, y: 385 },
  bergland:  { x: 350, y: 500 },
};

function getRegionColor(
  region: RegionDefinition,
  gameState: GameState,
  hoveredId: string | null,
): string {
  const lastElection = gameState.electionHistory[gameState.electionHistory.length - 1];

  // If we have election results, color by winner
  if (lastElection?.regionWinners[region.id]) {
    const winnerId = lastElection.regionWinners[region.id];
    const player = gameState.players.find(p => p.id === winnerId);
    if (player) {
      return PARTY_COLORS[player.party.partyColor];
    }
    // Could be a bot party
    const bot = gameState.botParties?.find(b => b.id === winnerId);
    if (bot) return bot.color;
  }

  // Before elections: color by ruling party satisfaction (greenish = good, reddish = bad)
  const ruling = gameState.players.find(p => p.role === 'ruling');
  if (ruling) {
    const regSat = gameState.regionalSatisfaction[region.id]?.[ruling.id] ?? 50;
    if (regSat > 60) return '#22C55E';
    if (regSat > 45) return '#3B82F6';
    if (regSat > 35) return '#EAB308';
    return '#EF4444';
  }

  return '#475569';
}

interface TooltipData {
  region: RegionDefinition;
  x: number;
  y: number;
}

export function NovariMap() {
  const { gameState, playerId } = useGameStore();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selectedRegion) return null;
    return REGIONS.find(r => r.id === selectedRegion) ?? null;
  }, [selectedRegion]);

  if (!gameState) return null;

  return (
    <div className="h-full flex">
      {/* Map */}
      <div className="flex-1 flex items-center justify-center p-4">
        <svg viewBox="0 0 750 620" className="w-full h-full max-h-[560px]">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="eventGlow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <style>{`
            @keyframes pulse-event {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.6; }
            }
            .region-event-pulse {
              animation: pulse-event 2s ease-in-out infinite;
            }
          `}</style>

          {REGIONS.map(region => {
            const path = REGION_PATHS[region.id];
            if (!path) return null;
            const color = getRegionColor(region, gameState, hovered);
            const isHovered = hovered === region.id;
            const isSelected = selectedRegion === region.id;
            const label = LABEL_POS[region.id];
            const regionEvents = (gameState.activeRegionalEvents ?? []).filter(e => e.regionId === region.id);
            const hasEvent = regionEvents.length > 0;

            return (
              <g key={region.id}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(region.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelectedRegion(selectedRegion === region.id ? null : region.id)}
              >
                {/* Event pulse overlay */}
                {hasEvent && (
                  <path
                    d={path}
                    fill={regionEvents[0].icon.includes('🔥') || regionEvents[0].icon.includes('⛏️') || regionEvents[0].icon.includes('✊') ? '#EF4444' : '#FBBF24'}
                    fillOpacity={0.2}
                    stroke="none"
                    className="region-event-pulse pointer-events-none"
                    filter="url(#eventGlow)"
                  />
                )}
                <path
                  d={path}
                  fill={color}
                  fillOpacity={isHovered || isSelected ? 0.5 : hasEvent ? 0.35 : 0.25}
                  stroke={hasEvent ? '#FBBF24' : isSelected ? '#fff' : isHovered ? '#94a3b8' : '#334155'}
                  strokeWidth={hasEvent ? 2 : isSelected ? 2.5 : isHovered ? 2 : 1.2}
                  className="transition-all duration-200"
                  filter={isSelected ? 'url(#glow)' : undefined}
                />
                {label && (
                  <>
                    <text x={label.x} y={label.y - 6} textAnchor="middle"
                      fill={isHovered || isSelected ? '#f1f5f9' : '#94a3b8'}
                      fontSize="13" fontWeight="600" className="pointer-events-none select-none">
                      {region.name}
                    </text>
                    <text x={label.x} y={label.y + 10} textAnchor="middle"
                      fill="#64748b" fontSize="9" className="pointer-events-none select-none">
                      {region.seats} seats • {(region.populationShare * 100).toFixed(0)}%
                    </text>
                    {/* Event badge */}
                    {hasEvent && (
                      <text x={label.x + 45} y={label.y - 10} textAnchor="middle"
                        fontSize="16" className="pointer-events-none select-none">
                        {regionEvents[0].icon}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Region detail panel */}
      {selected && (
        <div className="w-80 border-l border-slate-700/50 bg-slate-900/95 overflow-y-auto animate-slide-in-right flex-shrink-0">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-200">{selected.name}</h3>
            <button onClick={() => setSelectedRegion(null)}
              className="text-slate-500 hover:text-slate-300">✕</button>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-xs text-slate-400">{selected.description}</p>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Population" value={`${selected.demographics.populationMillions}M`} />
              <StatBox label="Seats" value={`${selected.seats}`} />
              <StatBox label="Income" value={selected.demographics.avgIncome} />
              <StatBox label="Unemployment" value={`${selected.demographics.baseUnemployment}%`} />
              <StatBox label="University" value={`${selected.demographics.universityEducated}%`} />
              <StatBox label="Urban" value={`${selected.demographics.urbanPercent}%`} />
            </div>

            {/* Key industry */}
            <div className="p-2 bg-slate-800/50 rounded-lg">
              <div className="text-[9px] text-slate-500 uppercase">Key Industry</div>
              <div className="text-xs text-slate-300">{selected.demographics.keyIndustry}</div>
            </div>

            {/* Age distribution */}
            <div>
              <div className="text-[9px] text-slate-500 uppercase mb-1">Age Distribution</div>
              <div className="flex h-4 rounded-full overflow-hidden">
                <div style={{ width: `${selected.demographics.ageYoung}%` }}
                  className="bg-cyan-500" title={`Young: ${selected.demographics.ageYoung}%`} />
                <div style={{ width: `${selected.demographics.ageMiddle}%` }}
                  className="bg-blue-500" title={`Middle: ${selected.demographics.ageMiddle}%`} />
                <div style={{ width: `${selected.demographics.ageElderly}%` }}
                  className="bg-purple-500" title={`Elderly: ${selected.demographics.ageElderly}%`} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                <span>Young {selected.demographics.ageYoung}%</span>
                <span>Middle {selected.demographics.ageMiddle}%</span>
                <span>Elderly {selected.demographics.ageElderly}%</span>
              </div>
            </div>

            {/* Voter group breakdown */}
            <div>
              <div className="text-[9px] text-slate-500 uppercase mb-1.5">Voter Groups</div>
              <div className="space-y-1">
                {Object.entries(selected.demographics.voterGroupBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([groupId, pct]) => (
                    <div key={groupId} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-24 truncate capitalize">
                        {groupId.replace(/_/g, ' ')}
                      </span>
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 w-8 text-right">{pct}%</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Party satisfaction */}
            <div>
              <div className="text-[9px] text-slate-500 uppercase mb-1.5">Party Support</div>
              <div className="space-y-1.5">
                {gameState.players.map(player => {
                  const sat = gameState.regionalSatisfaction[selected.id]?.[player.id] ?? 50;
                  return (
                    <div key={player.id} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PARTY_COLORS[player.party.partyColor] }} />
                      <span className="text-[10px] text-slate-300 w-24 truncate">{player.party.partyName}</span>
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${sat}%`, backgroundColor: PARTY_COLORS[player.party.partyColor], opacity: 0.7 }} />
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right">{sat}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Regional Events */}
            {(gameState.activeRegionalEvents ?? []).filter(e => e.regionId === selected.id).length > 0 && (
              <div>
                <div className="text-[9px] text-slate-500 uppercase mb-1.5">Active Events</div>
                <div className="space-y-1.5">
                  {(gameState.activeRegionalEvents ?? [])
                    .filter(e => e.regionId === selected.id)
                    .map(evt => (
                      <div key={evt.id} className="p-2 bg-amber-950/20 border border-amber-800/30 rounded-lg">
                        <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                          <span>{evt.icon}</span>
                          <span>{evt.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{evt.description}</p>
                        <span className="text-[9px] text-slate-500">{evt.turnsRemaining} turns remaining</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Key issues */}
            <div>
              <div className="text-[9px] text-slate-500 uppercase mb-1">Key Issues</div>
              <div className="flex flex-wrap gap-1">
                {selected.keyIssues.map(issue => (
                  <span key={issue} className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-slate-400">
                    {issue}
                  </span>
                ))}
              </div>
            </div>

            {/* Last election result */}
            {gameState.electionHistory.length > 0 && (
              <div>
                <div className="text-[9px] text-slate-500 uppercase mb-1">Last Election</div>
                {(() => {
                  const last = gameState.electionHistory[gameState.electionHistory.length - 1];
                  const seats = last.seatResults[selected.id];
                  if (!seats) return <span className="text-[10px] text-slate-500">No data</span>;
                  return (
                    <div className="space-y-1">
                      {Object.entries(seats).sort(([, a], [, b]) => b - a).map(([pid, s]) => {
                        const player = gameState.players.find(p => p.id === pid);
                        return (
                          <div key={pid} className="flex items-center justify-between text-xs">
                            <span style={{ color: player ? PARTY_COLORS[player.party.partyColor] : '#666' }}>
                              {player?.party.partyName ?? pid}
                            </span>
                            <span className="text-slate-400">{s} seats</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Religious */}
            {selected.demographics.religiousPopulation > 30 && (
              <div className="p-2 bg-purple-950/20 border border-purple-800/30 rounded-lg text-xs text-purple-300">
                ⛪ {selected.demographics.religiousPopulation}% religious population — sensitive to social policy
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-slate-800/50 rounded-lg">
      <div className="text-[9px] text-slate-500 uppercase">{label}</div>
      <div className="text-xs font-bold text-slate-200 capitalize">{value}</div>
    </div>
  );
}
