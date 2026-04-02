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
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setShowLeaveConfirm(false)} />
          <motion.div className="relative glass-card rounded-2xl p-6 max-w-sm mx-4"
            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={springs.gentle}>
            <h3 className="text-lg font-bold mb-2">Leave this game?</h3>
            <p className="text-game-secondary text-sm mb-6">You&apos;ll disconnect from the room and return to the menu.</p>
            <div className="flex gap-3">
              <motion.button onClick={() => setShowLeaveConfirm(false)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}
                className="flex-1 py-2.5 btn-secondary rounded-xl text-sm font-medium">
                Cancel
              </motion.button>
              <motion.button onClick={handleLeave}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}
                className="flex-1 py-2.5 btn-danger rounded-xl text-sm font-medium">
                Leave
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.div className="text-center max-w-lg"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springs.gentle}>
        <motion.div className="text-6xl mb-6"
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springs.bouncy}>🏛️</motion.div>
        <h2 className="text-2xl font-bold mb-1 font-display">Republic of Novaria</h2>
        <div className="flex items-center justify-center gap-2 mb-8">
          <PulseIndicator color="blue" />
          <p className="text-game-secondary">Waiting for opponent to join</p>
        </div>

        {/* Room code */}
        <motion.div className="hero-card rounded-2xl p-6 mb-6 inline-block"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...springs.smooth, delay: 0.2 }}>
          <div className="text-label mb-2">Room Code</div>
          <div className="flex items-center gap-3 justify-center">
            <span className="text-4xl font-mono font-bold tracking-[0.3em] text-blue-400">
              {roomId}
            </span>
          </div>
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} transition={springs.snappy}
            className="mt-4 px-5 py-2 btn-primary rounded-xl text-sm font-medium inline-flex items-center gap-2"
          >
            {copied ? '✅ Link copied!' : '📋 Copy Invite Link'}
          </motion.button>
          {copied && (
            <motion.p className="text-xs text-emerald-400 mt-2"
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={springs.snappy}>
              Share with your opponent
            </motion.p>
          )}
        </motion.div>

        {/* Share buttons */}
        <div className="mb-8">
          <div className="text-label mb-3">Invite Friend</div>
          <div className="flex gap-2 justify-center flex-wrap">
            <motion.a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} transition={springs.snappy}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40">
              💬 WhatsApp
            </motion.a>
            <motion.a href={twitterUrl} target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} transition={springs.snappy}
              className="px-4 py-2 rounded-xl text-sm font-medium btn-secondary">
              🐦 Twitter
            </motion.a>
            <motion.button onClick={handleCopy}
              whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} transition={springs.snappy}
              className="px-4 py-2 rounded-xl text-sm font-medium btn-secondary">
              🔗 Copy Link
            </motion.button>
          </div>
        </div>

        {/* Connected players */}
        {gameState && gameState.players.length > 0 && (
          <MotionList className="space-y-2 mb-8">
            {gameState.players.map(player => (
              <MotionListItem key={player.id}>
                <div className="flex items-center gap-3 p-3 glass-card rounded-xl">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: PARTY_COLORS[player.party.partyColor] + '20',
                      border: `1.5px solid ${PARTY_COLORS[player.party.partyColor]}50`,
                    }}>
                    <PartyLogoIcon name={player.party.logo} color={PARTY_COLORS[player.party.partyColor]} size={24} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium" style={{ color: PARTY_COLORS[player.party.partyColor] }}>
                      {player.party.partyName !== 'Default Party' ? player.party.partyName : player.name}
                    </div>
                    <div className="text-xs text-game-muted">{player.role === 'ruling' ? '🏛️ Ruling' : '⚔️ Opposition'}</div>
                  </div>
                  <div className="ml-auto"><PulseIndicator color="green" /></div>
                </div>
              </MotionListItem>
            ))}
          </MotionList>
        )}

        {/* Game Settings */}
        {gameState && (
          <div className="mb-6 text-left max-w-md mx-auto">
            <GameSettingsPanel />
          </div>
        )}

        {/* Waiting animation */}
        <div className="flex items-center justify-center gap-2 text-game-muted">
          <span className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.span key={i} className="w-2 h-2 bg-blue-400/60 rounded-full"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }} />
            ))}
          </span>
          <span className="text-sm">Waiting for Player 2 to join...</span>
        </div>
      </motion.div>
    </div>
  );
}
