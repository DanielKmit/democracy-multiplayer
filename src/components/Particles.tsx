'use client';

import { useEffect, useRef } from 'react';

/**
 * GPU-accelerated canvas background — ambient floating particles + gradient nebula.
 * Replaces the CSS dot-grid and particle divs with a proper game-grade render loop.
 */
export function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // ---- Particle system ----
    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      size: number;
      opacity: number;
      maxOpacity: number;
      life: number;
      maxLife: number;
      hue: number;
    }

    const PARTICLE_COUNT = 60;
    const particles: Particle[] = [];

    const spawnParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.15 - Math.random() * 0.3, // Drift upward
      size: 1 + Math.random() * 2,
      opacity: 0,
      maxOpacity: 0.15 + Math.random() * 0.25,
      life: 0,
      maxLife: 400 + Math.random() * 600,
      hue: 210 + Math.random() * 40, // Blue-purple range
    });

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = spawnParticle();
      p.life = Math.random() * p.maxLife; // Stagger initial lives
      particles.push(p);
    }

    // ---- Nebula orbs (large soft gradient blobs) ----
    interface Orb {
      x: number; y: number;
      targetX: number; targetY: number;
      radius: number;
      hue: number;
      saturation: number;
      alpha: number;
      speed: number;
    }

    const orbs: Orb[] = [
      { x: width * 0.2, y: height * 0.3, targetX: width * 0.25, targetY: height * 0.35, radius: 300, hue: 220, saturation: 80, alpha: 0.04, speed: 0.0003 },
      { x: width * 0.7, y: height * 0.7, targetX: width * 0.65, targetY: height * 0.65, radius: 250, hue: 260, saturation: 60, alpha: 0.03, speed: 0.0004 },
      { x: width * 0.5, y: height * 0.2, targetX: width * 0.55, targetY: height * 0.25, radius: 200, hue: 200, saturation: 70, alpha: 0.025, speed: 0.0005 },
    ];

    // ---- Connection lines between nearby particles ----
    const CONNECTION_DIST = 120;

    // ---- Render loop ----
    let time = 0;

    const render = () => {
      time++;
      ctx.clearRect(0, 0, width, height);

      // Draw nebula orbs (large soft gradients that drift slowly)
      for (const orb of orbs) {
        // Slow orbital drift
        const angle = time * orb.speed;
        orb.x += (orb.targetX + Math.sin(angle) * 80 - orb.x) * 0.005;
        orb.y += (orb.targetY + Math.cos(angle * 0.7) * 60 - orb.y) * 0.005;

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        gradient.addColorStop(0, `hsla(${orb.hue}, ${orb.saturation}%, 50%, ${orb.alpha})`);
        gradient.addColorStop(0.5, `hsla(${orb.hue}, ${orb.saturation}%, 30%, ${orb.alpha * 0.4})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(orb.x - orb.radius, orb.y - orb.radius, orb.radius * 2, orb.radius * 2);
      }

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;

        // Fade in and out
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.1) {
          p.opacity = (lifeRatio / 0.1) * p.maxOpacity;
        } else if (lifeRatio > 0.8) {
          p.opacity = ((1 - lifeRatio) / 0.2) * p.maxOpacity;
        } else {
          p.opacity = p.maxOpacity;
        }

        // Gentle drift with slight sine wobble
        p.x += p.vx + Math.sin(time * 0.01 + i) * 0.05;
        p.y += p.vy;

        // Respawn when dead
        if (p.life >= p.maxLife || p.y < -10 || p.x < -10 || p.x > width + 10) {
          Object.assign(p, spawnParticle());
          p.y = height + 10; // Start from bottom
        }

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 60%, 70%, ${p.opacity})`;
        ctx.fill();

        // Soft glow
        if (p.size > 1.5) {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          glow.addColorStop(0, `hsla(${p.hue}, 60%, 70%, ${p.opacity * 0.3})`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
        }
      }

      // Draw connection lines between nearby particles
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.08 * Math.min(particles[i].opacity, particles[j].opacity) * 4;
            ctx.strokeStyle = `hsla(220, 50%, 60%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
