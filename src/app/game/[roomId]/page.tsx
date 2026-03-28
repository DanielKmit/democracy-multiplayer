'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { Lobby } from '@/components/Lobby';
import { TopBar } from '@/components/TopBar';
import { RulingDashboard } from '@/components/RulingDashboard';
import { OppositionDashboard } from '@/components/OppositionDashboard';
import { EventModal } from '@/components/EventModal';
import { ElectionScreen } from '@/components/ElectionScreen';
import { GameOverScreen } from '@/components/GameOverScreen';
import { ActionLog } from '@/components/ActionLog';
import { PollingSummary } from '@/components/PollingSummary';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { gameState, playerId, mode } = useGameStore();
  const { endTurnPhase } = useGameActions();
  const [disconnected, setDisconnected] = useState(false);

  // Check if we have connection context
  useEffect(() => {
    if (!mode || mode === 'none') {
      // User navigated directly — no connection
      setDisconnected(true);
    }
  }, [mode]);

  if (disconnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-4">😔 Connection Lost</p>
          <p className="text-slate-400 mb-4">You may have refreshed the page or the opponent disconnected.</p>
          <a href="/" className="text-blue-400 hover:text-blue-300 underline">Return to Menu</a>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-lg">Connecting...</div>
      </div>
    );
  }

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const myRole = myPlayer?.role;

  // Waiting for opponent
  if (gameState.phase === 'waiting' || gameState.players.length < 2) {
    return <Lobby roomId={roomId} />;
  }

  // Game Over
  if (gameState.phase === 'game_over') {
    return <GameOverScreen />;
  }

  // Election
  if (gameState.phase === 'election') {
    return <ElectionScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <TopBar />

      {/* Event Modal */}
      {gameState.phase === 'events' && gameState.currentEvent && (
        <EventModal />
      )}

      {/* Polling Summary overlay */}
      {gameState.phase === 'polling' && (
        <PollingSummary />
      )}

      {/* Main Dashboard */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {gameState.phase === 'events' && !gameState.currentEvent && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-xl text-slate-400 mb-4">No events this turn</p>
                <button
                  onClick={endTurnPhase}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {(gameState.phase === 'ruling' || gameState.phase === 'resolution') && myRole === 'ruling' && (
            <RulingDashboard />
          )}

          {(gameState.phase === 'ruling' || gameState.phase === 'resolution') && myRole === 'opposition' && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-6xl mb-4">⏳</div>
                <p className="text-xl text-slate-400">Ruling Party is making policy changes...</p>
              </div>
            </div>
          )}

          {gameState.phase === 'opposition' && myRole === 'opposition' && (
            <OppositionDashboard />
          )}

          {gameState.phase === 'opposition' && myRole === 'ruling' && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-6xl mb-4">⏳</div>
                <p className="text-xl text-slate-400">Opposition is planning their moves...</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Log Sidebar */}
        <div className="w-80 border-l border-slate-800 bg-slate-900/50">
          <ActionLog />
        </div>
      </div>
    </div>
  );
}
