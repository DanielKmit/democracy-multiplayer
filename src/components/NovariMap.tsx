'use client';

import { useState, useMemo } from 'react';
import { useGameStore } from '@/lib/store';
import { REGIONS } from '@/lib/engine/regions';
import { PARTY_COLORS, RegionDefinition, GameState } from '@/lib/engine/types';

// SVG paths for Novaria's 7 regions — realistic country shape with coastlines
const REGION_PATHS: Record<string, string> = {
  nordmark:   'M 250,50 C 280,30 350,20 420,35 C 470,45 500,60 520,80 L 480,140 L 380,160 L 280,145 L 230,110 Z',
  westhafen:  'M 100,180 C 80,200 70,260 90,310 L 150,350 L 250,320 L 280,250 L 280,145 L 230,110 L 160,130 Z',
  capitalis:  'M 280,145 L 380,160 L 480,140 L 500,200 L 480,280 L 380,310 L 280,320 L 250,320 L 280,250 Z',
  ostwald:    'M 480,140 L 520,80 C 560,100 620,140 650,190 C 670,230 660,280 640,320 L 560,340 L 480,280 L 500,200 Z',
  sudfeld:    'M 150,350 L 250,320 L 280,320 L 380,310 L 480,280 L 560,340 L 520,420 L 400,460 L 280,450 L 180,410 Z',
  bergland:   'M 180,410 L 280,450 L 400,460 L 520,420 C 500,480 460,530 420,560 C 380,580 320,590 280,570 C 240,555 200,520 180,480 Z',
  gruenland:  'M 90,310 C 70,350 60,390 70,430 C 80,460 100,480 130,490 L 180,480 L 180,410 L 150,350 Z',
};

const LABEL_POS: Record<string, { x: number; y: number }> = {
  nordmark:  { x: 380, y: 90 },
  westhafen: { x: 185, y: 230 },
  capitalis: { x: 380, y: 230 },
  ostwald:   { x: 570, y: 210 },
  sudfeld:   { x: 370, y: 380 },
  bergland:  { x: 350, y: 505 },
  gruenland: { x: 125, y: 400 },
};

// Coastline path (outer border of the country touching "water")
const COASTLINE = 'M 250,50 C 280,30 350,20 420,35 C 470,45 500,60 520,80 C 560,100 620,140 650,190 C 670,230 660,280 640,320 L 560,340 L 520,420 C 500,480 460,530 420,560 C 380,580 320,590 280,570 C 240,555 200,520 180,480 L 130,490 C 100,480 80,460 70,430 C 60,390 70,350 90,310 C 70,260 80,200 100,180 L 160,130 L 230,110 L 250,50';

