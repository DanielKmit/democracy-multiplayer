'use client';

import { useGameStore } from './store';
import { handleAction } from './gameHost';
import { sendMessage } from './peer';
import { PolicyChange, OppositionAction, PartyConfig, MinistryId, CoalitionOffer, CampaignAction, GameSettings, ScandalType } from './engine/types';

export function useGameActions() {
  const mode = useGameStore((s) => s.mode);
  const playerId = useGameStore((s) => s.playerId);

  function dispatch(action: string, payload?: unknown) {
    if (mode === 'host' || mode === 'ai_host') {
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
    spinScandal: (scandalId: string) => dispatch('spinScandal', scandalId),
    resolveDiplomaticIncident: (option: 'a' | 'b') => dispatch('resolveDiplomaticIncident', { option }),
    updateGameSettings: (settings: Partial<GameSettings>) => dispatch('updateGameSettings', settings),
    lobbyBill: (billId: string, targetPartyId: string, pcSpent: number, direction: 'support' | 'oppose') =>
      dispatch('lobbyBill', { billId, targetPartyId, pcSpent, direction }),
    whipVotes: (billId: string, pcSpent: number) =>
      dispatch('whipVotes', { billId, pcSpent }),
    campaignForBill: (billId: string, pcSpent: number, direction: 'support' | 'oppose') =>
      dispatch('campaignForBill', { billId, pcSpent, direction }),
    vetoBill: (billId: string) =>
      dispatch('vetoBill', { billId }),
    challengeConstitutionality: (billId: string) =>
      dispatch('challengeConstitutionality', { billId }),
    overrideVeto: (billId: string) =>
      dispatch('overrideVeto', { billId }),
    proposeBillFromLibrary: (templateId: string) =>
      dispatch('proposeBillFromLibrary', { templateId }),
    callBillVote: (billId: string) =>
      dispatch('callBillVote', { billId }),
    // Live vote actions
    startLiveVote: (billId: string) =>
      dispatch('startLiveVote', { billId }),
    lobbyLiveVote: (targetPartyId: string, pcSpent: number, direction: 'support' | 'oppose') =>
      dispatch('lobbyLiveVote', { targetPartyId, pcSpent, direction }),
    whipLiveVote: (pcSpent: number) =>
      dispatch('whipLiveVote', { pcSpent }),
    campaignLiveVote: (pcSpent: number, direction: 'support' | 'oppose') =>
      dispatch('campaignLiveVote', { pcSpent, direction }),
    readyLiveVote: () =>
      dispatch('readyLiveVote'),
    setPlayerVote: (vote: 'yes' | 'no' | null) =>
      dispatch('setPlayerVote', { vote }),
    finalizeLiveVote: () =>
      dispatch('finalizeLiveVote'),
    dismissLiveVote: () =>
      dispatch('dismissLiveVote'),
    readyPhase: () =>
      dispatch('readyPhase'),
    forceBillVote: (billId: string) =>
      dispatch('forceBillVote', { billId }),
    endTurnPhase: () => dispatch('endTurnPhase'),
  };
}
