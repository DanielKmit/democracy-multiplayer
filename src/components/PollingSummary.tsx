'use client';

import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { VOTER_GROUPS } from '@/lib/engine/voters';
import { REGIONS } from '@/lib/engine/regions';
import { PARTY_COLORS } from '@/lib/engine/types';
import { getSituationById } from '@/lib/engine/situations';
import { ParliamentHemicycle } from './ParliamentHemicycle';
import { useState } from 'react';

type PollTab = 'national' | 'voters' | 'regions';

export function PollingSummary() {
  const { gameState, playerId } = useGameStore();
  const { endTurnPhase } = useGameActions();
  const [tab, setTab] = useState<PollTab>('national');
  if (!gameState) return null;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const opponent = gameState.players.find(p => p.id !== playerId);

  // Build sorted party list
  const allParties: { id: string; name: string; color: string; voteShare: number; isMe: boolean; role?: string }[] = [];
  for (const player of gameState.players) {
    allParties.push({
      id: player.id, name: player.party.partyName, color: PARTY_COLORS[player.party.partyColor],
      voteShare: gameState.voteShares?.[player.id] ?? 0, isMe: player.id === playerId, role: player.role,
    });
  }
  for (const bot of gameState.botParties) {
    allParties.push({
      id: bot.id, name: bot.name, color: bot.color,
      voteShare: gameState.voteShares?.[bot.id] ?? 0, isMe: false,
    });
  }
  allParties.sort((a, b) => b.voteShare - a.voteShare);

  // Voter memory comparison
  const myPrevApproval = myPlayer ? (gameState.voterMemory?.[myPlayer.id] ?? null) : null;
  const myApproval = myPlayer ? (gameState.approvalRating?.[myPlayer.id] ?? 50) : 50;
  const approvalDelta = myPrevApproval !== null ? myApproval - myPrevApproval : null;

  // Flip-flop
  const myFlipFlop = myPlayer ? (gameState.flipFlopPenalty?.[myPlayer.id] ?? 0) : 0;

  const sim = gameState.simulation;

  const tabs: { id: PollTab; label: string }[] = [
    { id: 'national', label: '📊 National' },
    { id: 'voters', label: '👥 Voters' },
    { id: 'regions', label: '🗺️ Regions' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="max-w-3xl w-full mx-4 glass-card rounded-2xl border border-game-border overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-game-border bg-gradient-to-r from-game-card/80 to-transparent shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold font-display">📊 Polling Results</h2>
              <p className="text-xs text-game-muted mt-0.5">Turn {gameState.turn} — {gameState.isPreElection ? 'Campaign Phase' : 'Parliamentary Term'}</p>
            </div>
            <div className="text-right">
              {approvalDelta !== null && (
                <div className={`text-sm font-bold ${approvalDelta > 0 ? 'text-emerald-400' : approvalDelta < 0 ? 'text-red-400' : 'text-game-muted'}`}>
                  {approvalDelta > 0 ? '↑' : approvalDelta < 0 ? '↓' : '→'} {approvalDelta > 0 ? '+' : ''}{approvalDelta.toFixed(1)}%
                </div>
              )}
              <div className="text-[10px] text-game-muted">vs last turn</div>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === t.id ? 'bg-white/[0.06] text-white border border-white/10' : 'text-game-muted hover:text-white'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'national' && (
            <>
              {/* Vote share bars */}
              <div className="space-y-2.5">
                {allParties.map((party, i) => (
                  <div key={party.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: party.color }} />
                        <span style={{ color: party.color }} className="font-medium">
                          {party.name}
                          {party.isMe && <span className="text-game-accent text-[10px] ml-1 font-bold">YOU</span>}
                          {party.role === 'ruling' && <span className="text-game-muted text-[10px] ml-1">Gov</span>}
                        </span>
                      </span>
                      <span className="text-white font-bold">{party.voteShare.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2.5 progress-bar-track">
                      <div className="h-full progress-bar-fill transition-all duration-1000"
                        style={{ width: `${party.voteShare}%`, backgroundColor: party.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Turn summary — what changed */}
              <div className="glass-card p-3 border-game-accent/10 bg-game-accent/[0.03]">
                <div className="text-[10px] text-game-accent font-bold uppercase tracking-wider mb-2">📋 This Turn</div>
                <div className="space-y-1.5 text-xs">
                  {/* Delayed policies that took effect */}
                  {gameState.delayedPolicies.filter(dp => dp.turnsRemaining <= 1).length > 0 && (
                    <div className="text-emerald-400">
                      ✅ {gameState.delayedPolicies.filter(dp => dp.turnsRemaining <= 1).length} policy change{gameState.delayedPolicies.filter(dp => dp.turnsRemaining <= 1).length !== 1 ? 's' : ''} taking effect
                    </div>
                  )}
                  {/* Budget status */}
                  <div className={gameState.budget.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    💰 Budget: {gameState.budget.balance >= 0 ? 'Surplus' : 'Deficit'} of {Math.abs(gameState.budget.balance).toFixed(1)}B
                  </div>
                  {/* Reputation */}
                  {myPlayer && gameState.reputation && (
                    <div className={`${(gameState.reputation.scores[myPlayer.id] ?? 60) > 55 ? 'text-game-secondary' : 'text-amber-400'}`}>
                      ⭐ Reputation: {gameState.reputation.scores[myPlayer.id] ?? 60}/100
                      {(gameState.reputation.promisesBroken[myPlayer.id] ?? 0) > 0 && (
                        <span className="text-red-400 ml-1">({gameState.reputation.promisesBroken[myPlayer.id]} broken promises)</span>
                      )}
                    </div>
                  )}
                  {/* Active situations count */}
                  {gameState.activeSituations.length > 0 && (
                    <div className="text-orange-400">
                      ⚠ {gameState.activeSituations.length} active {gameState.activeSituations.length === 1 ? 'crisis' : 'crises'}
                    </div>
                  )}
                  {/* Pending bills */}
                  {gameState.activeBills.filter(b => b.status === 'pending').length > 0 && (
                    <div className="text-blue-400">
                      📋 {gameState.activeBills.filter(b => b.status === 'pending').length} bill{gameState.activeBills.filter(b => b.status === 'pending').length !== 1 ? 's' : ''} awaiting vote
                    </div>
                  )}
                </div>
              </div>

              {/* Key stats grid */}
              <div className="grid grid-cols-5 gap-1.5">
                <StatCard label="GDP" value={`${sim.gdpGrowth > 0 ? '+' : ''}${sim.gdpGrowth.toFixed(1)}%`} good={sim.gdpGrowth > 0} />
                <StatCard label="Jobs" value={`${(100 - sim.unemployment).toFixed(0)}%`} good={sim.unemployment < 8} />
                <StatCard label="Crime" value={sim.crime.toFixed(0)} good={sim.crime < 40} />
                <StatCard label="Health" value={sim.healthIndex.toFixed(0)} good={sim.healthIndex > 55} />
                <StatCard label="Budget" value={`${gameState.budget.balance >= 0 ? '+' : ''}${gameState.budget.balance.toFixed(0)}B`} good={gameState.budget.balance >= 0} />
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                <StatCard label="Pollution" value={sim.pollution.toFixed(0)} good={sim.pollution < 45} />
                <StatCard label="Education" value={sim.educationIndex.toFixed(0)} good={sim.educationIndex > 55} />
                <StatCard label="Freedom" value={sim.freedomIndex.toFixed(0)} good={sim.freedomIndex > 55} />
                <StatCard label="Equality" value={sim.equality.toFixed(0)} good={sim.equality > 50} />
                <StatCard label="Debt" value={`${gameState.budget.debtToGdp.toFixed(0)}%`} good={gameState.budget.debtToGdp < 60} />
              </div>

              {/* Warnings */}
              {myFlipFlop > 0 && (
                <div className="glass-card p-2 border-amber-800/20 bg-amber-950/10 text-[11px] text-amber-400">
                  ⚠ Policy flip-flop credibility penalty: -{Math.min(15, myFlipFlop * 0.5).toFixed(0)} approval
                </div>
              )}

              {/* Situations */}
              {gameState.activeSituations.length > 0 && (
                <div className="glass-card p-3">
                  <div className="text-[10px] text-game-muted uppercase tracking-wider font-bold mb-2">Active Crises</div>
                  <div className="flex flex-wrap gap-1.5">
                    {gameState.activeSituations.map(sit => {
                      const def = getSituationById(sit.id);
                      return (
                        <span key={sit.id} className="text-[10px] px-2 py-1 rounded-lg glass-card text-orange-400 border-orange-800/20">
                          {def?.icon ?? '⚠'} {def?.name ?? sit.id.replace(/_/g, ' ')} ({sit.turnsActive}t)
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Parliament */}
              <div className="glass-card p-3">
                <div className="text-[10px] text-game-muted uppercase tracking-wider font-bold mb-2">Parliament</div>
                <ParliamentHemicycle compact />
              </div>
            </>
          )}

          {tab === 'voters' && myPlayer && (
            <div className="space-y-2">
              <div className="text-[10px] text-game-muted uppercase tracking-wider font-bold">Support by Voter Group</div>
              {VOTER_GROUPS.map(group => {
                const mySat = gameState.voterSatisfaction[myPlayer.id]?.[group.id] ?? 50;
                const oppSat = opponent ? (gameState.voterSatisfaction[opponent.id]?.[group.id] ?? 50) : 50;
                const satColor = mySat > 60 ? '#10B981' : mySat > 40 ? '#F59E0B' : '#EF4444';
                const cynicism = gameState.voterCynicism?.[group.id] ?? 0;
                return (
                  <div key={group.id} className="glass-card p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-sm font-medium text-white">{group.name}</span>
                        <span className="text-[10px] text-game-muted ml-2">{(group.populationShare * 100).toFixed(0)}% pop.</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold" style={{ color: satColor }}>{mySat.toFixed(0)}%</span>
                        {opponent && (
                          <span className="text-xs text-game-muted">vs <span style={{ color: PARTY_COLORS[opponent.party.partyColor] }}>{oppSat.toFixed(0)}%</span></span>
                        )}
                      </div>
                    </div>
                    {/* Dual bar: your support vs opponent */}
                    <div className="flex h-2 rounded-full overflow-hidden bg-game-border/50 mb-1">
                      <div className="h-full transition-all duration-700" style={{ width: `${mySat}%`, backgroundColor: PARTY_COLORS[myPlayer.party.partyColor] }} />
                    </div>
                    {opponent && (
                      <div className="flex h-1 rounded-full overflow-hidden bg-game-border/30">
                        <div className="h-full transition-all duration-700 opacity-50" style={{ width: `${oppSat}%`, backgroundColor: PARTY_COLORS[opponent.party.partyColor] }} />
                      </div>
                    )}
                    {/* Cynicism */}
                    {cynicism > 10 && (
                      <div className="text-[9px] text-amber-400/70 mt-1">😤 Cynicism: {cynicism.toFixed(0)} — {cynicism > 50 ? 'many voters staying home' : 'some voter apathy'}</div>
                    )}
                    {/* Top concerns */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(group.concerns).slice(0, 3).map(([key, weight]) => {
                        const val = gameState.simulation[key as keyof typeof gameState.simulation] as number;
                        const isGood = (weight as number) > 0 ? val > 50 : val < 50;
                        return (
                          <span key={key} className={`text-[9px] px-1.5 py-0.5 rounded ${isGood ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: {typeof val === 'number' ? val.toFixed(0) : val}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'regions' && (
            <div className="space-y-2">
              <div className="text-[10px] text-game-muted uppercase tracking-wider font-bold">Regional Support</div>
              {REGIONS.map(region => {
                const mySat = myPlayer ? (gameState.regionalSatisfaction[region.id]?.[myPlayer.id] ?? 50) : 50;
                const oppSat = opponent ? (gameState.regionalSatisfaction[region.id]?.[opponent.id] ?? 50) : 50;
                const leading = mySat > oppSat;
                const satColor = mySat > 55 ? '#10B981' : mySat > 40 ? '#F59E0B' : '#EF4444';
                return (
                  <div key={region.id} className="glass-card p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-sm font-medium text-white">{region.name}</span>
                        <span className="text-[10px] text-game-muted ml-2">{region.seats} seats</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${leading ? 'text-emerald-400 bg-emerald-900/20' : 'text-red-400 bg-red-900/20'}`}>
                          {leading ? '▲ Leading' : '▼ Trailing'}
                        </span>
                        <span className="text-xs font-bold" style={{ color: satColor }}>{mySat.toFixed(0)}%</span>
                      </div>
                    </div>
                    {/* Dual progress bars */}
                    {myPlayer && (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-game-muted w-12 truncate">{myPlayer.party.partyName}</span>
                          <div className="flex-1 h-1.5 progress-bar-track">
                            <div className="h-full progress-bar-fill" style={{ width: `${mySat}%`, backgroundColor: PARTY_COLORS[myPlayer.party.partyColor] }} />
                          </div>
                        </div>
                        {opponent && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-game-muted w-12 truncate">{opponent.party.partyName}</span>
                            <div className="flex-1 h-1.5 progress-bar-track">
                              <div className="h-full progress-bar-fill" style={{ width: `${oppSat}%`, backgroundColor: PARTY_COLORS[opponent.party.partyColor] }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Key groups */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {region.dominantGroups.map(g => (
                        <span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-game-border/30 text-game-muted capitalize">{g}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-game-border p-4 shrink-0 flex items-center justify-between bg-game-card/50">
          <div className="text-sm text-game-secondary">
            {gameState.turnsUntilElection > 0
              ? `🗳️ Election in ${gameState.turnsUntilElection} turn${gameState.turnsUntilElection !== 1 ? 's' : ''}`
              : '🗳️ Election is next!'}
          </div>
          <button onClick={endTurnPhase}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm ${
              gameState.turnsUntilElection <= 0 ? 'btn-primary animate-pulse' : 'btn-primary'
            }`}>
            {gameState.turnsUntilElection <= 0 ? 'Proceed to Election →' : 'Next Turn →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="stat-card !py-2">
      <div className={`text-xs font-bold ${good ? 'text-emerald-400' : 'text-red-400'}`}>{value}</div>
      <div className="text-[9px] text-game-muted">{label}</div>
    </div>
  );
}
