'use client';

import { useGameStore } from '@/lib/store';
import { PARTY_COLORS } from '@/lib/engine/types';

interface Props {
  compact?: boolean;
}

export function ParliamentHemicycle({ compact = false }: Props) {
  const { gameState } = useGameStore();
  if (!gameState || !gameState.parliament.seats.length) return null;

  const { seats, seatsByParty } = gameState.parliament;
  const totalSeats = seats.length;

  // Sort seats by party for visual grouping
  const sortedSeats = [...seats].sort((a, b) => {
    if (a.partyId === b.partyId) return a.id - b.id;
    // Ruling party on left
    const ruling = gameState.players.find(p => p.role === 'ruling');
    if (a.partyId === ruling?.id) return -1;
    if (b.partyId === ruling?.id) return 1;
    return a.partyId.localeCompare(b.partyId);
  });

  // Calculate seat positions in hemicycle
  const rows = compact ? 4 : 6;
  const centerX = compact ? 100 : 200;
  const centerY = compact ? 85 : 170;
  const minRadius = compact ? 30 : 55;
  const radiusStep = compact ? 14 : 18;
  const seatRadius = compact ? 3.5 : 5;

  // Distribute seats across rows
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

      seatElements.push(
        <circle
          key={seat.id}
          cx={x}
          cy={y}
          r={seatRadius}
          fill={seat.partyColor}
          opacity={0.85}
          className="transition-all duration-300"
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
          stroke="#1e293b"
          strokeWidth="1"
        />
        {seatElements}
      </svg>

      {/* Seat counts */}
      <div className={`flex justify-center gap-4 ${compact ? 'mt-1' : 'mt-2'}`}>
        {gameState.players.map(player => {
          const playerSeats = seatsByParty[player.id] ?? 0;
          return (
            <div key={player.id} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PARTY_COLORS[player.party.partyColor] }}
              />
              <span className="text-slate-300">{player.party.partyName}:</span>
              <span className="font-bold text-slate-100">{playerSeats}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
