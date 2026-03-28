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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Your Party</h1>
          <p className="text-slate-400">Define your political identity for the Republic of Novaria</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-5">
            {/* Party Name */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Party Name</label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g., Progressive Alliance"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                maxLength={30}
              />
            </div>

            {/* Leader Name */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Leader Name</label>
              <input
                type="text"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                placeholder="Your character name"
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                maxLength={25}
              />
            </div>

            {/* Party Color */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Party Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={() => setPartyColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      partyColor === color ? 'border-white scale-110' : 'border-slate-600 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: PARTY_COLORS[color] }}
                  />
                ))}
              </div>
            </div>

            {/* Party Logo */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Party Logo</label>
              <div className="grid grid-cols-6 gap-2">
                {LOGO_OPTIONS.map(l => (
                  <button
                    key={l}
                    onClick={() => setLogo(l)}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center border transition-all ${
                      logo === l
                        ? 'border-white bg-slate-700'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                    }`}
                  >
                    <PartyLogoIcon name={l} color={PARTY_COLORS[partyColor]} size={28} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Political Compass */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Political Ideology</label>
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>State Control</span>
                    <span>Economic: {economicAxis}</span>
                    <span>Free Market</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={economicAxis}
                    onChange={(e) => setEconomicAxis(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Authoritarian</span>
                    <span>Social: {socialAxis}</span>
                    <span>Liberal</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={socialAxis}
                    onChange={(e) => setSocialAxis(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Mini compass visualization */}
                <div className="mt-3 relative w-full aspect-square max-w-[140px] mx-auto bg-slate-900 rounded border border-slate-700">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-px h-full bg-slate-700 absolute" />
                    <div className="h-px w-full bg-slate-700 absolute" />
                  </div>
                  <div
                    className="absolute w-4 h-4 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-all"
                    style={{
                      left: `${economicAxis}%`,
                      top: `${100 - socialAxis}%`,
                      backgroundColor: PARTY_COLORS[partyColor],
                    }}
                  />
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-600">Liberal</div>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-600">Auth</div>
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-600">Left</div>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-600">Right</div>
                </div>
              </div>
            </div>

            {/* Manifesto */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Key Promises ({manifesto.length}/3)
              </label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {MANIFESTO_OPTIONS.map(option => (
                  <button
                    key={option}
                    onClick={() => toggleManifesto(option)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      manifesto.includes(option)
                        ? 'border-white bg-slate-700 text-white'
                        : manifesto.length >= 3
                        ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: PARTY_COLORS[partyColor] + '30', border: `2px solid ${PARTY_COLORS[partyColor]}` }}
            >
              <PartyLogoIcon name={logo} color={PARTY_COLORS[partyColor]} size={36} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold" style={{ color: PARTY_COLORS[partyColor] }}>
                {partyName || 'Party Name'}
              </h3>
              <p className="text-sm text-slate-400">Led by {leaderName || 'Leader Name'}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {manifesto.map(m => (
                  <span key={m} className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{m}</span>
                ))}
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Econ: {economicAxis < 40 ? 'Left' : economicAxis > 60 ? 'Right' : 'Center'}</div>
              <div>Social: {socialAxis < 40 ? 'Auth' : socialAxis > 60 ? 'Liberal' : 'Moderate'}</div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full mt-6 py-4 rounded-xl text-lg font-semibold transition-all"
          style={{
            backgroundColor: canSubmit ? PARTY_COLORS[partyColor] : '#334155',
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          {canSubmit ? '🏛️ Found Your Party' : 'Fill in all fields & pick 3 promises'}
        </button>
      </div>
    </div>
  );
}
