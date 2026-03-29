'use client';

import { useGameStore } from './store';
import { handleAction } from './gameHost';
import { sendMessage } from './peer';
import { PolicyChange, OppositionAction, PartyConfig, MinistryId, CoalitionOffer, CampaignAction } from './engine/types';

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
    appointShadowMinister: (ministryId: MinistryId, politicianId: string) =>
      dispatch('appointShadowMinister', { ministryId, politicianId }),
    submitBill: (policyId: string, proposedValue: number) =>
      dispatch('submitBill', { policyId, proposedValue }),
    submitCoalitionOffer: (offer: CoalitionOffer) => dispatch('submitCoalitionOffer', offer),
    submitCampaignActions: (actions: CampaignAction[]) => dispatch('submitCampaignActions', actions),
    poachCoalitionPartner: (botPartyId: string) => dispatch('poachCoalitionPartner', botPartyId),
    endTurnPhase: () => dispatch('endTurnPhase'),
  };
}