function getRegionColor(
  region: RegionDefinition,
  gameState: GameState,
): string {
  const lastElection = gameState.electionHistory[gameState.electionHistory.length - 1];

  if (lastElection?.regionWinners[region.id]) {
    const winnerId = lastElection.regionWinners[region.id];
    const player = gameState.players.find(p => p.id === winnerId);
    if (player) return PARTY_COLORS[player.party.partyColor];
    const bot = gameState.botParties?.find(b => b.id === winnerId);
    if (bot) return bot.color;
  }

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
        <svg viewBox="-20 -20 790 660" className="w-full h-full max-h-[560px]">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="regionShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
            </filter>
            <filter id="eventGlow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Water texture gradient */}
            <radialGradient id="waterGradient" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="100%" stopColor="#060d17" />
            </radialGradient>
            {/* Terrain texture */}
            <pattern id="terrainTexture" patternUnits="userSpaceOnUse" width="4" height="4">
              <rect width="4" height="4" fill="transparent" />
              <circle cx="2" cy="2" r="0.3" fill="rgba(255,255,255,0.02)" />
            </pattern>
          </defs>

          <style>{`
            @keyframes pulse-event {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.6; }
            }
            .region-event-pulse {
              animation: pulse-event 2s ease-in-out infinite;
            }
            @keyframes capital-pulse {
              0%, 100% { r: 3; opacity: 0.8; }
              50% { r: 5; opacity: 1; }
            }
          `}</style>

          {/* Ocean background */}
          <rect x="-20" y="-20" width="790" height="660" fill="url(#waterGradient)" />

          {/* Grid lines (latitude/longitude feel) */}
          {[100, 200, 300, 400, 500].map(y => (
            <line key={`h${y}`} x1="-20" y1={y} x2="770" y2={y} stroke="rgba(255,255,255,0.015)" strokeWidth="0.5" />
          ))}
          {[150, 300, 450, 600].map(x => (
            <line key={`v${x}`} x1={x} y1="-20" x2={x} y2="640" stroke="rgba(255,255,255,0.015)" strokeWidth="0.5" />
          ))}

          {/* Country shadow */}
          <path d={COASTLINE} fill="rgba(0,0,0,0.3)" stroke="none" transform="translate(3, 3)" />

          {/* Regions */}
          {REGIONS.map(region => {
            const path = REGION_PATHS[region.id];
            if (!path) return null;
            const color = getRegionColor(region, gameState);
            const isHovered = hovered === region.id;
            const isSelected = selectedRegion === region.id;
            const label = LABEL_POS[region.id];
            const regionEvents = (gameState.activeRegionalEvents ?? []).filter(e => e.regionId === region.id);
            const hasEvent = regionEvents.length > 0;
            const isCapital = region.id === 'capitalis';

            return (
              <g key={region.id}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(region.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelectedRegion(selectedRegion === region.id ? null : region.id)}
              >
                {/* Event pulse overlay */}
                {hasEvent && (
                  <path d={path} fill="#FBBF24" fillOpacity={0.15} stroke="none"
                    className="region-event-pulse pointer-events-none" filter="url(#eventGlow)" />
                )}
                {/* Main region shape */}
                <path
                  d={path}
                  fill={color}
                  fillOpacity={isHovered || isSelected ? 0.55 : hasEvent ? 0.35 : 0.3}
                  stroke={isSelected ? '#fff' : isHovered ? '#cbd5e1' : hasEvent ? '#FBBF24' : '#1e293b'}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                  className="transition-all duration-300"
                  filter={isSelected ? 'url(#glow)' : 'url(#regionShadow)'}
                />
                {/* Terrain texture overlay */}
                <path d={path} fill="url(#terrainTexture)" stroke="none" className="pointer-events-none" />

                {label && (
                  <>
                    {/* Label background for readability */}
                    <rect x={label.x - 40} y={label.y - 18} width="80" height="30" rx="4"
                      fill="rgba(0,0,0,0.4)" className="pointer-events-none" opacity={isHovered || isSelected ? 0.7 : 0.3} />
                    <text x={label.x} y={label.y - 4} textAnchor="middle"
                      fill={isHovered || isSelected ? '#f8fafc' : '#cbd5e1'}
                      fontSize="11" fontWeight="700" className="pointer-events-none select-none"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                      {region.name}
                    </text>
                    <text x={label.x} y={label.y + 9} textAnchor="middle"
                      fill={isHovered || isSelected ? '#94a3b8' : '#64748b'} fontSize="8"
                      className="pointer-events-none select-none">
                      {region.seats} seats • {(region.populationShare * 100).toFixed(0)}%
                    </text>
                    {/* Capital marker */}
                    {isCapital && (
                      <circle cx={label.x - 48} cy={label.y - 4} r="3" fill="#EAB308" opacity="0.9">
                        <animate attributeName="r" values="3;4.5;3" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Event icon */}
                    {hasEvent && (
                      <text x={label.x + 45} y={label.y - 8} textAnchor="middle"
                        fontSize="14" className="pointer-events-none select-none">
                        {regionEvents[0].icon}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}

          {/* Coastline border */}
          <path d={COASTLINE} fill="none" stroke="#1e3a5f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" className="pointer-events-none" />

          {/* Country name */}
          <text x="380" y="600" textAnchor="middle" fill="#334155" fontSize="10" letterSpacing="6"
            className="pointer-events-none select-none uppercase">
            Republic of Novaria
          </text>
        </svg>
      </div>

      {/* Region detail panel */}
      {selected && (
        <div className="w-80 border-l border-game-border bg-game-card/95 backdrop-blur-sm overflow-y-auto animate-slide-in-right flex-shrink-0">
          <div className="p-4 border-b border-game-border flex items-center justify-between bg-gradient-to-r from-game-card to-transparent">
            <div>
              <h3 className="font-bold text-white font-display">{selected.name}</h3>
              <p className="text-[10px] text-game-muted">{selected.characteristics}</p>
            </div>
            <button onClick={() => setSelectedRegion(null)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-game-muted hover:text-white hover:bg-white/5 transition-all">✕</button>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-xs text-game-secondary leading-relaxed">{selected.description}</p>

            {/* Key stats */}
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Population" value={`${selected.demographics.populationMillions}M`} />
              <StatBox label="Seats" value={`${selected.seats}`} />
              <StatBox label="Income" value={selected.demographics.avgIncome} />
              <StatBox label="Unemploy." value={`${selected.demographics.baseUnemployment}%`} />
              <StatBox label="Educated" value={`${selected.demographics.universityEducated}%`} />
              <StatBox label="Urban" value={`${selected.demographics.urbanPercent}%`} />
            </div>

            {/* Key industry */}
            <div className="glass-card p-2.5">
              <div className="text-[9px] text-game-muted uppercase tracking-wider font-bold">Key Industry</div>
              <div className="text-xs text-white mt-0.5">{selected.demographics.keyIndustry}</div>
            </div>

            {/* Age distribution */}
            <div>
              <div className="text-[9px] text-game-muted uppercase tracking-wider font-bold mb-1.5">Demographics</div>
              <div className="flex h-3 rounded-full overflow-hidden">
                <div style={{ width: `${selected.demographics.ageYoung}%` }} className="bg-cyan-500/70" />
                <div style={{ width: `${selected.demographics.ageMiddle}%` }} className="bg-blue-500/70" />
                <div style={{ width: `${selected.demographics.ageElderly}%` }} className="bg-purple-500/70" />
              </div>
              <div className="flex justify-between text-[9px] text-game-muted mt-1">
                <span className="text-cyan-400">Youth {selected.demographics.ageYoung}%</span>
                <span className="text-blue-400">Working {selected.demographics.ageMiddle}%</span>
                <span className="text-purple-400">Senior {selected.demographics.ageElderly}%</span>
              </div>
            </div>

            {/* Voter groups */}
            <div>
              <div className="text-[9px] text-game-muted uppercase tracking-wider font-bold mb-1.5">Voter Groups</div>
              <div className="space-y-1">
                {Object.entries(selected.demographics.voterGroupBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([groupId, pct]) => (
                    <div key={groupId} className="flex items-center gap-2">
                      <span className="text-[10px] text-game-secondary w-20 truncate capitalize">{groupId.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-1.5 progress-bar-track">
                        <div className="h-full progress-bar-fill bg-game-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-game-muted w-7 text-right">{pct}%</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Party support */}
            <div>
              <div className="text-[9px] text-game-muted uppercase tracking-wider font-bold mb-1.5">Party Support</div>
              <div className="space-y-1.5">
                {gameState.players.map(player => {
                  const sat = gameState.regionalSatisfaction[selected.id]?.[player.id] ?? 50;
                  const satColor = sat > 60 ? '#10B981' : sat > 40 ? '#F59E0B' : '#EF4444';
                  return (
                    <div key={player.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PARTY_COLORS[player.party.partyColor] }} />
                      <span className="text-[10px] text-game-secondary w-20 truncate">{player.party.partyName}</span>
                      <div className="flex-1 h-2 progress-bar-track">
                        <div className="h-full progress-bar-fill" style={{ width: `${sat}%`, backgroundColor: satColor }} />
                      </div>
                      <span className="text-[10px] font-bold w-8 text-right" style={{ color: satColor }}>{sat.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Regional Events */}
            {(gameState.activeRegionalEvents ?? []).filter(e => e.regionId === selected.id).length > 0 && (
              <div>
                <div className="text-[9px] text-game-muted uppercase tracking-wider font-bold mb-1.5">Active Events</div>
                <div className="space-y-1.5">
                  {(gameState.activeRegionalEvents ?? [])
                    .filter(e => e.regionId === selected.id)
                    .map(evt => (
                      <div key={evt.id} className="glass-card p-2.5 border-amber-800/20">
                        <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                          <span>{evt.icon}</span><span>{evt.name}</span>
                        </div>
                        <p className="text-[10px] text-game-muted mt-0.5">{evt.description}</p>
                        <span className="text-[9px] text-game-muted">{evt.turnsRemaining} turns left</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Key issues */}
            <div>
              <div className="text-[9px] text-game-muted uppercase tracking-wider font-bold mb-1.5">Key Issues</div>
              <div className="flex flex-wrap gap-1">
                {selected.keyIssues.map(issue => (
                  <span key={issue} className="text-[10px] px-2 py-0.5 glass-card text-game-secondary rounded-lg">
                    {issue}
                  </span>
                ))}
              </div>
            </div>

            {/* Religious notice */}
            {selected.demographics.religiousPopulation > 30 && (
              <div className="glass-card p-2.5 border-purple-800/20 bg-purple-950/10">
                <span className="text-xs text-purple-300">⛪ {selected.demographics.religiousPopulation}% religious — sensitive to social policy</span>
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
    <div className="stat-card">
      <div className="text-[9px] text-game-muted uppercase tracking-wider">{label}</div>
      <div className="text-xs font-bold text-white capitalize">{value}</div>
    </div>
  );
}
