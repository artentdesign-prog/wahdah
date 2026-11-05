import { useEffect, useRef } from 'react';

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  ph: number;
  sp: number;
}

export function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number;
    let motes: Mote[] = [];
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const count = Math.min(160, Math.round((w * h) / 11000));
      motes = [];
      for (let i = 0; i < count; i++) {
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.3 + Math.random() * 1.6,
          vx: (Math.random() - 0.5) * 0.14,
          vy: -0.04 - Math.random() * 0.22,
          ph: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 1.2
        });
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const render = (t: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Base ink fill
      ctx.fillStyle = '#08080b';
      ctx.fillRect(0, 0, w, h);

      // Subtle dynamic gold radial glow in the center
      const g1 = ctx.createRadialGradient(
        w * (0.5 + Math.sin(t / 9000) * 0.12),
        h * 0.42,
        0,
        w * 0.5,
        h * 0.42,
        Math.max(w, h) * 0.6
      );
      g1.addColorStop(0, 'rgba(214, 178, 94, 0.10)');
      g1.addColorStop(1, 'rgba(214, 178, 94, 0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      // Subtle atmospheric purple-gold gradient at bottom left
      const g2 = ctx.createRadialGradient(
        w * (0.15 + Math.cos(t / 11000) * 0.08),
        h * 0.9,
        0,
        w * 0.15,
        h * 0.9,
        Math.max(w, h) * 0.45
      );
      g2.addColorStop(0, 'rgba(120, 90, 200, 0.06)');
      g2.addColorStop(1, 'rgba(120, 90, 200, 0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // Floating motes
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        if (!reduceMotion) {
          m.x += m.vx;
          m.y += m.vy;
          if (m.y < -5) {
            m.y = h + 5;
            m.x = Math.random() * w;
          }
          if (m.x < -5) m.x = w + 5;
          if (m.x > w + 5) m.x = -5;
        }

        const alpha = 0.15 + 0.5 * (0.5 + 0.5 * Math.sin((t / 1000) * m.sp + m.ph));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#f3dc9a';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
