'use client';

import { useGameStore } from '@/lib/store';
import { PARTY_COLORS } from '@/lib/engine/types';
import { POLICY_MAP } from '@/lib/engine/policies';

export function BillsPanel() {
  const { gameState } = useGameStore();
  const delayedPolicies = gameState?.delayedPolicies ?? [];
  if (!gameState || (gameState.activeBills.length === 0 && delayedPolicies.length === 0)) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold text-game-secondary uppercase tracking-wider flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-game-accent" />
        Recent Bills
      </h4>

      {/* D4: Show delayed policies pending implementation */}
      {delayedPolicies.length > 0 && (
        <div className="space-y-1">
          {delayedPolicies.map((dp, i) => {
            const policy = POLICY_MAP.get(dp.policyId);
            return (
              <div key={`delayed-${i}`} className="glass-card p-2 ring-1 ring-amber-800/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-300">
                    ⏳ {policy?.name ?? dp.policyId}: {dp.originalValue} → {dp.newValue}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-400 border border-amber-700/50">
                    {dp.turnsRemaining} turn{dp.turnsRemaining !== 1 ? 's' : ''} left
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {gameState.activeBills.slice(-5).reverse().map(bill => {
        const policy = POLICY_MAP.get(bill.policyId);
        const passed = bill.status === 'passed';
        const author = gameState.players.find(p => p.id === bill.authorId);
        const botAuthor = gameState.botParties.find(b => b.id === bill.authorId);
        const authorName = author?.party.partyName ?? botAuthor?.name ?? 'Unknown';
        const isOppositionBill = author?.role === 'opposition';
        const isBotBill = bill.authorId.startsWith('bot_');

        return (
          <div key={bill.id} className={`glass-card p-2.5 ${passed ? 'ring-1 ring-emerald-800/50' : 'ring-1 ring-red-800/50'}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">{bill.title}</span>
                {isOppositionBill && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-900/50 text-orange-400 border border-orange-700/50">
                    OPP
                  </span>
                )}
                {isBotBill && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-900/50 text-purple-400 border border-purple-700/50">
                    BOT
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${passed ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                {passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <div className="text-[10px] text-game-muted mb-1">
              by {authorName} • {bill.votesFor}–{bill.votesAgainst}
            </div>

            {/* Party vote breakdown */}
            {bill.partyVotes && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(bill.partyVotes).map(([pid, votes]) => {
                  const player = gameState.players.find(p => p.id === pid);
                  const bot = gameState.botParties.find(b => b.id === pid);
                  const name = player?.party.partyName ?? bot?.name ?? pid;
                  const color = player ? PARTY_COLORS[player.party.partyColor] : bot?.color ?? '#666';
                  const votedYes = votes.yes > votes.no;

                  return (
                    <span key={pid} className="text-[9px] px-1 py-0.5 rounded" style={{
                      backgroundColor: color + '20',
                      color: votedYes ? '#10B981' : '#EF4444',
                      border: `1px solid ${color}30`,
                    }}>
                      {name}: {votes.yes}Y
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
