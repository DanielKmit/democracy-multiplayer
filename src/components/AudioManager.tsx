'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

// ============================================
// Audio Manager — Background music + SFX
// Uses Web Audio API, no external dependencies
// ============================================

interface AudioContextType {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  toggleMusic: () => void;
  toggleSfx: () => void;
  playSfx: (sound: SfxType) => void;
}

type SfxType = 'vote' | 'propose' | 'endTurn' | 'victory' | 'defeat' | 'click' | 'notification';

const AudioContext = createContext<AudioContextType>({
  musicEnabled: false,
  sfxEnabled: true,
  toggleMusic: () => {},
  toggleSfx: () => {},
  playSfx: () => {},
});

export function useAudio() {
  return useContext(AudioContext);
}

// Generate simple synth sounds using Web Audio API
function createSfx(audioCtx: globalThis.AudioContext, type: SfxType) {
  const now = audioCtx.currentTime;

  switch (type) {
    case 'vote': {
      // Deep thud sound
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }
    case 'propose': {
      // Paper shuffle / soft whoosh
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }
    case 'endTurn': {
      // Gavel knock — two quick hits
      for (let i = 0; i < 2; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now + i * 0.12);
        osc.frequency.exponentialRampToValueAtTime(60, now + i * 0.12 + 0.08);
        gain.gain.setValueAtTime(0.2, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.1);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.1);
      }
      break;
    }
    case 'victory': {
      // Triumphant ascending notes
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.15);
        gain.gain.setValueAtTime(0.2, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.4);
      });
      break;
    }
    case 'defeat': {
      // Somber descending notes
      const notes = [392, 349, 311, 262]; // G4 F4 Eb4 C4
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.2);
        gain.gain.setValueAtTime(0.15, now + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.5);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.5);
      });
      break;
    }
    case 'click': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }
    case 'notification': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }
  }
}

// Generate ambient music loop using Web Audio API
function createAmbientMusic(audioCtx: globalThis.AudioContext): { gainNode: GainNode; stop: () => void } {
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);

  const oscillators: OscillatorNode[] = [];

  // Deep bass drone
  const bass = audioCtx.createOscillator();
  const bassGain = audioCtx.createGain();
  bass.type = 'sine';
  bass.frequency.setValueAtTime(55, audioCtx.currentTime); // A1
  bassGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  bass.connect(bassGain).connect(masterGain);
  bass.start();
  oscillators.push(bass);

  // Pad chord — Am7 (A C E G)
  const padNotes = [220, 261.63, 329.63, 392];
  padNotes.forEach(freq => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    // Slow LFO on volume for movement
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1 + Math.random() * 0.1, audioCtx.currentTime);
    lfoGain.gain.setValueAtTime(0.015, audioCtx.currentTime);
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
    
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    osc.connect(gain).connect(masterGain);
    osc.start();
    oscillators.push(osc, lfo);
  });

  // Very subtle high shimmer
  const shimmer = audioCtx.createOscillator();
  const shimmerGain = audioCtx.createGain();
  shimmer.type = 'sine';
  shimmer.frequency.setValueAtTime(1760, audioCtx.currentTime); // A6
  shimmerGain.gain.setValueAtTime(0.005, audioCtx.currentTime);
  const shimmerLfo = audioCtx.createOscillator();
  const shimmerLfoGain = audioCtx.createGain();
  shimmerLfo.type = 'sine';
  shimmerLfo.frequency.setValueAtTime(0.05, audioCtx.currentTime);
  shimmerLfoGain.gain.setValueAtTime(0.004, audioCtx.currentTime);
  shimmerLfo.connect(shimmerLfoGain).connect(shimmerGain.gain);
  shimmerLfo.start();
  shimmer.connect(shimmerGain).connect(masterGain);
  shimmer.start();
  oscillators.push(shimmer, shimmerLfo);

  return {
    gainNode: masterGain,
    stop: () => {
      oscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
    },
  };
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const audioCtxRef = useRef<globalThis.AudioContext | null>(null);
  const musicRef = useRef<{ gainNode: GainNode; stop: () => void } | null>(null);

  // Lazy-init audio context on first user interaction
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new window.AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled(prev => {
      const next = !prev;
      if (next) {
        const ctx = getAudioCtx();
        if (!musicRef.current) {
          musicRef.current = createAmbientMusic(ctx);
        }
        // Fade in
        musicRef.current.gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 1);
      } else if (musicRef.current && audioCtxRef.current) {
        // Fade out
        musicRef.current.gainNode.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.5);
      }
      return next;
    });
  }, [getAudioCtx]);

  const toggleSfx = useCallback(() => {
    setSfxEnabled(prev => !prev);
  }, []);

  const playSfx = useCallback((sound: SfxType) => {
    if (!sfxEnabled) return;
    try {
      const ctx = getAudioCtx();
      createSfx(ctx, sound);
    } catch {}
  }, [sfxEnabled, getAudioCtx]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      musicRef.current?.stop();
      audioCtxRef.current?.close();
    };
  }, []);

  return (
    <AudioContext value={{ musicEnabled, sfxEnabled, toggleMusic, toggleSfx, playSfx }}>
      {children}
    </AudioContext>
  );
}
