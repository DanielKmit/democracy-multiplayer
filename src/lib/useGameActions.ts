'use client';

import { useGameStore } from './store';
import { handleAction } from './gameHost';
import { sendMessage } from './peer';
import { PolicyChange, OppositionAction } from './engine/types';

export function useGameActions() {
  const mode = useGameStore((s) => s.mode);
  const playerId = useGameStore((s) => s.playerId);

  function dispatch(action: string, payload?: unknown) {
    if (mode === 'host') {
      // Host processes locally
      handleAction(playerId ?? 'host', action, payload);
    } else if (mode === 'client') {
      // Client sends to host via PeerJS
      sendMessage({ type: 'action', action, payload });
    }
  }

  return {
    acknowledgeEvent: () => dispatch('acknowledgeEvent'),
    submitPolicyChanges: (changes: PolicyChange[]) => dispatch('submitPolicyChanges', changes),
    submitOppositionActions: (actions: OppositionAction[]) => dispatch('submitOppositionActions', actions),
    endTurnPhase: () => dispatch('endTurnPhase'),
  };
}
