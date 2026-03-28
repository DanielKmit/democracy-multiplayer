'use client';

import { useGameStore } from './store';
import { handleAction } from './gameHost';
import { sendMessage } from './peer';
import { PolicyChange, OppositionAction, PartyConfig, MinistryId } from './engine/types';

export function useGameActions() {
  const mode = useGameStore((s) => s.mode);
  const playerId = useGameStore((s) => s.playerId);

  function dispatch(action: string, payload?: unknown) {
    if (mode === 'host') {
      handleAction(playerId ?? 'host', action, payload);
    } else if (mode === 'client') {
      sendMessage({ type: 'action', action, payload });
    }
  }

  return {
    submitPartyConfig: (config: PartyConfig) => dispatch('submitPartyConfig', config),
    acknowledgeEvent: () => dispatch('acknowledgeEvent'),
    resolveDilemma: (option: 'a' | 'b') => dispatch('resolveDilemma', option),
    submitPolicyChanges: (changes: PolicyChange[]) => dispatch('submitPolicyChanges', changes),
    submitOppositionActions: (actions: OppositionAction[]) => dispatch('submitOppositionActions', actions),
    appointMinister: (ministryId: MinistryId, politicianId: string) =>
      dispatch('appointMinister', { ministryId, politicianId }),
    fireMinister: (ministryId: MinistryId) => dispatch('fireMinister', { ministryId }),
    endTurnPhase: () => dispatch('endTurnPhase'),
  };
}
