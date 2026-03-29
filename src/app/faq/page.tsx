'use client';

import { useState } from 'react';
import Link from 'next/link';

const faqs = [
  {
    q: 'How many players can play?',
    a: 'Democracy is a 2-player game. One player controls the ruling party, and the other controls the opposition. You play against a real opponent in real-time.',
  },
  {
    q: 'How long does a game take?',
    a: 'A typical game lasts 20–30 minutes. Each game consists of up to 3 election cycles, with governing turns in between.',
  },
  {
    q: 'Does it work on mobile?',
    a: 'Yes! The game is fully responsive and works on phones and tablets. For the best experience, we recommend landscape mode on mobile devices.',
  },
  {
    q: 'What happens if my opponent disconnects?',
    a: 'The game will attempt to auto-reconnect for 60 seconds. If the connection cannot be restored, the disconnected player forfeits. You can also save your game state at any time.',
  },
  {
    q: 'Can I play solo against AI?',
    a: 'Not yet — but an AI opponent is coming soon! For now, grab a friend and share your room code to play.',
  },
  {
    q: 'How do I win?',
    a: 'Win 3 elections to claim total victory. Elections happen every few turns. Your vote share depends on your policies, handling of crises, campaign actions, and more.',
  },
  {
    q: 'What is Political Capital (PC)?',
    a: 'Political Capital is your action currency. Everything costs PC — changing policies, appointing ministers, running opposition actions, and campaigning. Spend it wisely!',
  },
  {
    q: 'Is the game free?',
    a: 'Yes, Democracy is completely free to play. No accounts, no ads, no microtransactions.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10 animate-fade-in">
          <Link href="/" className="text-6xl mb-4 block cursor-pointer">🏛️</Link>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-[#9CA3AF]">Everything you need to know about Democracy</p>
        </div>

        <div className="space-y-2 mb-8">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800 transition-all"
              >
                <span className="font-medium text-white">{faq.q}</span>
                <span className={`text-slate-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 text-[#9CA3AF] text-sm animate-fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all hover:scale-[1.02] cursor-pointer"
          >
            ← Back to Game
          </Link>
        </div>
      </div>
    </div>
  );
}
