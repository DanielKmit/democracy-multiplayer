'use client';

import { useMemo, useState } from 'react';
import { useGameStore } from '@/lib/store';
import { PARTY_COLORS } from '@/lib/engine/types';

interface Props {
  compact?: boolean;
}

export function ParliamentHemicycle({ compact = false }: Props) {
  const { gameState } = useGameStore();
  const [hoveredParty, setHoveredParty] = useState<string | null>(null);

  if (!gameState || !gameState.parliament.seats.length) return null;

  const { seats, seatsByParty } = gameState.parliament;
  const totalSeats = seats.length;

  // Build a unified party list (human + bot) with colors
  const allParties = useMemo(() => {
    const parties: { id: string; name: string; color: string; seats: number; isBot: boolean }[] = [];

    for (const player of gameState.players) {
      parties.push({
        id: player.id,
        name: player.party.partyName,
        color: PARTY_COLORS[player.party.partyColor],
        seats: seatsByParty[player.id] ?? 0,
        isBot: false,
      });
    }

    for (const bot of gameState.botParties) {
      parties.push({
        id: bot.id,
        name: bot.name,
        color: bot.color,
        seats: seatsByParty[bot.id] ?? 0,
        isBot: true,
      });
    }

    // Sort: ruling party first, then by seat count desc
    const ruling = gameState.players.find(p => p.role === 'ruling');
    parties.sort((a, b) => {
      if (a.id === ruling?.id) return -1;
      if (b.id === ruling?.id) return 1;
      return b.seats - a.seats;
    });

    return parties;
  }, [gameState.players, gameState.botParties, seatsByParty]);

  // Sort seats by party for visual grouping
  const sortedSeats = useMemo(() => {
    const partyOrder = allParties.map(p => p.id);
    return [...seats].sort((a, b) => {
      const aIdx = partyOrder.indexOf(a.partyId);
      const bIdx = partyOrder.indexOf(b.partyId);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.id - b.id;
    });
  }, [seats, allParties]);

  // Layout
  const rows = compact ? 4 : 6;
  const centerX = compact ? 100 : 200;
  const centerY = compact ? 85 : 170;
  const minRadius = compact ? 30 : 55;
  const radiusStep = compact ? 14 : 18;
  const seatRadius = compact ? 3.5 : 5;

  const seatsPerRow: number[] = [];
  let remaining = totalSeats;
  for (let r = 0; r < rows; r++) {
    const rowCapacity = Math.ceil(remaining / (rows - r));
    seatsPerRow.push(Math.min(rowCapacity, remaining));
    remaining -= seatsPerRow[r];
  }

  let seatIndex = 0;
  const seatElements: React.ReactElement[] = [];

  for (let row = 0; row < rows; row++) {
    const radius = minRadius + row * radiusStep;
    const count = seatsPerRow[row];
    const angleStart = Math.PI * 0.08;
    const angleEnd = Math.PI * 0.92;

    for (let i = 0; i < count; i++) {
      if (seatIndex >= sortedSeats.length) break;
      const seat = sortedSeats[seatIndex];
      const angle = angleStart + (i / (count - 1 || 1)) * (angleEnd - angleStart);
      const x = centerX - radius * Math.cos(angle);
      const y = centerY - radius * Math.sin(angle);

      const isHovered = hoveredParty === seat.partyId;

      seatElements.push(
        <circle
          key={seat.id}
          cx={x}
          cy={y}
          r={isHovered ? seatRadius + 1 : seatRadius}
          fill={seat.partyColor}
          opacity={hoveredParty ? (isHovered ? 1 : 0.2) : 0.85}
          className="transition-all duration-200"
          style={isHovered ? { filter: `drop-shadow(0 0 4px ${seat.partyColor})` } : undefined}
        />
      );
      seatIndex++;
    }
  }

  const svgWidth = compact ? 200 : 400;
  const svgHeight = compact ? 95 : 185;

  return (
    <div>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ maxHeight: compact ? 100 : 200 }}>
        {/* Background arc */}
        <path
          d={`M ${centerX - minRadius - (rows * radiusStep)},${centerY} A ${minRadius + rows * radiusStep},${minRadius + rows * radiusStep} 0 0 1 ${centerX + minRadius + (rows * radiusStep)},${centerY}`}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
        {seatElements}
      </svg>

      {/* ALL party seat counts */}
      <div className={`flex flex-wrap justify-center gap-x-3 gap-y-1 ${compact ? 'mt-1' : 'mt-2'}`}>
        {allParties.filter(p => p.seats > 0).map(party => (
          <div
            key={party.id}
            className="flex items-center gap-1.5 text-xs cursor-pointer transition-opacity"
            onMouseEnter={() => setHoveredParty(party.id)}
            onMouseLeave={() => setHoveredParty(null)}
            style={{ opacity: hoveredParty ? (hoveredParty === party.id ? 1 : 0.4) : 1 }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: party.color }}
            />
            <span className="text-game-secondary whitespace-nowrap">{compact && party.name.length > 10 ? party.name.slice(0, 8) + '…' : party.name}:</span>
            <span className="font-bold text-white">{party.seats}</span>
          </div>
        ))}
      </div>

      {/* Coalition Display */}
      {gameState.coalitionPartners.length > 0 && (() => {
        const ruling = gameState.players.find(p => p.role === 'ruling');
        if (!ruling) return null;
        const rulingSeats = seatsByParty[ruling.id] ?? 0;
        const totalCoalitionSeats = rulingSeats + gameState.coalitionPartners.reduce((s, cp) => s + cp.seats, 0);

        return (
          <div className={`${compact ? 'mt-2' : 'mt-3'} p-2 rounded-lg bg-slate-800/50 border border-slate-700/50`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Ruling Coalition</span>
              <span className={`text-[10px] font-bold ${totalCoalitionSeats >= 51 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalCoalitionSeats}/100 seats
              </span>
            </div>
            <div className="space-y-1">
              {/* Ruling party */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PARTY_COLORS[ruling.party.partyColor] }} />
                <span className="text-white font-medium flex-1">{ruling.party.partyName}</span>
                <span className="text-slate-400">{rulingSeats} seats</span>
                <span className="text-indigo-400 text-[9px]">👑 You</span>
              </div>
              {/* Coalition partners */}
              {gameState.coalitionPartners.map(cp => {
                const bot = gameState.botParties.find(b => b.id === cp.botPartyId);
                if (!bot) return null;
                const loyalty = Math.round(cp.satisfaction / 10);
                const hearts = '♥'.repeat(Math.max(0, loyalty)) + '♡'.repeat(Math.max(0, 10 - loyalty));
                const loyaltyColor = loyalty >= 7 ? 'text-emerald-400' : loyalty >= 4 ? 'text-yellow-400' : 'text-red-400';
                return (
                  <div key={cp.botPartyId} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bot.color }} />
                    <span className="text-white font-medium flex-1 truncate">{bot.name}</span>
                    <span className="text-slate-400">{cp.seats}</span>
                    <span className={`${loyaltyColor} text-[8px] tracking-tighter`} title={`Loyalty: ${loyalty}/10`}>
                      {compact ? hearts.slice(0, 5) : hearts}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
