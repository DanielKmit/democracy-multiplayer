'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { loadPersistedState, restoreGame, setOnStateChange } from '@/lib/gameHost';
import { GameState } from '@/lib/engine/types';
import { Lobby } from '@/components/Lobby';
import { PartyCreator } from '@/components/PartyCreator';
import { TopBar } from '@/components/TopBar';
import { RulingDashboard } from '@/components/RulingDashboard';
import { EventModal } from '@/components/EventModal';
import { DilemmaModal } from '@/components/DilemmaModal';
import { ElectionScreen } from '@/components/ElectionScreen';
import { CoalitionScreen } from '@/components/CoalitionScreen';
import { CampaignDashboard } from '@/components/CampaignDashboard';
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
import { BillsPanel } from '@/components/BillsPanel';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { gameState, playerId, mode, centerView, setCenterView, detailPanelNodeId } = useGameStore();
  const { endTurnPhase } = useGameActions();
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    if (!mode || mode === 'none') {
      // Try to restore from localStorage before declaring disconnected
      const saved = loadPersistedState();
      if (saved && saved.roomId === roomId && saved.phase !== 'game_over') {
        const store = useGameStore.getState();
        store.setPlayerId('host');
        store.setPlayerName(saved.players[0]?.name ?? 'Player');
        store.setRoomId(saved.roomId);
        store.setMode('host');
        store.setConnected(true);

        const state = restoreGame(saved);
        store.setGameState(state);

        setOnStateChange((newState: GameState) => {
          useGameStore.getState().setGameState(newState);
        });
      } else {
        setDisconnected(true);
      }
    }
  }, [mode, roomId]);

  if (disconnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-game-bg">
        <div className="text-center">
          <p className="text-2xl mb-4">😔 Connection Lost</p>
          <p className="text-game-secondary mb-4">You may have refreshed the page or the opponent disconnected.</p>
          <a href="/" className="text-game-accent hover:text-blue-300 underline">Return to Menu</a>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-game-bg">
        <div className="text-game-secondary text-lg">Connecting...</div>
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
        <div className="min-h-screen flex items-center justify-center bg-game-bg">
          <div className="text-center animate-fade-in">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-bold mb-2 font-display">Party Created!</h2>
            <p className="text-game-secondary">Waiting for your opponent to create their party...</p>
          </div>
        </div>
      );
    }
    return <PartyCreator />;
  }

  if (gameState.phase === 'game_over') return <GameOverScreen />;
  if (gameState.phase === 'election') return <ElectionScreen />;
  if (gameState.phase === 'coalition_negotiation') return <CoalitionScreen />;
  if (gameState.phase === 'campaigning') return <CampaignDashboard />;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const myRole = myPlayer?.role;
  const isRulingPhase = gameState.phase === 'ruling' || gameState.phase === 'resolution';
  const isOppositionPhase = gameState.phase === 'opposition';
  const isMyTurn = (isRulingPhase && myRole === 'ruling') || (isOppositionPhase && myRole === 'opposition');
  const showWaiting = (isRulingPhase && myRole === 'opposition') || (isOppositionPhase && myRole === 'ruling');

  const showPolicyWeb = centerView === 'policy_web';
  const showMap = centerView === 'map';
  const showDetailPanel = !!detailPanelNodeId;
  const showOppositionActions = isOppositionPhase && myRole === 'opposition';

  return (
    <div className="h-screen flex flex-col bg-game-bg text-white overflow-hidden">
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
          {gameState.phase === 'events' && !gameState.currentEvent && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xl text-game-secondary mb-4">No events this turn</p>
                <button onClick={endTurnPhase}
                  className="btn-primary px-6 py-3 rounded-lg font-semibold">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {gameState.phase === 'government_formation' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4 font-display">🏛️ Form Your Government</h2>
                <p className="text-game-secondary mb-6">Appoint ministers in the sidebar, then continue.</p>
                <button onClick={endTurnPhase}
                  className="btn-primary px-8 py-3 rounded-lg font-semibold">
                  Begin Governing →
                </button>
              </div>
            </div>
          )}

          {showWaiting && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">⏳</div>
                <p className="text-xl text-game-secondary">
                  {isRulingPhase ? 'Ruling Party is making policy changes...' : 'Opposition is planning their moves...'}
                </p>
              </div>
            </div>
          )}

          {isRulingPhase && myRole === 'ruling' && <RulingDashboard />}

          {isOppositionPhase && myRole === 'opposition' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 p-2 border-b border-game-border bg-game-card/30">
                <button onClick={() => setCenterView('policy_web')}
                  className={`px-3 py-1 rounded text-xs transition-all ${showPolicyWeb ? 'bg-game-accent text-white' : 'text-game-muted hover:text-game-secondary'}`}>
                  🕸️ Policy Web
                </button>
                <button onClick={() => setCenterView('map')}
                  className={`px-3 py-1 rounded text-xs transition-all ${showMap ? 'bg-game-accent text-white' : 'text-game-muted hover:text-game-secondary'}`}>
                  🗺️ Map
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {showPolicyWeb ? <PolicyWeb /> : <NovariMap />}
              </div>
            </div>
          )}

          {!['events', 'dilemma', 'ruling', 'resolution', 'opposition', 'government_formation', 'polling', 'campaigning', 'coalition_negotiation'].includes(gameState.phase) && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 p-2 border-b border-game-border bg-game-card/30">
                <button onClick={() => setCenterView('policy_web')}
                  className={`px-3 py-1 rounded text-xs transition-all ${showPolicyWeb ? 'bg-game-accent text-white' : 'text-game-muted hover:text-game-secondary'}`}>
                  🕸️ Policy Web
                </button>
                <button onClick={() => setCenterView('map')}
                  className={`px-3 py-1 rounded text-xs transition-all ${showMap ? 'bg-game-accent text-white' : 'text-game-muted hover:text-game-secondary'}`}>
                  🗺️ Map
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {showPolicyWeb ? <PolicyWeb /> : <NovariMap />}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        {showDetailPanel ? (
          <DetailPanel />
        ) : showOppositionActions ? (
          <OppositionActionPanel />
        ) : (
          <div className="w-72 border-l border-game-border bg-game-card/50 overflow-y-auto p-3 space-y-4 flex-shrink-0">
            <ParliamentHemicycle compact />
            <BillsPanel />
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
