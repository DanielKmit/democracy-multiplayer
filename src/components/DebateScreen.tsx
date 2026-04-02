'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { PARTY_COLORS, DebateChoice } from '@/lib/engine/types';

const CHOICE_INFO: Record<DebateChoice, { icon: string; label: string; desc: string; beats: string; color: string }> = {
  attack:  { icon: '⚔️', label: 'Attack', desc: 'Challenge your opponent on this issue', beats: 'Beats Defend', color: 'text-red-400' },
  defend:  { icon: '🛡️', label: 'Defend', desc: 'Justify your record and policies', beats: 'Beats Pivot', color: 'text-blue-400' },
  pivot:   { icon: '🔄', label: 'Pivot', desc: 'Redirect to your strengths', beats: 'Beats Attack', color: 'text-amber-400' },
};

export function DebateScreen() {
  const { gameState, playerId } = useGameStore();
  const { submitDebateChoice, endTurnPhase } = useGameActions();
  const [choices, setChoices] = useState<Record<string, DebateChoice>>({});

  if (!gameState?.debate) return null;

  const debate = gameState.debate;
  const myPlayer = gameState.players.find(p => p.id === playerId);
  const opponent = gameState.players.find(p => p.id !== playerId);
  const hasSubmitted = !!debate.playerChoices[playerId ?? ''];
  const allTopicsChosen = debate.topics.every(t => choices[t.id]);

  const handleSubmit = () => {
    if (!allTopicsChosen) return;
    submitDebateChoice(choices);
  };

  return (
    <div className="min-h-screen bg-game-bg bg-dot-grid bg-gradient-mesh flex items-center justify-center p-4">
      <div className="max-w-2xl w-full animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-800/30 mb-4">
            <span className="text-3xl">📺</span>
          </div>
          <h1 className="text-3xl font-bold font-display mb-1">Pre-Election Debate</h1>
          <p className="text-game-secondary">
            {myPlayer?.party.partyName} vs {opponent?.party.partyName} — choose your strategy for each topic
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-game-muted">
            <span className="text-red-400">⚔️ Attack beats 🛡️ Defend</span>
            <span>•</span>
            <span className="text-blue-400">🛡️ Defend beats 🔄 Pivot</span>
            <span>•</span>
            <span className="text-amber-400">🔄 Pivot beats ⚔️ Attack</span>
          </div>
        </div>

        {debate.resolved ? (
          /* Results */
          <div className="space-y-4 animate-fade-in">
            <div className="glass-card p-6 text-center">
              {debate.winner ? (
                <>
                  <div className="text-5xl mb-3">🏆</div>
                  <h2 className="text-2xl font-bold font-display mb-2" style={{
                    color: PARTY_COLORS[gameState.players.find(p => p.id === debate.winner)?.party.partyColor ?? 'blue']
                  }}>
                    {gameState.players.find(p => p.id === debate.winner)?.party.partyName} wins the debate!
                  </h2>
                  <p className="text-game-secondary">
                    {debate.winner === playerId ? '+5 approval for you, -3 for opponent' : '-3 approval for you, +5 for opponent'}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">🤝</div>
                  <h2 className="text-2xl font-bold font-display mb-2">Draw!</h2>
                  <p className="text-game-secondary">Neither candidate won decisively — no approval change</p>
                </>
              )}
            </div>

            {/* Topic results */}
            <div className="space-y-2">
              {debate.topics.map(topic => {
                const p1 = gameState.players[0];
                const p2 = gameState.players[1];
                const c1 = debate.playerChoices[p1?.id ?? '']?.[topic.id];
                const c2 = debate.playerChoices[p2?.id ?? '']?.[topic.id];
                const beats: Record<string, string> = { attack: 'defend', defend: 'pivot', pivot: 'attack' };
                const p1Won = c1 && c2 && beats[c1] === c2;
                const p2Won = c1 && c2 && beats[c2] === c1;
                return (
                  <div key={topic.id} className="glass-card p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{topic.icon}</span>
                      <span className="text-sm font-medium text-white">{topic.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span style={{ color: PARTY_COLORS[p1?.party.partyColor ?? 'blue'] }}>
                        {c1 ? `${CHOICE_INFO[c1 as DebateChoice]?.icon ?? '?'} ${c1}` : '?'}
                      </span>
                      <span className="text-game-muted">vs</span>
                      <span style={{ color: PARTY_COLORS[p2?.party.partyColor ?? 'red'] }}>
                        {c2 ? `${CHOICE_INFO[c2 as DebateChoice]?.icon ?? '?'} ${c2}` : '?'}
                      </span>
                      <span className={`font-bold ${p1Won ? 'text-emerald-400' : p2Won ? 'text-red-400' : 'text-game-muted'}`}>
                        {p1Won ? `${p1?.party.partyName} ✓` : p2Won ? `${p2?.party.partyName} ✓` : 'Draw'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scores */}
            <div className="glass-card p-4 flex items-center justify-center gap-8">
              {gameState.players.map(p => (
                <div key={p.id} className="text-center">
                  <div className="text-3xl font-bold" style={{ color: PARTY_COLORS[p.party.partyColor] }}>
                    {debate.scores[p.id] ?? 0}
                  </div>
                  <div className="text-xs text-game-muted">{p.party.partyName}</div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button onClick={endTurnPhase}
                className="btn-primary px-8 py-3 rounded-xl font-bold text-sm">
                Proceed to Election →
              </button>
            </div>
          </div>
        ) : hasSubmitted ? (
          /* Waiting */
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-3 animate-pulse">⏳</div>
            <p className="text-game-secondary">Waiting for {opponent?.party.partyName} to submit their debate strategy...</p>
          </div>
        ) : (
          /* Choose strategies */
          <div className="space-y-4">
            {debate.topics.map((topic, i) => (
              <div key={topic.id} className="glass-card p-4 animate-fade-in" style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{topic.icon}</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{topic.name}</h3>
                    <p className="text-[10px] text-game-muted">Choose your debate strategy for this topic</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['attack', 'defend', 'pivot'] as DebateChoice[]).map(choice => {
                    const info = CHOICE_INFO[choice];
                    const isSelected = choices[topic.id] === choice;
                    return (
                      <button key={choice} onClick={() => setChoices(prev => ({ ...prev, [topic.id]: choice }))}
                        className={`p-3 rounded-xl text-center transition-all border ${
                          isSelected
                            ? `bg-white/[0.06] border-white/20 ${info.color}`
                            : 'border-game-border hover:border-white/10 text-game-secondary hover:text-white'
                        }`}>
                        <div className="text-xl mb-1">{info.icon}</div>
                        <div className="text-xs font-bold">{info.label}</div>
                        <div className="text-[9px] text-game-muted mt-0.5">{info.beats}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="text-center">
              <button onClick={handleSubmit} disabled={!allTopicsChosen}
                className="btn-primary px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                {allTopicsChosen ? 'Submit Strategy' : `Choose all ${debate.topics.length} topics`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
