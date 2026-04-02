'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useGameActions } from '@/lib/useGameActions';
import {
  PartyColor,
  PartyLogo,
  ManifestoOption,
  PartyConfig,
  PARTY_COLORS,
  MANIFESTO_OPTIONS,
} from '@/lib/engine/types';
import { PartyLogoIcon } from './icons/PartyLogos';

const COLOR_OPTIONS: PartyColor[] = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'cyan', 'pink'];
const LOGO_OPTIONS: PartyLogo[] = ['eagle', 'rose', 'star', 'tree', 'fist', 'dove', 'shield', 'flame', 'scales', 'gear', 'wheat', 'sun'];

const getAxisLabel = (value: number, type: 'econ' | 'social') => {
  if (type === 'econ') {
    if (value < 25) return 'Far Left';
    if (value < 40) return 'Left';
    if (value < 60) return 'Center';
    if (value < 75) return 'Center-Right';
    return 'Right';
  }
  if (value < 25) return 'Authoritarian';
  if (value < 40) return 'Conservative';
  if (value < 60) return 'Moderate';
  if (value < 75) return 'Progressive';
  return 'Libertarian';
};

export function PartyCreator() {
  const { playerId } = useGameStore();
  const { submitPartyConfig } = useGameActions();

  const [partyName, setPartyName] = useState('');
  const [partyColor, setPartyColor] = useState<PartyColor>('blue');
  const [leaderName, setLeaderName] = useState('');
  const [economicAxis, setEconomicAxis] = useState(50);
  const [socialAxis, setSocialAxis] = useState(50);
  const [logo, setLogo] = useState<PartyLogo>('star');
  const [manifesto, setManifesto] = useState<ManifestoOption[]>([]);

  const toggleManifesto = (option: ManifestoOption) => {
    if (manifesto.includes(option)) {
      setManifesto(manifesto.filter(m => m !== option));
    } else if (manifesto.length < 3) {
      setManifesto([...manifesto, option]);
    }
  };

  const canSubmit = partyName.trim() && leaderName.trim() && manifesto.length === 3;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const config: PartyConfig = {
      partyName: partyName.trim(),
      partyColor,
      leaderName: leaderName.trim(),
      economicAxis,
      socialAxis,
      logo,
      manifesto,
    };
    submitPartyConfig(config);
  };

  return (
    <div className="min-h-screen bg-game-bg bg-dot-grid bg-gradient-mesh flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-game-accent/10 border border-game-accent/20 mb-4">
            <span className="text-3xl">🏛️</span>
          </div>
          <h1 className="text-3xl font-bold mb-1 font-display">Create Your Party</h1>
          <p className="text-game-secondary text-sm">Define your political identity for the Republic of Novaria</p>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-game-border">
            {/* Left Column */}
            <div className="p-5 space-y-5">
              {/* Party Name */}
              <div>
                <label className="block text-[10px] text-game-muted uppercase tracking-wider mb-1.5 font-bold">Party Name</label>
                <input type="text" value={partyName} onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g., Progressive Alliance" maxLength={30}
                  className="w-full p-2.5 bg-game-bg border border-game-border rounded-lg text-white text-sm placeholder:text-game-muted/50 focus:outline-none focus:border-game-accent/50 focus:ring-1 focus:ring-game-accent/20 transition-all" />
              </div>

              {/* Leader Name */}
              <div>
                <label className="block text-[10px] text-game-muted uppercase tracking-wider mb-1.5 font-bold">Leader Name</label>
                <input type="text" value={leaderName} onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Your character name" maxLength={25}
                  className="w-full p-2.5 bg-game-bg border border-game-border rounded-lg text-white text-sm placeholder:text-game-muted/50 focus:outline-none focus:border-game-accent/50 focus:ring-1 focus:ring-game-accent/20 transition-all" />
              </div>

              {/* Party Color */}
              <div>
                <label className="block text-[10px] text-game-muted uppercase tracking-wider mb-1.5 font-bold">Color</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_OPTIONS.map(color => (
                    <button key={color} onClick={() => setPartyColor(color)}
                      className={`h-9 rounded-lg border-2 transition-all ${
                        partyColor === color ? 'border-white scale-105 shadow-lg' : 'border-transparent hover:border-white/20'
                      }`}
                      style={{ backgroundColor: PARTY_COLORS[color] }} />
                  ))}
                </div>
              </div>

              {/* Party Logo */}
              <div>
                <label className="block text-[10px] text-game-muted uppercase tracking-wider mb-1.5 font-bold">Logo</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {LOGO_OPTIONS.map(l => (
                    <button key={l} onClick={() => setLogo(l)}
                      className={`h-10 rounded-lg flex items-center justify-center border transition-all ${
                        logo === l ? 'border-white bg-white/10' : 'border-game-border bg-game-bg hover:border-white/20'
                      }`}>
                      <PartyLogoIcon name={l} color={PARTY_COLORS[partyColor]} size={24} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="p-5 space-y-5">
              {/* Political Ideology */}
              <div>
                <label className="block text-[10px] text-game-muted uppercase tracking-wider mb-1.5 font-bold">Ideology</label>
                <div className="glass-card p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-red-400">Left</span>
                      <span className="text-[10px] text-game-secondary font-medium">{getAxisLabel(economicAxis, 'econ')}</span>
                      <span className="text-[10px] text-blue-400">Right</span>
                    </div>
                    <input type="range" min={0} max={100} value={economicAxis}
                      onChange={(e) => setEconomicAxis(parseInt(e.target.value))}
                      className="w-full accent-game-accent h-1.5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-orange-400">Authoritarian</span>
                      <span className="text-[10px] text-game-secondary font-medium">{getAxisLabel(socialAxis, 'social')}</span>
                      <span className="text-[10px] text-green-400">Liberal</span>
                    </div>
                    <input type="range" min={0} max={100} value={socialAxis}
                      onChange={(e) => setSocialAxis(parseInt(e.target.value))}
                      className="w-full accent-game-accent h-1.5" />
                  </div>

                  {/* Mini compass */}
                  <div className="relative w-full aspect-square max-w-[120px] mx-auto bg-game-bg rounded-lg border border-game-border">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-px h-full bg-game-border absolute" />
                      <div className="h-px w-full bg-game-border absolute" />
                    </div>
                    <div className="absolute w-3.5 h-3.5 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-all shadow-lg"
                      style={{ left: `${economicAxis}%`, top: `${100 - socialAxis}%`, backgroundColor: PARTY_COLORS[partyColor] }} />
                    <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] text-game-muted">Lib</div>
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-game-muted">Auth</div>
                    <div className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[8px] text-game-muted">L</div>
                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] text-game-muted">R</div>
                  </div>
                </div>
              </div>

              {/* Manifesto */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] text-game-muted uppercase tracking-wider font-bold">Key Promises</label>
                  <span className="text-[10px] text-game-muted">{manifesto.length}/3</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {MANIFESTO_OPTIONS.map(option => (
                    <button key={option} onClick={() => toggleManifesto(option)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                        manifesto.includes(option)
                          ? 'bg-game-accent/20 text-game-accent border-game-accent/30'
                          : manifesto.length >= 3
                            ? 'bg-game-bg text-game-muted/40 border-game-border/50 cursor-not-allowed'
                            : 'bg-game-bg text-game-secondary border-game-border hover:border-white/10 hover:text-white'
                      }`}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview + Submit */}
          <div className="border-t border-game-border p-5 bg-game-card/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: PARTY_COLORS[partyColor] + '20', border: `2px solid ${PARTY_COLORS[partyColor]}40` }}>
                <PartyLogoIcon name={logo} color={PARTY_COLORS[partyColor]} size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold font-display truncate" style={{ color: PARTY_COLORS[partyColor] }}>
                  {partyName || 'Party Name'}
                </h3>
                <p className="text-xs text-game-muted">
                  Led by {leaderName || 'Leader Name'} • {getAxisLabel(economicAxis, 'econ')}-{getAxisLabel(socialAxis, 'social')}
                </p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {manifesto.map(m => (
                    <span key={m} className="text-[10px] px-2 py-0.5 rounded-md bg-game-accent/10 text-game-accent border border-game-accent/20">{m}</span>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!canSubmit}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: canSubmit ? `linear-gradient(135deg, ${PARTY_COLORS[partyColor]}, ${PARTY_COLORS[partyColor]}CC)` : 'rgba(255,255,255,0.03)',
                color: canSubmit ? 'white' : 'var(--game-muted)',
                boxShadow: canSubmit ? `0 0 20px ${PARTY_COLORS[partyColor]}25` : 'none',
              }}>
              {canSubmit ? '🏛️ Found Your Party' : 'Fill in all fields & pick 3 promises'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
