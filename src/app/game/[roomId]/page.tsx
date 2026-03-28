'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { Lobby } from '@/components/Lobby';
import { PartyCreator } from '@/components/PartyCreator';
import { TopBar } from '@/components/TopBar';
import { RulingDashboard } from '@/components/RulingDashboard';
import { OppositionDashboard } from '@/components/OppositionDashboard';
import { EventModal } from '@/components/EventModal';
import { DilemmaModal } from '@/components/DilemmaModal';
import { ElectionScreen } from '@/components/ElectionScreen';
import { GameOverScreen } from '@/components/GameOverScreen';
import { PollingSummary } from '@/components/PollingSummary';
import { ParliamentHemicycle } from '@/components/ParliamentHemicycle';
import { CabinetPanel } from '@/components/CabinetPanel';
import { PolicyWeb } from '@/components/PolicyWeb';
import { NovariMap } from '@/components/NovariMap';
import { ThreatAdvisory } from '@/components/ThreatAdvisory';
import { SituationsPanel } from '@/components/SituationsPanel';
import { NewsTicker } from '@/components/NewsTicker';
import { RegionalPanel } from '@/components/RegionalPanel';
import { SparklinePanel } from '@/components/SparklinePanel';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { gameState, playerId, mode, centerView, setCenterView } = useGameStore();
  const { endTurnPhase } = useGameActions();
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    if (!mode || mode === 'none') {
      setDisconnected(true);
    }
  }, [mode]);

  if (disconnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-lg">Connecting...</div>
      </div>
    );
  }

  // Waiting for opponent
  if (gameState.phase === 'waiting' || gameState.players.length < 2) {
    return <Lobby roomId={roomId} />;
  }

  // Party creation
  if (gameState.phase === 'party_creation') {
    const myPlayer = gameState.players.find(p => p.id === playerId);
    const hasSubmitted = myPlayer && myPlayer.party.partyName !== 'Default Party' && myPlayer.party.partyName !== 'Opposition';
    
    if (hasSubmitted) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="text-center animate-fade-in">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-bold mb-2">Party Created!</h2>
            <p className="text-slate-400">Waiting for your opponent to create their party...</p>
          </div>
        </div>
      );
    }
    return <PartyCreator />;
  }

  // Game Over
  if (gameState.phase === 'game_over') {
    return <GameOverScreen />;
  }

  // Election
  if (gameState.phase === 'election') {
    return <ElectionScreen />;
  }

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const myRole = myPlayer?.role;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <TopBar />

      {/* Modals */}
      {gameState.phase === 'events' && gameState.currentEvent && <EventModal />}
      {gameState.phase === 'dilemma' && gameState.activeDilemma && <DilemmaModal />}
      {gameState.phase === 'polling' && <PollingSummary />}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL — Parliament, Cabinet, Threats */}
        <div className="w-64 border-r border-slate-800 bg-slate-900/50 overflow-y-auto p-3 space-y-4 flex-shrink-0">
          <ParliamentHemicycle compact />
          <CabinetPanel />
          <SituationsPanel />
          <ThreatAdvisory />
        </div>

        {/* CENTER — Policy Web / Map + Dashboards */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View Toggle */}
          <div className="flex items-center gap-2 p-2 border-b border-slate-800 bg-slate-900/30">
            <button
              onClick={() => setCenterView('policy_web')}
              className={`px-3 py-1 rounded text-xs transition-all ${
                centerView === 'policy_web' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              🕸️ Policy Web
            </button>
            <button
              onClick={() => setCenterView('map')}
              className={`px-3 py-1 rounded text-xs transition-all ${
                centerView === 'map' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              🗺️ Country Map
            </button>
          </div>

          {/* Center content */}
          <div className="flex-1 overflow-y-auto">
            {/* Event phase — no events */}
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

            {/* Dilemma phase — no dilemma (shouldn't happen) */}
            {gameState.phase === 'dilemma' && !gameState.activeDilemma && (
              <div className="flex items-center justify-center h-full">
                <button onClick={endTurnPhase} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold">
                  Continue →
                </button>
              </div>
            )}

            {/* Government formation */}
            {gameState.phase === 'government_formation' && (
              <div className="p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">🏛️ Form Your Government</h2>
                <p className="text-slate-400 mb-6">Appoint ministers to your cabinet using the left panel, then continue.</p>
                <button
                  onClick={endTurnPhase}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all"
                >
                  Begin Governing →
                </button>
              </div>
            )}

            {/* Ruling turn */}
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

            {/* Opposition turn */}
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

            {/* Default: Show Policy Web or Map */}
            {!['events', 'dilemma', 'ruling', 'resolution', 'opposition', 'government_formation'].includes(gameState.phase) && (
              centerView === 'policy_web' ? <PolicyWeb /> : <NovariMap />
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Regional satisfaction, sparklines */}
        <div className="w-72 border-l border-slate-800 bg-slate-900/50 overflow-y-auto p-3 space-y-4 flex-shrink-0">
          <RegionalPanel />
          <SparklinePanel />
        </div>
      </div>

      {/* Bottom: News Ticker */}
      <NewsTicker />
    </div>
  );
}
