'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { PARTY_COLORS, Bill } from '@/lib/engine/types';
import { POLICY_MAP } from '@/lib/engine/policies';
import { BILL_LIBRARY, BILL_CATEGORIES } from '@/lib/engine/billLibrary';
import { useAudio } from './AudioManager';

type BillTab = 'active' | 'propose' | 'history';

const CATEGORY_STYLES: Record<string, { icon: string; gradient: string; accent: string }> = {
  economy:     { icon: '💰', gradient: 'from-amber-900/30 to-amber-950/10', accent: 'text-amber-400' },
  healthcare:  { icon: '🏥', gradient: 'from-rose-900/30 to-rose-950/10', accent: 'text-rose-400' },
  education:   { icon: '🎓', gradient: 'from-blue-900/30 to-blue-950/10', accent: 'text-blue-400' },
  environment: { icon: '🌿', gradient: 'from-emerald-900/30 to-emerald-950/10', accent: 'text-emerald-400' },
  security:    { icon: '🛡️', gradient: 'from-violet-900/30 to-violet-950/10', accent: 'text-violet-400' },
  social:      { icon: '⚖️', gradient: 'from-pink-900/30 to-pink-950/10', accent: 'text-pink-400' },
  immigration: { icon: '🌍', gradient: 'from-cyan-900/30 to-cyan-950/10', accent: 'text-cyan-400' },
};

function getRarity(cost: number): { label: string; class: string; textClass: string } {
  if (cost >= 4) return { label: '★ LEGENDARY', class: 'bill-rarity-legendary', textClass: 'text-amber-400' };
  if (cost >= 3) return { label: '◆ RARE', class: 'bill-rarity-rare', textClass: 'text-purple-400' };
  if (cost >= 2) return { label: '● UNCOMMON', class: 'bill-rarity-uncommon', textClass: 'text-blue-400' };
  return { label: '○ COMMON', class: 'bill-rarity-common', textClass: 'text-slate-500' };
}

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
  const { playSfx } = useAudio();
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

  const catStyle = CATEGORY_STYLES[selectedCategory] ?? CATEGORY_STYLES.economy;

  return (
    <div className="space-y-3">
      {/* Category filter — pill style */}
      <div className="flex flex-wrap gap-1.5">
        {BILL_CATEGORIES.map(cat => {
          const style = CATEGORY_STYLES[cat.id];
          const isSelected = selectedCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
              className={`text-[11px] px-3 py-1 rounded-full font-medium transition-all ${
                isSelected
                  ? `bg-gradient-to-r ${style?.gradient} text-white border border-white/10 shadow-lg`
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 border border-transparent'
              }`}>
              {cat.icon} {cat.name}
            </button>
          );
        })}
      </div>

      {/* Bill grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-1">
        {bills.map(template => {
          const isActive = activeBillTemplates.has(template.id);
          const cost = isRuling ? template.cost : template.cost + 1;
          const canAfford = pc >= cost;
          const rarity = getRarity(template.cost);
          const catS = CATEGORY_STYLES[template.category] ?? CATEGORY_STYLES.economy;

          return (
            <div key={template.id}
              className={`bill-card glass-card ${rarity.class} ${isActive ? 'opacity-40 grayscale' : ''} group`}
            >
              {/* Category header band */}
              <div className={`bg-gradient-to-r ${catS.gradient} px-3 py-1.5 rounded-t-[11px] -m-px mb-0 border-b border-white/5`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${catS.accent}`}>
                    {catS.icon} {template.category}
                  </span>
                  <span className={`text-[9px] font-bold ${rarity.textClass}`}>
                    {rarity.label}
                  </span>
                </div>
              </div>

              <div className="p-2.5 pt-2">
                {/* Title */}
                <h4 className="text-[13px] font-bold text-white mb-1 leading-tight group-hover:text-blue-300 transition-colors">
                  {template.name}
                </h4>

                {/* Description — truncated */}
                <p className="text-[10px] text-game-muted mb-2 line-clamp-2 leading-relaxed">{template.description}</p>

                {/* Effects — compact visual indicators */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {template.popularityEffects.slice(0, 3).map(eff => (
                    <span key={eff.voterGroup} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      eff.effect > 0
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/15 text-red-400 border border-red-500/20'
                    }`}>
                      {eff.effect > 0 ? '▲' : '▼'} {eff.voterGroup}
                    </span>
                  ))}
                  {template.popularityEffects.length > 3 && (
                    <span className="text-[9px] text-slate-600 self-center">+{template.popularityEffects.length - 3}</span>
                  )}
                </div>

                {/* Constitutional risk */}
                {template.constitutionalScore < 60 && (
                  <div className="text-[9px] text-red-400/80 mb-2">⚠ Constitutional risk ({template.constitutionalScore}%)</div>
                )}

                {/* Bottom: Cost + Propose */}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                    ⚡ {cost} PC
                  </span>
                  <button
                    onClick={() => { proposeBillFromLibrary(template.id); playSfx('propose'); }}
                    disabled={isActive || !canAfford || !canPropose}
                    className="text-[10px] px-3 py-1 rounded-full font-semibold transition-all
                      bg-blue-600/80 text-white border border-blue-500/30
                      hover:bg-blue-500 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]
                      disabled:bg-slate-700/50 disabled:text-slate-500 disabled:border-slate-600/30 disabled:shadow-none"
                  >
                    {isActive ? '✓ Active' : !canPropose ? '⏳ Wait' : canAfford ? '📜 Propose' : `Need ${cost}`}
                  </button>
                </div>
              </div>
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
        <div className="space-y-3">
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeBills.slice().reverse().map(bill => (
              <BillCard key={bill.id} bill={bill} showActions={isMyTurn} />
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="max-h-[300px] overflow-y-auto">
          {historyBills.length === 0 ? (
            <p className="text-[10px] text-game-muted text-center py-2">No bill history</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {historyBills.slice().reverse().map(bill => (
                <BillCard key={bill.id} bill={bill} showActions={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
