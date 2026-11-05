import { useEffect, useRef } from 'react';

interface Particle {
  k: number; // 0: firework spark, 1: confetti ribbon
  x: number;
  y: number;
  vx: number;
  vy: number;
  r?: number;
  vr?: number;
  life: number;
  dec: number;
  s: number;
  c: string;
}

const GOLDS = ['#f3dc9a', '#d6b25e', '#ffffff', '#fff3c4', '#b8922f'];

export function FxCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    let rafId: number;
    let parts: Particle[] = [];
    let nextBurst = 0;
    let lastTime = performance.now();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduceMotion) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const loop = (now: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const dt = Math.min(3, (now - lastTime) / 16.67);
      lastTime = now;

      ctx.clearRect(0, 0, w, h);

      // Periodically trigger a firework burst
      if (now > nextBurst) {
        nextBurst = now + 650 + Math.random() * 500;
        const bx = w * (0.12 + Math.random() * 0.76);
        const by = h * (0.12 + Math.random() * 0.4);
        const col = GOLDS[Math.floor(Math.random() * GOLDS.length)];

        for (let i = 0; i < 70; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 1.5 + Math.random() * 5.5;
          parts.push({
            k: 0,
            x: bx,
            y: by,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 1,
            dec: 0.008 + Math.random() * 0.012,
            s: 1.2 + Math.random() * 1.8,
            c: Math.random() < 0.7 ? col : '#ffffff'
          });
        }
      }

      // Continuous golden confetti rain
      for (let j = 0; j < 2; j++) {
        parts.push({
          k: 1,
          x: Math.random() * w,
          y: -12,
          vx: (Math.random() - 0.5) * 1.4,
          vy: 1.6 + Math.random() * 2.6,
          r: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.3,
          life: 3,
          dec: 0,
          s: 5 + Math.random() * 6,
          c: GOLDS[Math.floor(Math.random() * GOLDS.length)]
        });
      }

      parts = parts.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.k === 0) {
          p.vy += 0.06 * dt;
          p.vx *= 0.985;
          p.life -= p.dec * dt;
          if (p.life <= 0) return false;

          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.c;
          ctx.shadowColor = p.c;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          if (p.r !== undefined && p.vr !== undefined) p.r += p.vr * dt;
          if (p.y > h + 20) return false;

          ctx.globalAlpha = 0.9;
          ctx.fillStyle = p.c;
          ctx.save();
          ctx.translate(p.x, p.y);
          if (p.r !== undefined) ctx.rotate(p.r);
          ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
          ctx.restore();
        }
        return true;
      });

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block pointer-events-none z-40"
      aria-hidden="true"
    />
  );
}
