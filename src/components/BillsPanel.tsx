'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { PARTY_COLORS, Bill } from '@/lib/engine/types';
import { POLICY_MAP } from '@/lib/engine/policies';
import { BILL_LIBRARY, BILL_CATEGORIES } from '@/lib/engine/billLibrary';

type BillTab = 'active' | 'propose' | 'history';

const STATUS_BADGES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:          { label: 'PENDING',          color: 'text-amber-400',   bg: 'bg-amber-900/50',   border: 'border-amber-700/50' },
  drafting:         { label: 'DRAFTING',         color: 'text-amber-400',   bg: 'bg-amber-900/50',   border: 'border-amber-700/50' },
  voting:           { label: 'VOTING',           color: 'text-blue-400',    bg: 'bg-blue-900/50',    border: 'border-blue-700/50' },
  passed:           { label: 'PASSED',           color: 'text-emerald-400', bg: 'bg-emerald-900/50', border: 'border-emerald-700/50' },
  failed:           { label: 'FAILED',           color: 'text-red-400',     bg: 'bg-red-900/50',     border: 'border-red-700/50' },
  filibustered:     { label: 'FILIBUSTERED',     color: 'text-orange-400',  bg: 'bg-orange-900/50',  border: 'border-orange-700/50' },
  vetoed:           { label: 'VETOED',           color: 'text-red-400',     bg: 'bg-red-900/50',     border: 'border-red-700/50' },
  unconstitutional: { label: 'UNCONSTITUTIONAL', color: 'text-purple-400',  bg: 'bg-purple-900/50',  border: 'border-purple-700/50' },
};

function BillStatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGES[status] ?? STATUS_BADGES.pending;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.bg} ${badge.color} border ${badge.border}`}>
      {badge.label}
    </span>
  );
}

function BillCard({ bill, showActions }: { bill: Bill; showActions: boolean }) {
  const { gameState, playerId } = useGameStore();
  const { lobbyBill, whipVotes, campaignForBill, vetoBill, challengeConstitutionality, overrideVeto, startLiveVote, forceBillVote } = useGameActions();
  const [lobbyTarget, setLobbyTarget] = useState('');
  const [showLobby, setShowLobby] = useState(false);

  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const isRuling = myPlayer?.role === 'ruling';
  const isOpposition = myPlayer?.role === 'opposition';
  const author = gameState.players.find(p => p.id === bill.authorId);
  const botAuthor = gameState.botParties.find(b => b.id === bill.authorId);
  const authorName = author?.party.partyName ?? botAuthor?.name ?? 'Unknown';
  const isMyBill = bill.authorId === playerId;
  const pc = myPlayer?.politicalCapital ?? 0;

  return (
    <div className={`glass-card p-2.5 ${bill.status === 'passed' ? 'ring-1 ring-emerald-800/50' : bill.status === 'pending' ? 'ring-1 ring-amber-800/30' : 'ring-1 ring-slate-700/50'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-white truncate">{bill.title}</span>
          {bill.authorId.startsWith('bot_') && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-900/50 text-purple-400 border border-purple-700/50 flex-shrink-0">
              BOT
            </span>
          )}
          {author?.role === 'opposition' && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-900/50 text-orange-400 border border-orange-700/50 flex-shrink-0">
              OPP
            </span>
          )}
        </div>
        <BillStatusBadge status={bill.status} />
      </div>

      {bill.description && (
        <p className="text-[10px] text-game-muted mb-1 line-clamp-2">{bill.description}</p>
      )}

      <div className="text-[10px] text-game-muted mb-1">
        by {authorName}
        {bill.votesFor > 0 && ` • ${bill.votesFor}–${bill.votesAgainst}`}
        {bill.status === 'pending' && gameState && (
          <span className="text-blue-400 ml-1">
            🗳️ Ready for vote
            {bill.lobbyInfluence && Object.keys(bill.lobbyInfluence).length > 0 && ' (lobbied)'}
          </span>
        )}
        {(bill as { status: string }).status === 'filibustered' && bill.filibusterTurns && (
          <span className="text-orange-400 ml-1">
            ⏱️ Filibustered ({bill.filibusterTurns} turns left)
          </span>
        )}
        {bill.constitutionalScore !== undefined && bill.constitutionalScore < 60 && (
          <span className="text-red-400 ml-1">⚠️ Const. risk</span>
        )}
      </div>

      {/* Party vote breakdown */}
      {bill.partyVotes && (
        <div className="flex flex-wrap gap-1 mb-1">
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

      {/* Veto override votes */}
      {bill.status === 'vetoed' && bill.vetoOverrideVotes && (
        <div className="text-[10px] text-red-400 mb-1">
          Override attempt: {bill.vetoOverrideVotes.yes}/{bill.vetoOverrideVotes.no} (needed 67)
        </div>
      )}

      {/* Action buttons */}
      {showActions && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {/* Pending bills: start live vote — any player can call during their turn */}
          {bill.status === 'pending' && (isMyBill || isRuling || isOpposition) && (
            <button onClick={() => startLiveVote(bill.id)}
              className="text-[10px] px-2 py-0.5 rounded bg-blue-600/80 text-white border border-blue-500/50 hover:bg-blue-500/80 font-medium animate-pulse">
              🗳️ Call Vote
            </button>
          )}

          {/* Voting bills: open parliament voting modal */}
          {bill.status === 'voting' && (
            <button onClick={() => startLiveVote(bill.id)}
              className="text-[10px] px-2 py-0.5 rounded bg-blue-600/80 text-white border border-blue-500/50 hover:bg-blue-500/80 font-medium animate-pulse">
              📜 Open Vote
            </button>
          )}

          {/* Filibustered bills: ruling can force vote with 60% majority */}
          {(bill as { status: string }).status === 'filibustered' && isRuling && (
            <button onClick={() => forceBillVote(bill.id)}
              className="text-[10px] px-2 py-0.5 rounded bg-orange-600/80 text-white border border-orange-500/50 hover:bg-orange-500/80 font-medium">
              ⚡ Break Filibuster (60%+ needed)
            </button>
          )}

          {/* Lobby on pending bills */}
          {bill.status === 'pending' && pc >= 1 && (
            <>
              {!showLobby ? (
                <button onClick={() => setShowLobby(true)}
                  className="text-[10px] px-2 py-0.5 rounded bg-yellow-900/50 text-yellow-300 border border-yellow-700/50 hover:bg-yellow-800/50">
                  🤝 Lobby
                </button>
              ) : (
                <div className="w-full mt-1 p-1.5 bg-slate-800/50 rounded space-y-1">
                  <select value={lobbyTarget} onChange={(e) => setLobbyTarget(e.target.value)}
                    className="w-full text-[10px] bg-slate-700 rounded px-1.5 py-0.5 text-white border border-slate-600">
                    <option value="">Select party...</option>
                    {gameState.botParties.map(bp => (
                      <option key={bp.id} value={bp.id}>{bp.name} ({bp.seats} seats)</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { if (lobbyTarget) { lobbyBill(bill.id, lobbyTarget, 1, 'support'); setShowLobby(false); } }}
                      disabled={!lobbyTarget}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-800/50 disabled:opacity-40">
                      👍 Support (1 PC)
                    </button>
                    <button
                      onClick={() => { if (lobbyTarget) { lobbyBill(bill.id, lobbyTarget, 1, 'oppose'); setShowLobby(false); } }}
                      disabled={!lobbyTarget}
                      className="text-[10px] px-2 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700/50 hover:bg-red-800/50 disabled:opacity-40">
                      👎 Oppose (1 PC)
                    </button>
                    <button onClick={() => setShowLobby(false)}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-400 hover:bg-slate-600">
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Whip coalition (ruling only, pending bills) */}
          {bill.status === 'pending' && isRuling && pc >= 1 && (
            <button onClick={() => whipVotes(bill.id, 1)}
              className="text-[10px] px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-700/50 hover:bg-purple-800/50">
              🏛️ Whip (1 PC)
            </button>
          )}

          {/* Campaign for/against (pending bills) */}
          {bill.status === 'pending' && pc >= 1 && (
            <>
              <button onClick={() => campaignForBill(bill.id, 1, 'support')}
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-800/50">
                📢 Campaign For
              </button>
              <button onClick={() => campaignForBill(bill.id, 1, 'oppose')}
                className="text-[10px] px-2 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700/50 hover:bg-red-800/50">
                📢 Campaign Against
              </button>
            </>
          )}

          {/* Veto (ruling only, passed or pending bills not their own) */}
          {(bill.status === 'passed' || bill.status === 'pending') && isRuling && !isMyBill && pc >= 3 && (
            <button onClick={() => vetoBill(bill.id)}
              className="text-[10px] px-2 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700/50 hover:bg-red-800/50">
              🚫 Veto (3 PC)
            </button>
          )}

          {/* Override veto (any player, vetoed bills) */}
          {bill.status === 'vetoed' && !bill.vetoOverrideVotes && (
            <button onClick={() => overrideVeto(bill.id)}
              className="text-[10px] px-2 py-0.5 rounded bg-orange-900/50 text-orange-300 border border-orange-700/50 hover:bg-orange-800/50">
              ⚡ Override Veto (needs 67/100)
            </button>
          )}

          {/* Constitutional challenge (passed or pending bills) */}
          {(bill.status === 'passed' || bill.status === 'pending') && !isMyBill && pc >= 2 && (
            <button onClick={() => challengeConstitutionality(bill.id)}
              className="text-[10px] px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-700/50 hover:bg-purple-800/50">
              ⚖️ Challenge (2 PC)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ProposeBillTab() {
  const { gameState, playerId } = useGameStore();
  const { proposeBillFromLibrary } = useGameActions();
  const [selectedCategory, setSelectedCategory] = useState<string>('economy');

  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const pc = myPlayer?.politicalCapital ?? 0;
  const isRuling = myPlayer?.role === 'ruling';
  const canPropose = (gameState.phase === 'ruling' && isRuling) ||
                     (gameState.phase === 'opposition' && !isRuling);

  const bills = BILL_LIBRARY.filter(b => b.category === selectedCategory);

  // Check which bills are already active
  const activeBillTemplates = new Set(
    gameState.activeBills
      .filter(b => b.status === 'pending' || b.status === 'voting' || b.status === 'passed')
      .map(b => b.fromTemplate)
      .filter(Boolean)
  );

  return (
    <div className="space-y-2">
      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {BILL_CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
            className={`text-[10px] px-2 py-0.5 rounded transition-all ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-300'
            }`}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Bill list */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {bills.map(template => {
          const isActive = activeBillTemplates.has(template.id);
          const cost = isRuling ? template.cost : template.cost + 1;
          const canAfford = pc >= cost;

          return (
            <div key={template.id} className={`glass-card p-2 ${isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold text-white">{template.name}</span>
                <span className="text-[10px] text-yellow-400">{cost} PC</span>
              </div>
              <p className="text-[10px] text-game-muted mb-1">{template.description}</p>

              {/* Policy changes preview */}
              <div className="flex flex-wrap gap-1 mb-1">
                {template.policyChanges.map(change => {
                  const policy = POLICY_MAP.get(change.policyId);
                  const current = gameState.policies[change.policyId] ?? 50;
                  const diff = change.targetValue - current;
                  return (
                    <span key={change.policyId} className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-300">
                      {policy?.name ?? change.policyId}: {current}→{change.targetValue}
                      <span className={diff > 0 ? 'text-emerald-400' : 'text-red-400'}> ({diff > 0 ? '+' : ''}{diff})</span>
                    </span>
                  );
                })}
              </div>

              {/* Ideology alignment bar */}
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] text-blue-400">P:{template.ideologyAlignment.progressive}</span>
                <span className="text-[9px] text-slate-500">C:{template.ideologyAlignment.centrist}</span>
                <span className="text-[9px] text-red-400">R:{template.ideologyAlignment.conservative}</span>
                {template.constitutionalScore < 60 && (
                  <span className="text-[9px] text-red-400 ml-1">⚠️ Const. risk ({template.constitutionalScore}%)</span>
                )}
              </div>

              {/* Voter effects preview */}
              <div className="flex flex-wrap gap-1 mb-1.5">
                {template.popularityEffects.slice(0, 4).map(eff => (
                  <span key={eff.voterGroup} className={`text-[9px] px-1 py-0.5 rounded ${
                    eff.effect > 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'
                  }`}>
                    {eff.voterGroup}: {eff.effect > 0 ? '+' : ''}{eff.effect}
                  </span>
                ))}
                {template.popularityEffects.length > 4 && (
                  <span className="text-[9px] text-slate-500">+{template.popularityEffects.length - 4} more</span>
                )}
              </div>

              <button
                onClick={() => proposeBillFromLibrary(template.id)}
                disabled={isActive || !canAfford || !canPropose}
                className="w-full text-[10px] py-1 rounded font-medium transition-all
                  bg-blue-900/50 text-blue-300 border border-blue-700/50
                  hover:bg-blue-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isActive ? '✓ Already Active' : !canPropose ? '⏳ Wait for your turn' : canAfford ? `📋 Propose (${cost} PC)` : `Needs ${cost} PC`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BillsPanel() {
  const { gameState, playerId } = useGameStore();
  const [tab, setTab] = useState<BillTab>('active');
  const delayedPolicies = gameState?.delayedPolicies ?? [];

  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = (gameState.phase === 'ruling' && myPlayer?.role === 'ruling') ||
                   (gameState.phase === 'opposition' && myPlayer?.role === 'opposition');

  // Split bills: active (pending/passed), history (failed/vetoed/unconstitutional)
  const activeBills = gameState.activeBills.filter(b =>
    b.status === 'pending' || b.status === 'voting' || b.status === 'passed' || (b as { status: string }).status === 'filibustered'
  );
  const historyBills = gameState.activeBills.filter(b =>
    b.status === 'failed' || b.status === 'vetoed' || b.status === 'unconstitutional'
  );

  const pendingCount = activeBills.filter(b => b.status === 'pending').length;

  return (
    <div className="space-y-2">
      {/* Tab bar */}
      <div className="flex items-center gap-1">
        <button onClick={() => setTab('active')}
          className={`text-[10px] px-2 py-0.5 rounded transition-all ${tab === 'active' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
          📋 Bills {activeBills.length > 0 && `(${activeBills.length})`}
        </button>
        <button onClick={() => setTab('propose')}
          className={`text-[10px] px-2 py-0.5 rounded transition-all ${tab === 'propose' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
          ➕ Propose
        </button>
        <button onClick={() => setTab('history')}
          className={`text-[10px] px-2 py-0.5 rounded transition-all ${tab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
          📜 History {historyBills.length > 0 && `(${historyBills.length})`}
        </button>
        {pendingCount > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-600 text-white animate-pulse ml-auto">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Tab content */}
      {tab === 'propose' && <ProposeBillTab />}

      {tab === 'active' && (
        <div className="space-y-1.5">
          {/* Delayed policies */}
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

          {activeBills.length === 0 && delayedPolicies.length === 0 && (
            <p className="text-[10px] text-game-muted text-center py-2">No active bills</p>
          )}

          {activeBills.slice().reverse().map(bill => (
            <BillCard key={bill.id} bill={bill} showActions={isMyTurn} />
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {historyBills.length === 0 ? (
            <p className="text-[10px] text-game-muted text-center py-2">No bill history</p>
          ) : (
            historyBills.slice().reverse().map(bill => (
              <BillCard key={bill.id} bill={bill} showActions={false} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
