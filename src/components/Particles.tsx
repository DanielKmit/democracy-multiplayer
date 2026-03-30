'use client';

import { useMemo } from 'react';

export function Particles() {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 25 + Math.random() * 35,
      delay: Math.random() * 30,
      opacity: 0.1 + Math.random() * 0.2,
    }));
  }, []);

  return (
    <div className="particles-bg" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
