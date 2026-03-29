'use client';

import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import { VictoryType, VICTORY_CONDITIONS } from '@/lib/engine/victoryConditions';

export function GameSettingsPanel() {
  const { gameState, playerId } = useGameStore();
  const { updateGameSettings } = useGameActions();

  if (!gameState) return null;

  // Only host can change settings
  const isHost = playerId === 'host';
  const settings = gameState.gameSettings;
  if (!settings) return null;

  const victoryOptions: { type: VictoryType; name: string; icon: string; desc: string }[] = [
    { type: 'electoral', name: 'Electoral Dominance', icon: '🗳️', desc: 'Win 3 elections' },
    { type: 'economic', name: 'Economic Miracle', icon: '📈', desc: 'GDP > 5% for 5 turns' },
    { type: 'approval', name: "People's Champion", icon: '❤️', desc: 'Approval > 70% for 8 turns' },
    { type: 'parliamentary', name: 'Supermajority', icon: '🏛️', desc: '75+ seats for 2 elections' },
  ];

  const toggles: { key: keyof typeof settings; label: string; icon: string }[] = [
    { key: 'scandalsEnabled', label: 'Scandal System', icon: '🔥' },
    { key: 'reputationEnabled', label: 'Party Reputation', icon: '📊' },
    { key: 'internationalRelationsEnabled', label: 'International Relations', icon: '🌐' },
    { key: 'policySynergiesEnabled', label: 'Policy Synergies', icon: '⚡' },
    { key: 'coalitionMechanicsEnabled', label: 'Enhanced Coalitions', icon: '🤝' },
  ];

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-bold text-game-secondary uppercase tracking-wider mb-3">
        ⚙️ Game Features
      </h3>

      {/* Victory Condition Selector */}
      <div className="mb-4">
        <label className="text-xs text-game-muted block mb-1">Victory Condition</label>
        <div className="grid grid-cols-2 gap-2">
          {victoryOptions.map(opt => (
            <button
              key={opt.type}
              onClick={() => isHost && updateGameSettings({ victoryCondition: opt.type })}
              disabled={!isHost}
              className={`p-2 rounded text-left text-[11px] transition-all border ${
                settings.victoryCondition === opt.type
                  ? 'border-game-accent bg-game-accent/10 text-white'
                  : 'border-game-border bg-game-bg/50 text-game-muted hover:border-game-secondary'
              } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="font-bold">{opt.icon} {opt.name}</div>
              <div className="text-[9px] text-game-muted">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-2">
        {toggles.map(toggle => (
          <div key={toggle.key} className="flex items-center justify-between">
            <span className="text-xs text-game-secondary">{toggle.icon} {toggle.label}</span>
            <button
              onClick={() => isHost && updateGameSettings({ [toggle.key]: !settings[toggle.key] })}
              disabled={!isHost}
              className={`w-10 h-5 rounded-full transition-all relative ${
                settings[toggle.key] ? 'bg-emerald-600' : 'bg-game-border'
              } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                settings[toggle.key] ? 'left-5.5' : 'left-0.5'
              }`} style={{ left: settings[toggle.key] ? '22px' : '2px' }} />
            </button>
          </div>
        ))}
      </div>

      {!isHost && (
        <p className="text-[9px] text-game-muted mt-2">Only the host can change settings</p>
      )}
    </div>
  );
}
