'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { PARTY_COLORS } from '@/lib/engine/types';
import { PartyLogoIcon } from './icons/PartyLogos';
import { GameSettingsPanel } from './GameSettingsPanel';
import { destroyPeer } from '@/lib/peer';
import { motion, MotionButton, MotionList, MotionListItem, springs, PulseIndicator } from './Motion';

const BASE_URL = 'https://democracy-game-omega.vercel.app';

export function Lobby({ roomId }: { roomId: string }) {
  const { gameState, reset } = useGameStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const joinUrl = `${BASE_URL}/join/${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = joinUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleLeave = () => {
    destroyPeer();
    reset();
    router.push('/');
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Join my Democracy game! 🏛️\n${joinUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join my Democracy game! 🏛️ ${joinUrl}`)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-game-bg relative">
      {/* Back / Leave button */}
      <button
        onClick={() => setShowLeaveConfirm(true)}
        className="absolute top-4 left-4 px-3 py-2 text-sm text-game-secondary hover:text-white hover:bg-game-card rounded-lg transition-all cursor-pointer"
      >
        ← Back to Menu
      </button>

      {/* Leave confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-game-card border border-game-border rounded-xl p-6 max-w-sm mx-4 animate-fade-in">
            <h3 className="text-lg font-bold mb-2">Leave this game?</h3>
            <p className="text-game-secondary text-sm mb-6">You'll disconnect from the room and return to the menu.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2 bg-game-border hover:bg-game-muted/30 rounded-lg text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-all cursor-pointer"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div className="text-center max-w-lg"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springs.gentle}>
        <motion.div className="text-6xl mb-6"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springs.bouncy}>🏛️</motion.div>
        <h2 className="text-2xl font-bold mb-1">Republic of Novaria</h2>
        <div className="flex items-center justify-center gap-2 mb-8">
          <PulseIndicator color="blue" />
          <p className="text-game-secondary">Waiting for opponent to join</p>
        </div>

        {/* Room code + Copy button */}
        <div className="bg-game-card border border-game-border rounded-xl p-6 mb-6 inline-block">
          <div className="text-xs text-game-muted uppercase tracking-wider mb-2">Room Code</div>
          <div className="flex items-center gap-3 justify-center">
            <span className="text-4xl font-mono font-bold tracking-[0.4em] text-blue-400">
              {roomId}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
          >
            {copied ? '✅ Link copied!' : '📋 Copy Link'}
          </button>
          {copied && (
            <p className="text-xs text-emerald-400 mt-2 animate-fade-in">Share with your opponent</p>
          )}
        </div>

        {/* Share buttons */}
        <div className="mb-8">
          <p className="text-xs text-game-muted uppercase tracking-wider mb-3">📤 Invite Friend</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] cursor-pointer"
            >
              💬 WhatsApp
            </a>
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-game-border hover:bg-game-muted/30 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] cursor-pointer"
            >
              🐦 Twitter
            </a>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-game-border hover:bg-game-muted/30 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] cursor-pointer"
            >
              🔗 Copy Link
            </button>
          </div>
        </div>

        {/* Show connected players' party cards */}
        {gameState && gameState.players.length > 0 && (
          <div className="space-y-3 mb-8">
            {gameState.players.map(player => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 bg-game-card/50 rounded-lg border border-game-border"
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
                  <div className="text-xs text-game-muted">{player.role === 'ruling' ? '🏛️ Ruling' : '⚔️ Opposition'}</div>
                </div>
                <div className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Game Settings */}
        {gameState && (
          <div className="mb-6 text-left max-w-md mx-auto">
            <GameSettingsPanel />
          </div>
        )}

        {/* Waiting animation with pulsing dots */}
        <div className="flex items-center justify-center gap-2 text-game-muted">
          <span className="flex gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          <span>Waiting for Player 2 to join...</span>
        </div>
      </motion.div>
    </div>
  );
}
