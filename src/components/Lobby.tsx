'use client';

import { useGameStore } from '@/lib/store';
import { PARTY_COLORS } from '@/lib/engine/types';
import { PartyLogoIcon } from './icons/PartyLogos';

export function Lobby({ roomId }: { roomId: string }) {
  const { gameState } = useGameStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center animate-fade-in max-w-lg">
        <div className="text-6xl mb-6">🏛️</div>
        <h2 className="text-2xl font-bold mb-1">Republic of Novaria</h2>
        <p className="text-slate-400 mb-8">Waiting for opponent to join</p>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8 inline-block">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Room Code</div>
          <span className="text-4xl font-mono font-bold tracking-[0.4em] text-blue-400">
            {roomId}
          </span>
        </div>

        {/* Show connected players' party cards */}
        {gameState && gameState.players.length > 0 && (
          <div className="space-y-3 mb-8">
            {gameState.players.map(player => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: PARTY_COLORS[player.party.partyColor] + '30',
                    border: `2px solid ${PARTY_COLORS[player.party.partyColor]}`,
                  }}
                >
                  <PartyLogoIcon name={player.party.logo} color={PARTY_COLORS[player.party.partyColor]} size={24} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium" style={{ color: PARTY_COLORS[player.party.partyColor] }}>
                    {player.party.partyName !== 'Default Party' ? player.party.partyName : player.name}
                  </div>
                  <div className="text-xs text-slate-500">{player.role === 'ruling' ? '🏛️ Ruling' : '⚔️ Opposition'}</div>
                </div>
                <div className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-slate-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Waiting for Player 2 to join...</span>
        </div>
      </div>
    </div>
  );
}
