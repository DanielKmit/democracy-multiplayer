'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { loadPersistedState, restoreGame, setOnStateChange, handleAction as hostHandleAction } from '@/lib/gameHost';
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
import { ScandalPanel } from '@/components/ScandalPanel';
import { ReputationBar } from '@/components/ReputationBar';
import { PolicySynergiesPanel } from '@/components/PolicySynergiesPanel';
import { VictoryProgress } from '@/components/VictoryProgress';
import { DiplomacyPanel } from '@/components/DiplomacyPanel';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { gameState, playerId, mode, centerView, setCenterView, detailPanelNodeId } = useGameStore();
  const { endTurnPhase } = useGameActions();
  const [disconnected, setDisconnected] = useState(false);
  const recoveryAttempted = useRef(false);

  // Restore game from localStorage on page refresh (mode resets to 'none')
  useEffect(() => {
    if (!mode || mode === 'none') {
      const saved = loadPersistedState();
      if (saved && saved.roomId === roomId && saved.phase !== 'game_over') {
        const store = useGameStore.getState();
        store.setPlayerId('host');
        store.setPlayerName(saved.players[0]?.name ?? 'Player');
        store.setRoomId(saved.roomId);
        store.setMode(saved.isAIGame ? 'ai_host' : 'host');
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

  // Ensure onStateChange is always registered when we have a host/ai_host mode
  // This covers the case where navigation from home page already set the handler,
  // but also re-registers it if it was somehow lost
  useEffect(() => {
    if (mode === 'host' || mode === 'ai_host') {
      setOnStateChange((newState: GameState) => {
        useGameStore.getState().setGameState(newState);
      });
    }
  }, [mode]);

  // Recovery: detect stuck party_creation phase where both parties are already created
  useEffect(() => {
    if (!gameState || recoveryAttempted.current) return;
    if (gameState.phase !== 'party_creation') return;
    if (gameState.players.length < 2) return;
    if (mode !== 'host' && mode !== 'ai_host') return;

    const allReady = gameState.players.every(
      p => p.party.partyName !== 'Default Party' && p.party.partyName !== 'Opposition'
    );
    if (allReady) {
      recoveryAttempted.current = true;
      // Both parties exist but phase is stuck — re-submit to trigger the allReady check
      const myPlayer = gameState.players.find(p => p.id === playerId);
      if (myPlayer) {
        hostHandleAction(playerId ?? 'host', 'submitPartyConfig', myPlayer.party);
      }
    }
  }, [gameState, mode, playerId]);

  if (disconnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-game-bg">
        <div className="text-center max-w-md mx-4 animate-fade-in">
          <div className="text-5xl mb-4">😔</div>
          <h2 className="text-2xl font-bold mb-2">Connection Lost</h2>
          <p className="text-[#9CA3AF] mb-6">
            This room doesn&apos;t exist or the connection was interrupted. This can happen if you refreshed the page or if your opponent disconnected.
          </p>
          <div className="space-y-3">
            <a href="/" className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all hover:scale-[1.02] cursor-pointer text-center">
              ← Return to Menu
            </a>
            <button
              onClick={() => window.location.reload()}
              className="block w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-medium transition-all cursor-pointer text-[#9CA3AF]"
            >
              🔄 Try Reconnecting
            </button>
          </div>
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

  const isAIGame = gameState.isAIGame;

  if (!isAIGame && (gameState.phase === 'waiting' || gameState.players.length < 2)) {
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
                <div className="text-6xl mb-4">{isAIGame && gameState.aiThinking ? '🤖' : '⏳'}</div>
                <p className="text-xl text-game-secondary">
                  {isAIGame && gameState.aiThinking
                    ? '🤖 AI is deciding...'
                    : isRulingPhase ? 'Ruling Party is making policy changes...' : 'Opposition is planning their moves...'}
                </p>
                {isAIGame && gameState.aiThinking && (
                  <div className="mt-4 flex justify-center">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
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
            <VictoryProgress />
            <ScandalPanel />
            <ReputationBar />
            <BillsPanel />
            <CabinetPanel />
            <DiplomacyPanel />
            <PolicySynergiesPanel />
            <SparklinePanel />
            <ThreatAdvisory />
          </div>
        )}
      </div>

      <NewsTicker />
    </div>
  );
}
