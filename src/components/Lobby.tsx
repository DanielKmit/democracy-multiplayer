'use client';

import { useGameStore } from '@/lib/store';

export function Lobby({ roomId }: { roomId: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center animate-fade-in">
        <div className="text-6xl mb-6">🏛️</div>
        <h2 className="text-2xl font-bold mb-2">Waiting for Opponent</h2>
        <p className="text-slate-400 mb-8">Share this room code:</p>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8 inline-block">
          <span className="text-4xl font-mono font-bold tracking-[0.4em] text-blue-400">
            {roomId}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 text-slate-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Waiting for Player 2 to join...</span>
        </div>

        <p className="mt-8 text-sm text-slate-600">
          You will play as the <span className="text-blue-400 font-semibold">Ruling Party</span>
        </p>
      </div>
    </div>
  );
}
