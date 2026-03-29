'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { Lobby } from '@/components/Lobby';
import { PartyCreator } from '@/components/PartyCreator';
import { TopBar } from '@/components/TopBar';
import { RulingDashboard } from '@/components/RulingDashboard';
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
import { NewsTicker } from '@/components/NewsTicker';
import { SparklinePanel } from '@/components/SparklinePanel';
import { DetailPanel } from '@/components/DetailPanel';
import { EventCards } from '@/components/EventCards';
import { OppositionActionPanel } from '@/components/OppositionActionPanel';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { gameState, playerId, mode, centerView, setCenterView, detailPanelNodeId } = useGameStore();
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

  if (gameState.phase === 'waiting' || gameState.players.length < 2) {
    return <Lobby roomId={roomId} />;
  }

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

  if (gameState.phase === 'game_over') return <GameOverScreen />;
  if (gameState.phase === 'election') return <ElectionScreen />;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const myRole = myPlayer?.role;
  const isRulingPhase = gameState.phase === 'ruling' || gameState.phase === 'resolution';
  const isOppositionPhase = gameState.phase === 'opposition';
  const isMyTurn = (isRulingPhase && myRole === 'ruling') || (isOppositionPhase && myRole === 'opposition');
  const showWaiting = (isRulingPhase && myRole === 'opposition') || (isOppositionPhase && myRole === 'ruling');

  // What to show in center
  const showPolicyWeb = centerView === 'policy_web';
  const showMap = centerView === 'map';

  // Right panel: Detail panel (if node selected), or action panel (if opposition turn), or default panels
  const showDetailPanel = !!detailPanelNodeId;
  const showOppositionActions = isOppositionPhase && myRole === 'opposition';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      <TopBar />

      {/* Modals */}
      {gameState.phase === 'events' && gameState.currentEvent && <EventModal />}
      {gameState.phase === 'dilemma' && gameState.activeDilemma && <DilemmaModal />}
      {gameState.phase === 'polling' && <PollingSummary />}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Events + Crises sidebar */}
        <EventCards />

        {/* CENTER */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Phase-specific content */}
          {gameState.phase === 'events' && !gameState.currentEvent && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xl text-slate-400 mb-4">No events this turn</p>
                <button onClick={endTurnPhase}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {gameState.phase === 'government_formation' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">🏛️ Form Your Government</h2>
                <p className="text-slate-400 mb-6">Appoint ministers in the sidebar, then continue.</p>
                <button onClick={endTurnPhase}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all">
                  Begin Governing →
                </button>
              </div>
            </div>
          )}

          {showWaiting && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">⏳</div>
                <p className="text-xl text-slate-400">
                  {isRulingPhase ? 'Ruling Party is making policy changes...' : 'Opposition is planning their moves...'}
                </p>
              </div>
            </div>
          )}

          {/* Ruling: Show PolicyWeb/Map + Policy cards area */}
          {isRulingPhase && myRole === 'ruling' && (
            <RulingDashboard />
          )}

          {/* Opposition: Show PolicyWeb/Map (they can see but not change policies) */}
          {isOppositionPhase && myRole === 'opposition' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 p-2 border-b border-slate-800/50 bg-slate-900/30">
                <button onClick={() => setCenterView('policy_web')}
                  className={`px-3 py-1 rounded text-xs transition-all ${showPolicyWeb ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  🕸️ Policy Web
                </button>
                <button onClick={() => setCenterView('map')}
                  className={`px-3 py-1 rounded text-xs transition-all ${showMap ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  🗺️ Map
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {showPolicyWeb ? <PolicyWeb /> : <NovariMap />}
              </div>
            </div>
          )}

          {/* Default view for other phases */}
          {!['events', 'dilemma', 'ruling', 'resolution', 'opposition', 'government_formation', 'polling'].includes(gameState.phase) && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 p-2 border-b border-slate-800/50 bg-slate-900/30">
                <button onClick={() => setCenterView('policy_web')}
                  className={`px-3 py-1 rounded text-xs transition-all ${showPolicyWeb ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  🕸️ Policy Web
                </button>
                <button onClick={() => setCenterView('map')}
                  className={`px-3 py-1 rounded text-xs transition-all ${showMap ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  🗺️ Map
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {showPolicyWeb ? <PolicyWeb /> : <NovariMap />}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR — context-dependent */}
        {showDetailPanel ? (
          <DetailPanel />
        ) : showOppositionActions ? (
          <OppositionActionPanel />
        ) : (
          <div className="w-72 border-l border-slate-700/50 bg-slate-900/50 overflow-y-auto p-3 space-y-4 flex-shrink-0">
            <ParliamentHemicycle compact />
            <CabinetPanel />
            <SparklinePanel />
            <ThreatAdvisory />
          </div>
        )}
      </div>

      <NewsTicker />
    </div>
  );
}
