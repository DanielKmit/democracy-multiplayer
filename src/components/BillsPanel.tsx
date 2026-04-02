'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { PARTY_COLORS, Bill, BillTemplate } from '@/lib/engine/types';
import { POLICY_MAP } from '@/lib/engine/policies';
import { BILL_LIBRARY, BILL_CATEGORIES } from '@/lib/engine/billLibrary';
import { useAudio } from './AudioManager';

type BillTab = 'active' | 'propose' | 'history';

const CATEGORY_STYLES: Record<string, { icon: string; gradient: string; accent: string; bg: string }> = {
  economy:     { icon: '💰', gradient: 'from-amber-900/30 to-amber-950/10', accent: 'text-amber-400', bg: 'bg-amber-500/10' },
  healthcare:  { icon: '🏥', gradient: 'from-rose-900/30 to-rose-950/10', accent: 'text-rose-400', bg: 'bg-rose-500/10' },
  education:   { icon: '🎓', gradient: 'from-blue-900/30 to-blue-950/10', accent: 'text-blue-400', bg: 'bg-blue-500/10' },
  environment: { icon: '🌿', gradient: 'from-emerald-900/30 to-emerald-950/10', accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  security:    { icon: '🛡️', gradient: 'from-violet-900/30 to-violet-950/10', accent: 'text-violet-400', bg: 'bg-violet-500/10' },
  social:      { icon: '⚖️', gradient: 'from-pink-900/30 to-pink-950/10', accent: 'text-pink-400', bg: 'bg-pink-500/10' },
  immigration: { icon: '🌍', gradient: 'from-cyan-900/30 to-cyan-950/10', accent: 'text-cyan-400', bg: 'bg-cyan-500/10' },
};

function getRarity(cost: number): { label: string; class: string; textClass: string } {
  if (cost >= 4) return { label: '★ LEGENDARY', class: 'bill-rarity-legendary', textClass: 'text-amber-400' };
  if (cost >= 3) return { label: '◆ RARE', class: 'bill-rarity-rare', textClass: 'text-purple-400' };
  if (cost >= 2) return { label: '● UNCOMMON', class: 'bill-rarity-uncommon', textClass: 'text-blue-400' };
  return { label: '○ COMMON', class: 'bill-rarity-common', textClass: 'text-game-muted' };
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

/** Show what policy changes a bill makes */
function BillStatPreview({ bill }: { bill: Bill }) {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  // Find the template for stat details
  const template = bill.fromTemplate ? BILL_LIBRARY.find(t => t.id === bill.fromTemplate) : null;

  const policyChanges = template?.policyChanges ?? (bill.policyId ? [{ policyId: bill.policyId, targetValue: bill.proposedValue }] : []);

  if (policyChanges.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1">
      {/* Policy changes */}
      <div className="flex flex-wrap gap-1.5">
        {policyChanges.map(change => {
          const policy = POLICY_MAP.get(change.policyId);
          const current = gameState.policies[change.policyId] ?? 50;
          const diff = change.targetValue - current;
          return (
            <span key={change.policyId} className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${
              diff > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                       : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {policy?.name ?? change.policyId}: {current} → {change.targetValue}
            </span>
          );
        })}
      </div>
      {/* Voter effects */}
      {template?.popularityEffects && template.popularityEffects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {template.popularityEffects.map(eff => (
            <span key={eff.voterGroup} className={`text-[9px] px-1 py-0.5 rounded font-medium ${
              eff.effect > 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {eff.effect > 0 ? '▲' : '▼'}{Math.abs(eff.effect)} {eff.voterGroup}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BillCard({ bill, showActions }: { bill: Bill; showActions: boolean }) {
  const { gameState, playerId } = useGameStore();
  const { lobbyBill, whipVotes, campaignForBill, vetoBill, challengeConstitutionality, overrideVeto, startLiveVote, forceBillVote } = useGameActions();
  const [lobbyTarget, setLobbyTarget] = useState('');
  const [showLobby, setShowLobby] = useState(false);
  const [showStats, setShowStats] = useState(false);

  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const isRuling = myPlayer?.role === 'ruling';
  const isOpposition = myPlayer?.role === 'opposition';
  const author = gameState.players.find(p => p.id === bill.authorId);
  const botAuthor = gameState.botParties.find(b => b.id === bill.authorId);
  const authorName = author?.party.partyName ?? botAuthor?.name ?? 'Unknown';
  const isMyBill = bill.authorId === playerId;
  const pc = myPlayer?.politicalCapital ?? 0;

  const catStyle = CATEGORY_STYLES[bill.category ?? 'economy'] ?? CATEGORY_STYLES.economy;

  return (
    <div className={`glass-card overflow-hidden transition-all ${
      bill.status === 'passed' ? 'ring-1 ring-emerald-800/40' :
      bill.status === 'pending' ? 'ring-1 ring-amber-800/30' :
      bill.status === 'voting' ? 'ring-1 ring-blue-800/40 animate-border-glow' :
      ''
    }`}>
      {/* Header row */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${catStyle.accent}`}>
            {catStyle.icon}
          </span>
          <span className="text-sm font-bold text-white truncate">{bill.title}</span>
          {bill.authorId.startsWith('bot_') && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-900/50 text-purple-400 border border-purple-700/50 shrink-0">BOT</span>
          )}
          {author?.role === 'opposition' && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-orange-900/50 text-orange-400 border border-orange-700/50 shrink-0">OPP</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button onClick={() => setShowStats(!showStats)}
            className="text-[9px] px-1.5 py-0.5 rounded text-game-muted hover:text-white hover:bg-white/5 transition-all">
            {showStats ? '▼ Stats' : '▶ Stats'}
          </button>
          <BillStatusBadge status={bill.status} />
        </div>
      </div>

      {/* Description + meta */}
      <div className="px-3 pb-2">
        {bill.description && <p className="text-[10px] text-game-muted mb-1">{bill.description}</p>}
        <div className="text-[10px] text-game-muted">
          by <span className="text-game-secondary">{authorName}</span>
          {bill.votesFor > 0 && <span className="ml-2 text-game-secondary">{bill.votesFor}–{bill.votesAgainst}</span>}
          {bill.status === 'pending' && <span className="text-blue-400 ml-2">🗳️ Ready for vote</span>}
          {(bill as { status: string }).status === 'filibustered' && bill.filibusterTurns && (
            <span className="text-orange-400 ml-2">⏱️ {bill.filibusterTurns} turns left</span>
          )}
        </div>

        {/* Stat preview (expandable) */}
        {showStats && <BillStatPreview bill={bill} />}

        {/* Party vote breakdown */}
        {bill.partyVotes && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(bill.partyVotes).map(([pid, votes]) => {
              const player = gameState.players.find(p => p.id === pid);
              const bot = gameState.botParties.find(b => b.id === pid);
              const name = player?.party.partyName ?? bot?.name ?? pid;
              const color = player ? PARTY_COLORS[player.party.partyColor] : bot?.color ?? '#666';
              const votedYes = votes.yes > votes.no;
              return (
                <span key={pid} className="text-[9px] px-1 py-0.5 rounded" style={{
                  backgroundColor: color + '15',
                  color: votedYes ? '#10B981' : '#EF4444',
                  border: `1px solid ${color}25`,
                }}>
                  {name}: {votes.yes}Y/{votes.no}N
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="flex flex-wrap gap-1 px-3 pb-3 pt-1 border-t border-white/[0.03]">
          {bill.status === 'pending' && (isMyBill || isRuling || isOpposition) && (
            <button onClick={() => startLiveVote(bill.id)}
              className="text-[10px] px-2.5 py-1 rounded-md bg-blue-600/80 text-white border border-blue-500/40 hover:bg-blue-500 font-medium transition-all">
              🗳️ Call Vote
            </button>
          )}
          {bill.status === 'voting' && (
            <button onClick={() => startLiveVote(bill.id)}
              className="text-[10px] px-2.5 py-1 rounded-md bg-blue-600/80 text-white border border-blue-500/40 hover:bg-blue-500 font-medium animate-pulse transition-all">
              📜 Open Vote
            </button>
          )}
          {(bill as { status: string }).status === 'filibustered' && isRuling && (
            <button onClick={() => forceBillVote(bill.id)}
              className="text-[10px] px-2 py-1 rounded-md bg-orange-600/80 text-white border border-orange-500/40 hover:bg-orange-500 font-medium transition-all">
              ⚡ Break Filibuster
            </button>
          )}
          {bill.status === 'pending' && pc >= 1 && (
            <>
              {!showLobby ? (
                <button onClick={() => setShowLobby(true)}
                  className="text-[10px] px-2 py-1 rounded-md bg-yellow-900/40 text-yellow-300 border border-yellow-700/40 hover:bg-yellow-800/40 transition-all">
                  🤝 Lobby
                </button>
              ) : (
                <div className="w-full mt-1 p-2 bg-white/[0.02] rounded-lg border border-white/[0.04] space-y-1">
                  <select value={lobbyTarget} onChange={(e) => setLobbyTarget(e.target.value)}
                    className="w-full text-[10px] bg-game-bg rounded-md px-2 py-1 text-white border border-game-border">
                    <option value="">Select party...</option>
                    {gameState.botParties.map(bp => (
                      <option key={bp.id} value={bp.id}>{bp.name} ({bp.seats} seats)</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={() => { if (lobbyTarget) { lobbyBill(bill.id, lobbyTarget, 1, 'support'); setShowLobby(false); } }}
                      disabled={!lobbyTarget}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/40 disabled:opacity-40">
                      👍 Support (1PC)
                    </button>
                    <button onClick={() => { if (lobbyTarget) { lobbyBill(bill.id, lobbyTarget, 1, 'oppose'); setShowLobby(false); } }}
                      disabled={!lobbyTarget}
                      className="text-[10px] px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-700/40 disabled:opacity-40">
                      👎 Oppose (1PC)
                    </button>
                    <button onClick={() => setShowLobby(false)} className="text-[10px] px-2 py-0.5 rounded bg-game-border text-game-muted">✕</button>
                  </div>
                </div>
              )}
            </>
          )}
          {bill.status === 'pending' && isRuling && pc >= 1 && (
            <button onClick={() => whipVotes(bill.id, 1)}
              className="text-[10px] px-2 py-1 rounded-md bg-purple-900/40 text-purple-300 border border-purple-700/40 hover:bg-purple-800/40 transition-all">
              🏛️ Whip (1PC)
            </button>
          )}
          {bill.status === 'pending' && pc >= 1 && (
            <>
              <button onClick={() => campaignForBill(bill.id, 1, 'support')}
                className="text-[10px] px-2 py-1 rounded-md bg-emerald-900/40 text-emerald-300 border border-emerald-700/40 hover:bg-emerald-800/40 transition-all">
                📢 For
              </button>
              <button onClick={() => campaignForBill(bill.id, 1, 'oppose')}
                className="text-[10px] px-2 py-1 rounded-md bg-red-900/40 text-red-300 border border-red-700/40 hover:bg-red-800/40 transition-all">
                📢 Against
              </button>
            </>
          )}
          {(bill.status === 'passed' || bill.status === 'pending') && isRuling && !isMyBill && pc >= 3 && (
            <button onClick={() => vetoBill(bill.id)}
              className="text-[10px] px-2 py-1 rounded-md bg-red-900/40 text-red-300 border border-red-700/40 hover:bg-red-800/40 transition-all">
              🚫 Veto (3PC)
            </button>
          )}
          {bill.status === 'vetoed' && !bill.vetoOverrideVotes && (
            <button onClick={() => overrideVeto(bill.id)}
              className="text-[10px] px-2 py-1 rounded-md bg-orange-900/40 text-orange-300 border border-orange-700/40 hover:bg-orange-800/40 transition-all">
              ⚡ Override (67/100)
            </button>
          )}
          {(bill.status === 'passed' || bill.status === 'pending') && !isMyBill && pc >= 2 && (
            <button onClick={() => challengeConstitutionality(bill.id)}
              className="text-[10px] px-2 py-1 rounded-md bg-purple-900/40 text-purple-300 border border-purple-700/40 hover:bg-purple-800/40 transition-all">
              ⚖️ Challenge (2PC)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Stat preview for propose tab — shows what a template bill will change */
function TemplateStatPreview({ template }: { template: BillTemplate }) {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  return (
    <div className="space-y-1.5 mt-2 pt-2 border-t border-white/[0.04]">
      {/* Policy changes */}
      <div className="text-[9px] text-game-muted font-bold uppercase tracking-wider">Policy Changes</div>
      {template.policyChanges.map(change => {
        const policy = POLICY_MAP.get(change.policyId);
        const current = gameState.policies[change.policyId] ?? 50;
        const diff = change.targetValue - current;
        return (
          <div key={change.policyId} className="flex items-center justify-between text-[10px]">
            <span className="text-game-secondary">{policy?.name ?? change.policyId}</span>
            <span className={diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-game-muted'}>
              {current} → {change.targetValue} ({diff > 0 ? '+' : ''}{diff})
            </span>
          </div>
        );
      })}
      {/* Full voter effects */}
      <div className="text-[9px] text-game-muted font-bold uppercase tracking-wider mt-1">Voter Impact</div>
      <div className="flex flex-wrap gap-1">
        {template.popularityEffects.map(eff => (
          <span key={eff.voterGroup} className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${
            eff.effect > 0
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
              : 'bg-red-500/10 text-red-400 border border-red-500/15'
          }`}>
            {eff.effect > 0 ? '▲' : '▼'}{Math.abs(eff.effect)} {eff.voterGroup}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProposeBillTab() {
  const { gameState, playerId } = useGameStore();
  const { proposeBillFromLibrary } = useGameActions();
  const { playSfx } = useAudio();
  const [selectedCategory, setSelectedCategory] = useState<string>('economy');
  const [expandedBill, setExpandedBill] = useState<string | null>(null);

  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const pc = myPlayer?.politicalCapital ?? 0;
  const isRuling = myPlayer?.role === 'ruling';
  const canPropose = (gameState.phase === 'ruling' && isRuling) ||
                     (gameState.phase === 'opposition' && !isRuling);

  const bills = BILL_LIBRARY.filter(b => b.category === selectedCategory);

  const activeBillTemplates = new Set(
    gameState.activeBills
      .filter(b => b.status === 'pending' || b.status === 'voting' || b.status === 'passed')
      .map(b => b.fromTemplate)
      .filter(Boolean)
  );

  return (
    <div className="space-y-3">
      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {BILL_CATEGORIES.map(cat => {
          const style = CATEGORY_STYLES[cat.id];
          const isSelected = selectedCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
              className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all ${
                isSelected
                  ? `${style?.bg} text-white border border-white/10`
                  : 'text-game-muted hover:text-white hover:bg-white/[0.03] border border-transparent'
              }`}>
              {cat.icon} {cat.name}
            </button>
          );
        })}
      </div>

      {/* Bill list — vertical */}
      <div className="space-y-2">
        {bills.map(template => {
          const isActive = activeBillTemplates.has(template.id);
          const cost = isRuling ? template.cost : template.cost + 1;
          const canAfford = pc >= cost;
          const rarity = getRarity(template.cost);
          const isExpanded = expandedBill === template.id;

          return (
            <div key={template.id}
              className={`glass-card overflow-hidden ${rarity.class} ${isActive ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedBill(isExpanded ? null : template.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-white">{template.name}</span>
                    <span className={`text-[9px] font-bold ${rarity.textClass}`}>{rarity.label}</span>
                  </div>
                  <p className="text-[10px] text-game-muted line-clamp-1">{template.description}</p>
                </div>
                {/* Effects preview */}
                <div className="flex flex-wrap gap-1 shrink-0 max-w-[200px]">
                  {template.popularityEffects.slice(0, 4).map(eff => (
                    <span key={eff.voterGroup} className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                      eff.effect > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {eff.effect > 0 ? '▲' : '▼'} {eff.voterGroup}
                    </span>
                  ))}
                </div>
                {/* Cost + propose */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-amber-400">⚡{cost}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); proposeBillFromLibrary(template.id); playSfx('propose'); }}
                    disabled={isActive || !canAfford || !canPropose}
                    className="text-[10px] px-3 py-1 rounded-md font-semibold transition-all
                      bg-blue-600/80 text-white border border-blue-500/30 hover:bg-blue-500
                      disabled:bg-game-border disabled:text-game-muted disabled:border-game-border"
                  >
                    {isActive ? '✓ Active' : !canPropose ? '⏳ Wait' : canAfford ? 'Propose' : `Need ${cost}`}
                  </button>
                </div>
              </div>
              {/* Expanded stats */}
              {isExpanded && !isActive && (
                <div className="px-3 pb-3 animate-fade-in">
                  <TemplateStatPreview template={template} />
                </div>
              )}
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
                   (gameState.phase === 'opposition' && myPlayer?.role === 'opposition') ||
                   gameState.phase === 'bill_voting';

  const activeBills = gameState.activeBills.filter(b =>
    b.status === 'pending' || b.status === 'voting' || b.status === 'passed' || (b as { status: string }).status === 'filibustered'
  );
  const historyBills = gameState.activeBills.filter(b =>
    b.status === 'failed' || b.status === 'vetoed' || b.status === 'unconstitutional'
  );

  const pendingCount = activeBills.filter(b => b.status === 'pending').length;
  const votingCount = activeBills.filter(b => b.status === 'voting').length;

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => setTab('active')}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${tab === 'active' ? 'bg-white/[0.06] text-white border border-white/10' : 'text-game-muted hover:text-white'}`}>
          📋 Bills {activeBills.length > 0 && <span className="text-game-accent ml-1">({activeBills.length})</span>}
        </button>
        <button onClick={() => setTab('propose')}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${tab === 'propose' ? 'bg-white/[0.06] text-white border border-white/10' : 'text-game-muted hover:text-white'}`}>
          ➕ Propose
        </button>
        <button onClick={() => setTab('history')}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${tab === 'history' ? 'bg-white/[0.06] text-white border border-white/10' : 'text-game-muted hover:text-white'}`}>
          📜 History {historyBills.length > 0 && `(${historyBills.length})`}
        </button>
        <div className="flex-1" />
        {pendingCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-900/40 text-amber-400 border border-amber-800/30 font-medium">
            {pendingCount} ready to vote
          </span>
        )}
        {votingCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-900/40 text-blue-400 border border-blue-800/30 font-medium animate-pulse">
            {votingCount} voting
          </span>
        )}
      </div>

      {/* Tab content — fills remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'propose' && <ProposeBillTab />}

        {tab === 'active' && (
          <div className="space-y-2">
            {/* Delayed policies */}
            {delayedPolicies.length > 0 && (
              <div className="space-y-1">
                {delayedPolicies.map((dp, i) => {
                  const policy = POLICY_MAP.get(dp.policyId);
                  return (
                    <div key={`delayed-${i}`} className="glass-card p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-300">
                          ⏳ {policy?.name ?? dp.policyId}: {dp.originalValue} → {dp.newValue}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-400 border border-amber-700/50">
                          {dp.turnsRemaining} turn{dp.turnsRemaining !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeBills.length === 0 && delayedPolicies.length === 0 && (
              <div className="text-center py-12 text-game-muted">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm">No active bills</p>
                <p className="text-xs mt-1">Switch to Propose to create one</p>
              </div>
            )}

            {/* Vertical bill list */}
            <div className="space-y-2">
              {activeBills.slice().reverse().map(bill => (
                <BillCard key={bill.id} bill={bill} showActions={isMyTurn} />
              ))}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {historyBills.length === 0 ? (
              <div className="text-center py-12 text-game-muted">
                <div className="text-3xl mb-2">📜</div>
                <p className="text-sm">No bill history yet</p>
              </div>
            ) : (
              historyBills.slice().reverse().map(bill => (
                <BillCard key={bill.id} bill={bill} showActions={false} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
