'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { REGIONS, REGION_MAP } from '@/lib/engine/regions';
import { PARTY_COLORS } from '@/lib/engine/types';

// SVG paths for Novaria's regions — irregular shapes forming a country
const REGION_PATHS: Record<string, string> = {
  capitalis: 'M 220,180 L 260,160 L 300,165 L 310,190 L 305,220 L 280,240 L 250,235 L 225,215 Z',
  nordmark: 'M 150,40 L 200,30 L 260,35 L 310,50 L 330,80 L 310,120 L 260,160 L 220,180 L 180,150 L 140,120 L 130,80 Z',
  sudfeld: 'M 140,280 L 180,260 L 225,215 L 250,235 L 280,240 L 310,260 L 330,300 L 310,340 L 280,360 L 220,370 L 170,350 L 140,320 Z',
  ostwald: 'M 310,190 L 340,170 L 380,160 L 420,180 L 430,220 L 420,260 L 380,280 L 340,270 L 310,260 L 280,240 L 305,220 Z',
  westhafen: 'M 60,150 L 100,130 L 130,80 L 140,120 L 180,150 L 220,180 L 225,215 L 180,260 L 140,280 L 100,270 L 70,240 L 50,200 Z',
  bergland: 'M 310,50 L 360,40 L 410,60 L 440,100 L 430,140 L 420,180 L 380,160 L 340,170 L 310,190 L 305,220 L 280,240 L 250,235 L 225,215 L 220,180 L 260,160 L 310,120 L 330,80 Z',
};

// Label positions for each region
const LABEL_POS: Record<string, { x: number; y: number }> = {
  capitalis: { x: 262, y: 200 },
  nordmark: { x: 230, y: 90 },
  sudfeld: { x: 240, y: 310 },
  ostwald: { x: 370, y: 225 },
  westhafen: { x: 130, y: 200 },
  bergland: { x: 370, y: 110 },
};

export function NovariMap() {
  const { gameState } = useGameStore();
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!gameState) return null;

  const lastElection = gameState.electionHistory[gameState.electionHistory.length - 1];

  const getRegionColor = (regionId: string): string => {
    if (lastElection) {
      const winnerId = lastElection.regionWinners[regionId];
      const winner = gameState.players.find(p => p.id === winnerId);
      if (winner) return PARTY_COLORS[winner.party.partyColor];
    }
    // Default: neutral
    return '#475569';
  };

  const hoveredRegionData = hoveredRegion ? REGION_MAP.get(hoveredRegion) : null;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox="30 20 430 370"
        className="w-full h-full max-h-[500px]"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
      >
        {/* Water background */}
        <rect x="30" y="20" width="430" height="370" fill="#0f172a" rx="8" />

        {/* Region polygons */}
        {REGIONS.map(region => {
          const path = REGION_PATHS[region.id];
          const isHovered = hoveredRegion === region.id;
          const color = getRegionColor(region.id);

          return (
            <g key={region.id}>
              <path
                d={path}
                fill={color}
                fillOpacity={isHovered ? 0.9 : 0.6}
                stroke={isHovered ? '#fff' : '#64748b'}
                strokeWidth={isHovered ? 2.5 : 1}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={(e) => {
                  setHoveredRegion(region.id);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredRegion(null)}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              />
              {/* Region label */}
              <text
                x={LABEL_POS[region.id].x}
                y={LABEL_POS[region.id].y}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="bold"
                className="pointer-events-none select-none"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
              >
                {region.name}
              </text>
              <text
                x={LABEL_POS[region.id].x}
                y={LABEL_POS[region.id].y + 14}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
                className="pointer-events-none select-none"
              >
                {region.seats} seats
              </text>
            </g>
          );
        })}

        {/* Country name */}
        <text x="240" y="395" textAnchor="middle" fill="#64748b" fontSize="10" fontStyle="italic">
          Republic of Novaria
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredRegion && hoveredRegionData && (
        <div
          className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg p-3 pointer-events-none shadow-xl"
          style={{ left: tooltipPos.x + 15, top: tooltipPos.y - 10 }}
        >
          <h4 className="font-bold text-sm mb-1">{hoveredRegionData.name}</h4>
          <p className="text-xs text-slate-400 mb-2">{hoveredRegionData.description}</p>
          <div className="text-xs space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Population:</span>
              <span>{(hoveredRegionData.populationShare * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Seats:</span>
              <span>{hoveredRegionData.seats}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Lean:</span>
              <span>
                {hoveredRegionData.economicLean < 45 ? 'Left' : hoveredRegionData.economicLean > 55 ? 'Right' : 'Center'}
                {' / '}
                {hoveredRegionData.socialLean < 45 ? 'Auth' : hoveredRegionData.socialLean > 55 ? 'Liberal' : 'Moderate'}
              </span>
            </div>
            <div className="text-slate-500 mt-1">Key issues:</div>
            <div className="flex flex-wrap gap-1">
              {hoveredRegionData.keyIssues.map(issue => (
                <span key={issue} className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">{issue}</span>
              ))}
            </div>
            {/* Regional satisfaction */}
            {gameState.players.map(player => {
              const sat = gameState.regionalSatisfaction[hoveredRegion]?.[player.id] ?? 50;
              return (
                <div key={player.id} className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PARTY_COLORS[player.party.partyColor] }} />
                  <span className="text-slate-400">{player.party.partyName}:</span>
                  <span className={sat > 55 ? 'text-green-400' : sat < 45 ? 'text-red-400' : 'text-yellow-400'}>
                    {sat}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
