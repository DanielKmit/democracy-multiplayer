'use client';

import { useRef, useState } from 'react';
import { useGameStore } from '@/lib/store';
import { PARTY_COLORS } from '@/lib/engine/types';

export function ElectionShareCard({ onClose }: { onClose: () => void }) {
  const { gameState } = useGameStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!gameState) return null;

  const latestElection = gameState.electionHistory[gameState.electionHistory.length - 1];
  if (!latestElection) return null;

  const allParties = [
    ...gameState.players.map(p => ({
      id: p.id, name: p.party.partyName, color: PARTY_COLORS[p.party.partyColor],
    })),
    ...gameState.botParties.map(b => ({
      id: b.id, name: b.name, color: b.color,
    })),
  ].sort((a, b) => (latestElection.totalSeats[b.id] ?? 0) - (latestElection.totalSeats[a.id] ?? 0));

  const totalSeats = Object.values(latestElection.totalSeats).reduce((sum, s) => sum + s, 0);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      // Use html2canvas if available, otherwise create a simple canvas
      const { default: html2canvas } = await import('html2canvas').catch(() => ({ default: null }));

      if (html2canvas) {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: '#0a0e1a',
          scale: 2,
        });
        const link = document.createElement('a');
        link.download = `democracy-election-${gameState.electionHistory.length}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        // Fallback: copy text summary
        const summary = allParties.map(p =>
          `${p.name}: ${latestElection.totalSeats[p.id] ?? 0} seats`
        ).join('\n');
        await navigator.clipboard.writeText(
          `🏛️ Democracy — Election ${gameState.electionHistory.length} Results\n\n${summary}\n\nPlay at https://democracy-game-omega.vercel.app`
        );
        alert('Results copied to clipboard!');
      }
    } catch {
      // Final fallback
      const summary = allParties.map(p =>
        `${p.name}: ${latestElection.totalSeats[p.id] ?? 0} seats`
      ).join('\n');
      try {
        await navigator.clipboard.writeText(
          `🏛️ Democracy — Election ${gameState.electionHistory.length} Results\n\n${summary}\n\nPlay at https://democracy-game-omega.vercel.app`
        );
        alert('Results copied to clipboard!');
      } catch {
        alert('Could not export results');
      }
    }

    setDownloading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full animate-fade-in">
        {/* The shareable card */}
        <div
          ref={cardRef}
          className="bg-gradient-to-br from-game-card via-game-card to-game-bg rounded-2xl p-6 border border-game-border"
        >
          <div className="text-center mb-4">
            <div className="text-3xl mb-1">🏛️</div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent">
              Democracy
            </h2>
            <p className="text-xs text-game-secondary">Election {gameState.electionHistory.length} • Republic of Novaria</p>
          </div>

          {/* Seat bar visualization */}
          <div className="w-full h-8 rounded-full overflow-hidden flex mb-4">
            {allParties.map(party => {
              const seats = latestElection.totalSeats[party.id] ?? 0;
              const pct = totalSeats > 0 ? (seats / totalSeats) * 100 : 0;
              if (pct < 1) return null;
              return (
                <div
                  key={party.id}
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: party.color }}
                />
              );
            })}
          </div>

          {/* Party results */}
          <div className="space-y-2">
            {allParties.map(party => {
              const seats = latestElection.totalSeats[party.id] ?? 0;
              const pct = totalSeats > 0 ? ((seats / totalSeats) * 100).toFixed(1) : '0.0';
              return (
                <div key={party.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: party.color }} />
                    <span className="text-sm font-medium" style={{ color: party.color }}>{party.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-white">{seats}</span>
                    <span className="text-game-secondary ml-1">seats ({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-game-border text-center">
            <p className="text-[10px] text-game-muted">democracy-game-omega.vercel.app</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-game-border hover:bg-game-muted/30 rounded-lg text-sm font-medium transition-all cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:bg-game-border"
          >
            {downloading ? '⏳ Generating...' : '📸 Share Results'}
          </button>
        </div>
      </div>
    </div>
  );
}
