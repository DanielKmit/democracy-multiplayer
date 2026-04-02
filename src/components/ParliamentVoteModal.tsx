'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { PARTY_COLORS } from '@/lib/engine/types';

export function ParliamentVoteModal() {
  const { gameState, playerId } = useGameStore();
  const { lobbyLiveVote, whipLiveVote, campaignLiveVote, setPlayerVote, readyLiveVote, finalizeLiveVote, dismissLiveVote } = useGameActions();
  const [lobbyTarget, setLobbyTarget] = useState('');
  const [lobbyDir, setLobbyDir] = useState<'support' | 'oppose'>('support');

  if (!gameState?.liveVote) return null;

  const lv = gameState.liveVote;
  const myPlayer = gameState.players.find(p => p.id === playerId);
  const pc = myPlayer?.politicalCapital ?? 0;
  const isRuling = myPlayer?.role === 'ruling';
  const isFinalized = lv.finalized;
  const myVote = playerId ? lv.playerVotes[playerId] ?? null : null;
  const mySeats = gameState.parliament.seatsByParty[playerId ?? ''] ?? 0;
  const coalitionIds = new Set((gameState.coalitionPartners ?? []).map(cp => cp.botPartyId));

  // Calculate projected vote from intentions + explicit player votes
  let projectedYes = 0;
  let projectedNo = 0;
  const partyProjections: { id: string; name: string; color: string; seats: number; intention: number; projYes: number; projNo: number; isMe: boolean; isCoalition: boolean; explicitVote?: 'yes' | 'no' | null }[] = [];

  for (const bot of gameState.botParties) {
    const intention = lv.partyIntentions[bot.id] ?? 0;
    const yesProb = Math.max(0.02, Math.min(0.98, (intention + 1) / 2));
    const seats = gameState.parliament.seatsByParty[bot.id] ?? 0;
    const estYes = Math.round(seats * yesProb);
    const estNo = seats - estYes;
    projectedYes += estYes;
    projectedNo += estNo;
    partyProjections.push({
      id: bot.id,
      name: bot.name,
      color: bot.color,
      seats,
      intention,
      projYes: estYes,
      projNo: estNo,
      isMe: false,
      isCoalition: coalitionIds.has(bot.id),
    });
  }

  // Add human player parties — use explicit vote if set
  for (const p of gameState.players) {
    const seats = gameState.parliament.seatsByParty[p.id] ?? 0;
    const explicitVote = lv.playerVotes[p.id] ?? null;
    let estYes: number;
    let estNo: number;

    if (explicitVote === 'yes') {
      estYes = seats;
      estNo = 0;
    } else if (explicitVote === 'no') {
      estYes = 0;
      estNo = seats;
    } else {
      // No vote yet — abstain (0/0) in projection
      estYes = 0;
      estNo = 0;
    }

    projectedYes += estYes;
    projectedNo += estNo;
    const intention = lv.partyIntentions[p.id] ?? 0;
    partyProjections.push({
      id: p.id,
      name: p.party.partyName,
      color: PARTY_COLORS[p.party.partyColor],
      seats,
      intention,
      projYes: estYes,
      projNo: estNo,
      isMe: p.id === playerId,
      isCoalition: false,
      explicitVote,
    });
  }

  // Sort by seats descending
  partyProjections.sort((a, b) => b.seats - a.seats);

  const projectedPass = projectedYes >= 51;
  const totalSpent = lv.lobbySpent[playerId ?? ''] ?? 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-game-card border border-game-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-game-border bg-gradient-to-r from-blue-900/30 to-purple-900/30">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold font-display flex items-center gap-2">
              🗳️ Parliament Vote
            </h2>
            {!isFinalized && (
              <span className="text-xs text-yellow-400 animate-pulse">LIVE</span>
            )}
          </div>
          <h3 className="text-base font-semibold text-white">{lv.bill.title}</h3>
          {lv.bill.description && (
            <p className="text-xs text-game-secondary mt-1">{lv.bill.description}</p>
          )}
        </div>

        {/* Vote Tally Bar */}
        <div className="p-4 border-b border-game-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-emerald-400">
              YES: {isFinalized ? lv.result?.votesFor : projectedYes}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              (isFinalized ? lv.result?.passed : projectedPass)
                ? 'bg-emerald-900/50 text-emerald-400'
                : 'bg-red-900/50 text-red-400'
            }`}>
              {(isFinalized ? lv.result?.passed : projectedPass) ? 'PROJECTED: PASS' : 'PROJECTED: FAIL'}
            </span>
            <span className="text-sm font-bold text-red-400">
              NO: {isFinalized ? lv.result?.votesAgainst : projectedNo}
            </span>
          </div>
          <div className="h-4 bg-game-border rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(((isFinalized ? lv.result?.votesFor : projectedYes) ?? 0) / 100) * 100}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: `${(((isFinalized ? lv.result?.votesAgainst : projectedNo) ?? 0) / 100) * 100}%` }}
            />
          </div>
          <div className="flex justify-center mt-1">
            <span className="text-[10px] text-game-muted">Need 51 to pass</span>
          </div>
        </div>

        {/* YOUR PARTY'S VOTE */}
        {!isFinalized && myPlayer && (
          <div className="p-4 border-b border-game-border bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
            <h4 className="text-xs font-bold text-white uppercase mb-2 flex items-center gap-1.5">
              🗳️ Your Party&apos;s Vote
            </h4>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PARTY_COLORS[myPlayer.party.partyColor] }} />
                <span className="text-sm font-medium text-white">{myPlayer.party.partyName}</span>
                <span className="text-xs text-game-secondary">({mySeats} seats)</span>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                myVote === 'yes' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                  : myVote === 'no' ? 'bg-red-900/50 text-red-400 border border-red-700/50'
                  : 'bg-game-border/50 text-game-secondary border border-game-border/50'
              }`}>
                {myVote === 'yes' ? '✅ Voting YES' : myVote === 'no' ? '❌ Voting NO' : '⏸️ Abstaining'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPlayerVote(myVote === 'yes' ? null : 'yes')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  myVote === 'yes'
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg shadow-emerald-900/50'
                    : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-800/50'
                }`}
              >
                👍 Vote YES
              </button>
              <button
                onClick={() => setPlayerVote(myVote === 'no' ? null : 'no')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  myVote === 'no'
                    ? 'bg-red-600 text-white ring-2 ring-red-400 shadow-lg shadow-red-900/50'
                    : 'bg-red-900/40 text-red-300 border border-red-700/50 hover:bg-red-800/50'
                }`}
              >
                👎 Vote NO
              </button>
            </div>
            {myVote === null && (
              <p className="text-[10px] text-game-muted mt-1.5 text-center">
                Your {mySeats} seats will abstain if you don&apos;t vote
              </p>
            )}
          </div>
        )}

        {/* Party Breakdown */}
        <div className="p-4 border-b border-game-border">
          <h4 className="text-xs font-bold text-game-secondary uppercase mb-2">Party Positions</h4>
          <div className="space-y-1.5">
            {partyProjections.map(pp => {
              const leanLabel = pp.intention > 0.3 ? 'Leaning YES' : pp.intention < -0.3 ? 'Leaning NO' : 'Undecided';
              const leanColor = pp.intention > 0.3 ? 'text-emerald-400' : pp.intention < -0.3 ? 'text-red-400' : 'text-yellow-400';

              // For finalized, show actual votes
              const finalVotes = isFinalized ? lv.result?.partyVotes[pp.id] : null;

              // Human player vote labels
              const humanVoteLabel = pp.explicitVote === 'yes' ? 'Voting YES'
                : pp.explicitVote === 'no' ? 'Voting NO'
                : pp.isMe ? 'Abstaining' : null;
              const humanVoteColor = pp.explicitVote === 'yes' ? 'text-emerald-400'
                : pp.explicitVote === 'no' ? 'text-red-400'
                : 'text-game-muted';

              return (
                <div key={pp.id} className={`flex items-center gap-2 p-2 rounded ${pp.isMe ? 'bg-indigo-900/30 ring-1 ring-indigo-700/50' : 'bg-game-card/50'}`}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pp.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white truncate">
                        {pp.name}
                        {pp.isMe && <span className="text-[9px] text-indigo-400 ml-1">(You)</span>}
                        {!pp.isMe && pp.explicitVote !== undefined && <span className="text-[9px] text-purple-400 ml-1">(Player)</span>}
                        {pp.isCoalition && <span className="text-[9px] text-cyan-400 ml-1">🤝 Coalition</span>}
                      </span>
                      <span className="text-[10px] text-game-muted">{pp.seats} seats</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      {isFinalized && finalVotes ? (
                        <span className="text-[10px]">
                          <span className="text-emerald-400">{finalVotes.yes}Y</span>
                          {' / '}
                          <span className="text-red-400">{finalVotes.no}N</span>
                        </span>
                      ) : humanVoteLabel ? (
                        <span className={`text-[10px] font-medium ${humanVoteColor}`}>{humanVoteLabel}</span>
                      ) : (
                        <>
                          <span className={`text-[10px] ${leanColor}`}>{leanLabel}</span>
                          <div className="w-20 h-1.5 bg-game-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${((pp.intention + 1) / 2) * 100}%`,
                                backgroundColor: pp.intention > 0 ? '#10B981' : '#EF4444',
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Panel — only if not finalized */}
        {!isFinalized && (
          <div className="p-4 border-b border-game-border space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-game-secondary uppercase">Influence the Vote</h4>
              <span className="text-xs text-yellow-400">⚡ {pc} PC available (spent {totalSpent})</span>
            </div>

            {/* Lobby a party */}
            <div className="p-3 bg-game-card/50 rounded-lg space-y-2">
              <label className="text-[10px] text-game-muted uppercase font-bold">Lobby a Party</label>
              <div className="flex gap-2">
                <select
                  value={lobbyTarget}
                  onChange={(e) => setLobbyTarget(e.target.value)}
                  className="flex-1 text-xs bg-game-border rounded px-2 py-1.5 text-white border border-game-border"
                >
                  <option value="">Select party...</option>
                  {gameState.botParties.map(bp => (
                    <option key={bp.id} value={bp.id}>
                      {bp.name} ({gameState.parliament.seatsByParty[bp.id] ?? 0} seats)
                    </option>
                  ))}
                </select>
                <select
                  value={lobbyDir}
                  onChange={(e) => setLobbyDir(e.target.value as 'support' | 'oppose')}
                  className="text-xs bg-game-border rounded px-2 py-1.5 text-white border border-game-border w-24"
                >
                  <option value="support">👍 For</option>
                  <option value="oppose">👎 Against</option>
                </select>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map(cost => (
                  <button
                    key={cost}
                    onClick={() => lobbyTarget && lobbyLiveVote(lobbyTarget, cost, lobbyDir)}
                    disabled={!lobbyTarget || pc < cost}
                    className="flex-1 text-xs py-1.5 rounded font-medium transition-all
                      bg-blue-900/50 text-blue-300 border border-blue-700/50
                      hover:bg-blue-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {cost} PC
                  </button>
                ))}
              </div>
            </div>

            {/* Whip Coalition (ruling only) */}
            {isRuling && gameState.coalitionPartners.length > 0 && (
              <div className="p-3 bg-purple-900/20 rounded-lg space-y-2">
                <label className="text-[10px] text-purple-400 uppercase font-bold">Whip Coalition Partners</label>
                <div className="flex gap-1">
                  {[1, 2, 3].map(cost => (
                    <button
                      key={cost}
                      onClick={() => whipLiveVote(cost)}
                      disabled={pc < cost}
                      className="flex-1 text-xs py-1.5 rounded font-medium transition-all
                        bg-purple-900/50 text-purple-300 border border-purple-700/50
                        hover:bg-purple-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      🏛️ Whip ({cost} PC)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Public Campaign */}
            <div className="p-3 bg-game-card/50 rounded-lg space-y-2">
              <label className="text-[10px] text-game-muted uppercase font-bold">Public Campaign (shifts all parties)</label>
              <div className="flex gap-1">
                <button
                  onClick={() => campaignLiveVote(1, 'support')}
                  disabled={pc < 1}
                  className="flex-1 text-xs py-1.5 rounded font-medium transition-all
                    bg-emerald-900/50 text-emerald-300 border border-emerald-700/50
                    hover:bg-emerald-800/50 disabled:opacity-40"
                >
                  📢 Campaign For (1 PC)
                </button>
                <button
                  onClick={() => campaignLiveVote(1, 'oppose')}
                  disabled={pc < 1}
                  className="flex-1 text-xs py-1.5 rounded font-medium transition-all
                    bg-red-900/50 text-red-300 border border-red-700/50
                    hover:bg-red-800/50 disabled:opacity-40"
                >
                  📢 Campaign Against (1 PC)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer — Ready / Finalize / Results */}
        <div className="p-4 space-y-2">
          {isFinalized ? (
            <>
              <div className={`text-center py-3 rounded-lg font-bold text-lg ${
                lv.result?.passed
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50'
                  : 'bg-red-900/30 text-red-400 border border-red-700/50'
              }`}>
                {lv.result?.passed ? '✅ BILL PASSED' : '❌ BILL FAILED'}
                <span className="text-sm font-normal ml-2">
                  ({lv.result?.votesFor} — {lv.result?.votesAgainst})
                </span>
              </div>
              <button
                onClick={dismissLiveVote}
                className="w-full py-2.5 bg-game-border hover:bg-game-muted/30 rounded-lg text-sm font-medium transition-all"
              >
                Close
              </button>
            </>
          ) : (() => {
            const iAmReady = lv.readyPlayers.includes(playerId ?? '');
            const isAI = gameState.isAIGame;
            const allReady = isAI
              ? iAmReady
              : gameState.players.every(p => lv.readyPlayers.includes(p.id));
            const readyCount = lv.readyPlayers.length;
            const totalPlayers = gameState.players.length;

            return (
              <>
                {/* Ready status indicators */}
                {!isAI && totalPlayers > 1 && (
                  <div className="flex items-center justify-center gap-3 mb-2">
                    {gameState.players.map(p => {
                      const isReady = lv.readyPlayers.includes(p.id);
                      return (
                        <div key={p.id} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                          isReady
                            ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                            : 'bg-game-card/50 text-game-muted border border-game-border'
                        }`}>
                          <span>{isReady ? '✅' : '⏳'}</span>
                          <span className="font-medium">{p.party.partyName}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {allReady ? (
                  <button
                    onClick={finalizeLiveVote}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold transition-all animate-pulse"
                  >
                    🗳️ All Ready — Finalize Vote Now
                  </button>
                ) : iAmReady ? (
                  <button
                    disabled
                    className="w-full py-3 bg-game-border rounded-lg text-sm font-medium text-game-secondary cursor-not-allowed"
                  >
                    ⏳ Waiting for {isAI ? 'AI' : 'opponent'} to be ready... ({readyCount}/{totalPlayers})
                  </button>
                ) : (
                  <button
                    onClick={readyLiveVote}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-all"
                  >
                    ✋ I&apos;m Ready — Lock In Vote
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
