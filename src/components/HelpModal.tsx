'use client';

import { useState } from 'react';

const slides = [
  {
    title: '🏛️ How to Play',
    content: (
      <div className="space-y-4 text-sm text-slate-300">
        <p className="text-base text-white font-medium">Democracy is a 2-player political strategy game set in the Republic of Novaria.</p>
        <p>Create your party, pass laws, manage crises, and outmaneuver your opponent to win elections and control the government.</p>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-blue-400 font-medium mb-1">🎯 Win Condition</p>
          <p>Win <strong>3 elections</strong> to claim total victory — or force your opponent to surrender.</p>
        </div>
      </div>
    ),
  },
  {
    title: '🔄 Turn Structure',
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-amber-400 font-medium mb-1">📰 Events Phase</p>
          <p>Random events and crises affect the country. React to scandals, economic shifts, and more.</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-blue-400 font-medium mb-1">🏛️ Governing Phase</p>
          <p>Ruling party sets policies and passes laws. Opposition blocks, leaks, and protests.</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-purple-400 font-medium mb-1">📢 Campaign Phase</p>
          <p>Before elections, both parties campaign for voter support across regions.</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-red-400 font-medium mb-1">🗳️ Election Phase</p>
          <p>Votes are counted region by region. Win seats, form coalitions, take power.</p>
        </div>
      </div>
    ),
  },
  {
    title: '⚡ Key Mechanics',
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-yellow-400 font-medium mb-1">⚡ Political Capital (PC)</p>
          <p>Everything costs PC. Change policies, appoint ministers, run campaigns — spend wisely.</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-blue-400 font-medium mb-1">📋 Laws & Parliament</p>
          <p>Propose bills that go through parliament vote. Your coalition partners may disagree!</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-emerald-400 font-medium mb-1">👥 Ministers</p>
          <p>Appoint ministers to boost specific policy areas. But scandals can bring them down.</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-red-400 font-medium mb-1">⚖️ Dilemmas</p>
          <p>Face tough choices with trade-offs. Every decision shifts voter sentiment.</p>
        </div>
      </div>
    ),
  },
  {
    title: '⚔️ Ruling vs Opposition',
    content: (
      <div className="space-y-3 text-sm text-slate-300">
        <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-4">
          <p className="text-blue-400 font-medium mb-2">🏛️ Ruling Party</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Set national policies (economy, social, security)</li>
            <li>Appoint and dismiss ministers</li>
            <li>Propose bills to parliament</li>
            <li>Handle crises and dilemmas</li>
            <li>Manage the national budget</li>
          </ul>
        </div>
        <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4">
          <p className="text-red-400 font-medium mb-2">⚔️ Opposition</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Block bills in parliament</li>
            <li>Leak government scandals</li>
            <li>Organize protests and rallies</li>
            <li>Propose alternative policies</li>
            <li>Undermine government credibility</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const slide = slides[slideIndex];
  const isLast = slideIndex === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold">{slide.title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-all cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {slide.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700">
          {/* Dots */}
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIndex(i)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === slideIndex ? 'bg-blue-500 w-4' : 'bg-slate-600'}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            {slideIndex > 0 && (
              <button
                onClick={() => setSlideIndex(i => i - 1)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                ← Back
              </button>
            )}
            <button
              onClick={isLast ? onClose : () => setSlideIndex(i => i + 1)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] cursor-pointer"
            >
              {isLast ? 'Got it! 🎮' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
