'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { loadPersistedState, restoreGame, setOnStateChange, handleAction as hostHandleAction } from '@/lib/gameHost';
import { GameState } from '@/lib/engine/types';
import { motion, AnimatePresence, MotionButton, MotionCard, MotionList, MotionListItem, PhaseTransition, PulseIndicator, springs } from '@/components/Motion';
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
import { DebateScreen } from '@/components/DebateScreen';
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
import { PromisesPanel } from '@/components/PromisesPanel';
import { ParliamentVoteModal } from '@/components/ParliamentVoteModal';
import { PhaseOverlay } from '@/components/PhaseOverlay';

type SidebarTab = 'gov' | 'intel' | 'diplo';

type CenterView = 'bills' | 'policy_web' | 'map';

function CenterViewTabs({ centerView, setCenterView, showPolicyWeb, showMap }: {
  centerView: CenterView; setCenterView: (v: CenterView) => void; showPolicyWeb: boolean; showMap: boolean;
}) {
  const views: { id: CenterView; icon: string; label: string }[] = [
    { id: 'bills', icon: '📋', label: 'Bills' },
    { id: 'policy_web', icon: '🕸️', label: 'Policy Web' },
    { id: 'map', icon: '🗺️', label: 'Map' },
  ];
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-game-border bg-game-card/30">
      {views.map(v => (
        <button key={v.id} onClick={() => setCenterView(v.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            (v.id === 'bills' && centerView === 'bills') ||
            (v.id === 'policy_web' && showPolicyWeb) ||
            (v.id === 'map' && showMap)
              ? 'bg-white/[0.06] text-white border border-white/10'
              : 'text-game-muted hover:text-game-secondary'
          }`}>
          {v.icon} {v.label}
        </button>
      ))}
    </div>
  );
}

function CenterViewContent({ centerView, showPolicyWeb }: { centerView: string; showPolicyWeb: boolean }) {
  return (
    <div className="flex-1 overflow-hidden">
      {centerView === 'bills' ? (
        <div className="h-full overflow-y-auto p-4"><BillsPanel /></div>
      ) : showPolicyWeb ? <PolicyWeb /> : <NovariMap />}
    </div>
  );
}

function RightSidebar() {
  const [tab, setTab] = useState<SidebarTab>('gov');
  const tabs: { id: SidebarTab; label: string; icon: string }[] = [
    { id: 'gov', label: 'Gov', icon: '🏛️' },
    { id: 'intel', label: 'Intel', icon: '📊' },
    { id: 'diplo', label: 'More', icon: '🌐' },
  ];

  return (
    <div className="w-72 border-l border-game-border bg-game-card/40 flex flex-col flex-shrink-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-game-border shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
              tab === t.id
                ? 'text-white bg-white/[0.04] border-b-2 border-game-accent'
                : 'text-game-muted hover:text-game-secondary'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === 'gov' && (
          <>
            <ParliamentHemicycle compact />
            <CabinetPanel />
            <PromisesPanel />
            <VictoryProgress />
          </>
        )}
        {tab === 'intel' && (
          <>
            <ScandalPanel />
            <ReputationBar />
            <SparklinePanel />
            <ThreatAdvisory />
          </>
        )}
        {tab === 'diplo' && (
          <>
            <DiplomacyPanel />
            <PolicySynergiesPanel />
          </>
        )}
      </div>
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const { gameState, playerId, mode, centerView, setCenterView, detailPanelNodeId } = useGameStore();
  const { endTurnPhase } = useGameActions();
  const [disconnected, setDisconnected] = useState(false);
  const recoveryAttempted = useRef(false);
  const [showPhaseOverlay, setShowPhaseOverlay] = useState(false);
  const lastPhaseRef = useRef<string>('');

  // Show cinematic overlay on phase changes
  useEffect(() => {
    if (!gameState) return;
    const phase = gameState.phase;
    if (phase !== lastPhaseRef.current && lastPhaseRef.current !== '') {
      // Don't show for transient phases
      const cinematicPhases = ['ruling', 'opposition', 'events', 'polling', 'election', 'campaigning', 'debate', 'coalition_negotiation', 'government_formation', 'dilemma'];
      if (cinematicPhases.includes(phase)) {
        setShowPhaseOverlay(true);
        setTimeout(() => setShowPhaseOverlay(false), 2200);
      }
    }
    lastPhaseRef.current = phase;
  }, [gameState?.phase]);

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

  // Host: listen for all messages from client (actions + playerInfo)
  // Also re-register connect handler to ensure it works after page navigation
  useEffect(() => {
    if (mode !== 'host') return;
    
    const { onMessage, onPeerConnect } = require('@/lib/peer');

    onPeerConnect(() => {
      console.log('[Game] Peer connected (host side)');
      useGameStore.getState().setConnected(true);
    });

    onMessage((msg: { type: string; action?: string; payload?: unknown; name?: string }) => {
      if (msg.type === 'action' && msg.action) {
        hostHandleAction('client', msg.action, msg.payload);
      } else if (msg.type === 'playerInfo' && msg.name) {
        // Handle late-arriving playerInfo (e.g. client joined after host navigated here)
        console.log('[Game] Received playerInfo from client:', msg.name);
        const { handleClientJoin } = require('@/lib/gameHost');
        handleClientJoin(msg.name);
      }
    });
  }, [mode]);

  // Client: listen for state updates from host
  useEffect(() => {
    if (mode !== 'client') return;
    
    const { onMessage, onPeerConnect, onPeerDisconnect } = require('@/lib/peer');
    
    onMessage((msg: { type: string; state?: unknown }) => {
      if (msg.type === 'state' && msg.state) {
        console.log('[Game] Client received state update, phase:', (msg.state as GameState).phase);
        useGameStore.getState().setGameState(msg.state as GameState);
      }
    });

    // Re-register handlers for reconnection
    onPeerConnect(() => {
      console.log('[Game] Client reconnected');
      useGameStore.getState().setConnected(true);
    });

    onPeerDisconnect(() => {
      console.log('[Game] Client disconnected');
      useGameStore.getState().setConnected(false);
    });
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
              className="block w-full px-6 py-3 bg-game-card hover:bg-game-border border border-game-border rounded-lg font-medium transition-all cursor-pointer text-[#9CA3AF]"
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
    if (!hasSubmitted) {
      return <PartyCreator />;
    }
    // Has submitted — show waiting screen
    return (
      <div className="min-h-screen flex items-center justify-center bg-game-bg">
        <motion.div className="text-center"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={springs.gentle}>
          <motion.div className="text-5xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>⏳</motion.div>
          <h2 className="text-xl font-bold mb-2 font-display">Party Created!</h2>
          <p className="text-game-secondary">Waiting for your opponent to create their party...</p>
          <div className="flex justify-center mt-4"><PulseIndicator color="blue" /></div>
        </motion.div>
      </div>
    );
  }

  if (gameState.phase === 'game_over') return <GameOverScreen />;
  if (gameState.phase === 'debate') return <DebateScreen />;
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

      {/* Cinematic phase transition */}
      {showPhaseOverlay && <PhaseOverlay phase={gameState.phase} turn={gameState.turn} />}

      {/* Modals */}
      {gameState.phase === 'events' && gameState.currentEvent && <EventModal />}
      {gameState.phase === 'dilemma' && gameState.activeDilemma && <DilemmaModal />}
      {gameState.phase === 'polling' && <PollingSummary />}
      {gameState.liveVote && <ParliamentVoteModal />}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Events sidebar (Bills moved to center dashboard) */}
        {(isRulingPhase || isOppositionPhase) ? (
          <div className="game-sidebar-left w-64 border-r border-game-border bg-game-card/50 overflow-y-auto p-3 space-y-3 flex-shrink-0">
            <EventCards inline />
          </div>
        ) : (
          <EventCards />
        )}

        {/* CENTER */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <AnimatePresence mode="wait">
          {gameState.phase === 'events' && !gameState.currentEvent && (
            <motion.div key="no-events" className="flex-1 flex items-center justify-center"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={springs.smooth}>
              <div className="text-center">
                <motion.div className="text-4xl mb-4"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springs.bouncy}>📰</motion.div>
                <p className="text-xl text-game-secondary mb-4">No events this turn</p>
                {myRole === 'ruling' ? (
                  <MotionButton variant="primary" onClick={endTurnPhase} className="px-8 py-3 rounded-xl font-semibold text-sm">
                    Continue →
                  </MotionButton>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <PulseIndicator color="blue" />
                    <p className="text-sm text-game-muted">Waiting for ruling party to continue...</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {gameState.phase === 'government_formation' && (
            <motion.div key="gov-form" className="flex-1 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={springs.gentle}>
              <div className="text-center">
                <motion.div className="text-5xl mb-4"
                  animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>🏛️</motion.div>
                <h2 className="text-2xl font-bold mb-4 font-display">Form Your Government</h2>
                {myRole === 'ruling' ? (
                  <>
                    <p className="text-game-secondary mb-6">Appoint ministers in the sidebar, then continue.</p>
                    <MotionButton variant="primary" onClick={endTurnPhase} className="px-8 py-3 rounded-xl font-semibold text-sm">
                      Begin Governing →
                    </MotionButton>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <PulseIndicator color="blue" />
                    <p className="text-game-secondary">Waiting for ruling party to form their government...</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {showWaiting && (
            <motion.div key="waiting" className="flex-1 flex items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={springs.smooth}>
              <div className="text-center max-w-md">
                <motion.div className="text-6xl mb-4"
                  animate={{ rotate: isAIGame && gameState.aiThinking ? [0, 5, -5, 0] : 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}>
                  {isAIGame && gameState.aiThinking ? '🤖' : '⏳'}
                </motion.div>
                <p className="text-xl text-game-secondary mb-2">
                  {isAIGame && gameState.aiThinking
                    ? 'AI is thinking...'
                    : isRulingPhase
                      ? 'Waiting for Ruling Party...'
                      : 'Waiting for Opposition...'}
                </p>
                <p className="text-sm text-game-muted">
                  {isRulingPhase
                    ? 'Your opponent is adjusting policies and proposing bills.'
                    : 'Your opponent is planning opposition actions.'}
                </p>
                {isAIGame && gameState.aiThinking && (
                  <div className="mt-4 flex justify-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 bg-purple-400 rounded-full"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }} />
                    ))}
                  </div>
                )}
                {gameState.actionLog.length > 0 && (
                  <MotionList className="mt-6 space-y-1.5 text-left">
                    <div className="text-label mb-1">Recent Activity</div>
                    {gameState.actionLog.slice(-5).map((entry, i) => (
                      <MotionListItem key={i}>
                        <div className="glass-card p-2.5 text-xs text-game-secondary">
                          {entry.message}
                        </div>
                      </MotionListItem>
                    ))}
                  </MotionList>
                )}
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {isRulingPhase && myRole === 'ruling' && <RulingDashboard />}

          {isOppositionPhase && myRole === 'opposition' && (
            <motion.div className="flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={springs.smooth}>
              {/* Prominent turn banner */}
              <motion.div
                className="px-4 py-3 border-b border-red-800/30 bg-gradient-to-r from-red-950/30 via-red-950/10 to-transparent flex items-center justify-between"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.snappy, delay: 0.1 }}>
                <div className="flex items-center gap-3">
                  <PulseIndicator color="red" />
                  <div>
                    <div className="text-sm font-bold text-red-400">Your Turn — Opposition Phase</div>
                    <div className="text-xs text-game-muted mt-0.5">Challenge the government or propose bills.</div>
                  </div>
                </div>
                <MotionButton variant="danger" onClick={endTurnPhase} className="px-5 py-2 rounded-xl text-xs font-bold">
                  End Turn →
                </MotionButton>
              </motion.div>
              <CenterViewTabs centerView={centerView} setCenterView={setCenterView} showPolicyWeb={showPolicyWeb} showMap={showMap} />
              <CenterViewContent centerView={centerView} showPolicyWeb={showPolicyWeb} />
            </motion.div>
          )}

          {!['events', 'dilemma', 'ruling', 'resolution', 'opposition', 'government_formation', 'polling', 'campaigning', 'debate', 'coalition_negotiation'].includes(gameState.phase) && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <CenterViewTabs centerView={centerView} setCenterView={setCenterView} showPolicyWeb={showPolicyWeb} showMap={showMap} />
              <CenterViewContent centerView={centerView} showPolicyWeb={showPolicyWeb} />
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        {showDetailPanel ? (
          <DetailPanel />
        ) : showOppositionActions ? (
          <OppositionActionPanel />
        ) : (
          <RightSidebar />
        )}
      </div>

      <NewsTicker />
    </div>
  );
}
