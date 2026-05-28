import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  depth: number;
  driftFreq: number;
  driftAmp: number;
}

interface Streak {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  tail: { x: number; y: number }[];
}

const CARD_CX = 0.5;
const CARD_CY = 0.5;
const CARD_RADIUS = 0.25;

export function BeautyMotes({ accentHue }: { accentHue: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const streaksRef = useRef<Streak[]>([]);
  const rafRef = useRef<number>(0);

  const TOTAL = 250;
  const CONNECTION_DIST = 120;
  const CONNECTION_MAX_OPACITY = 0.18;
  const MOUSE_RADIUS = 160;

  const spawnStreak = useCallback(() => {
    streaksRef.current.push({
      x: Math.random() * window.innerWidth,
      y: -15,
      vx: (Math.random() * 1.5 + 1) * (Math.random() > 0.5 ? 1 : -1),
      vy: Math.random() * 1.5 + 1.2,
      life: 0,
      maxLife: 50 + Math.random() * 50,
      tail: [],
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = globalThis.innerWidth;
      canvas.height = globalThis.innerHeight;
    };
    resize();
    globalThis.addEventListener("resize", resize);

    // Depth layers: 0=far, 1=mid, 2=near
    const particles: Particle[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const depth = Math.random();
      const isNear = depth > 0.66;
      const isFar = depth < 0.33;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * (isNear ? 0.2 : isFar ? 0.06 : 0.12),
        vy: (Math.random() - 0.5) * (isNear ? 0.2 : isFar ? 0.06 : 0.12),
        radius: isNear ? Math.random() * 2 + 1.5 : isFar ? Math.random() * 1 + 0.6 : Math.random() * 1.2 + 0.8,
        opacity: isNear ? Math.random() * 0.35 + 0.3 : isFar ? Math.random() * 0.2 + 0.1 : Math.random() * 0.25 + 0.15,
        twinkleSpeed: Math.random() * 0.015 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        depth,
        driftFreq: Math.random() * 0.3 + 0.1,
        driftAmp: Math.random() * 0.4 + 0.15,
      });
    }
    particlesRef.current = particles;

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    globalThis.addEventListener("mousemove", onMouse);
    globalThis.addEventListener("mouseleave", onMouseLeave);

    let streakTimer = 0;
    const hue = accentHue;

    // Color palettes
    const palettes = [
      { p: `rgba(255, 214, 188, `, s: `rgba(255, 228, 196, ` },
      { p: `rgba(244, 200, 170, `, s: `rgba(255, 240, 220, ` },
      { p: `rgba(255, 220, 200, `, s: `rgba(255, 210, 190, ` },
    ];
    const pickPalette = (i: number) => palettes[i % palettes.length];

    const inCardZone = (x: number, y: number, w: number, h: number) => {
      const nx = x / w;
      const ny = y / h;
      const dx = nx - CARD_CX;
      const dy = ny - CARD_CY;
      return Math.hypot(dx, dy) < CARD_RADIUS;
    };

    const drawParticle = (p: Particle, time: number, mx: number, my: number, w: number, h: number) => {
      const dx = mx - p.x;
      const dy = my - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist < MOUSE_RADIUS) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
        p.vx += (dx / dist) * force * 0.03;
        p.vy += (dy / dist) * force * 0.03;
      }

      // Organic wave drift — unique per particle
      const t = time * 0.001;
      const amp = p.driftAmp;
      p.vy += Math.sin(t * p.driftFreq + p.twinklePhase) * 0.0015 * amp * (1 + p.depth);
      p.vx += Math.cos(t * p.driftFreq * 0.7 + p.twinklePhase + 1) * 0.001 * amp * (1 + p.depth);

      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;

      const pad = 60;
      if (p.x < -pad) p.x = w + pad;
      else if (p.x > w + pad) p.x = -pad;
      if (p.y < -pad) p.y = h + pad;
      else if (p.y > h + pad) p.y = -pad;

      const twinkle = Math.sin(time * p.twinkleSpeed + p.twinklePhase) * 0.25 + 0.75;
      let alpha = p.opacity * twinkle;

      // Dim near card
      if (inCardZone(p.x, p.y, w, h)) {
        alpha *= 0.3;
      }

      const pal = pickPalette(Math.floor(p.x + p.y));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

      if (p.depth < 0.33) {
        ctx.filter = 'blur(4px)';
      } else if (p.depth < 0.66) {
        ctx.filter = 'blur(1.5px)';
      } else {
        ctx.filter = 'none';
      }
      ctx.fillStyle = `${pal.p}${alpha})`;
      ctx.fill();
      ctx.filter = 'none';
    };

    const drawConnections = (w: number, h: number) => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);

          if (dist < CONNECTION_DIST) {
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            // Skip connections in card zone
            if (inCardZone(midX, midY, w, h)) continue;

            const alpha = (1 - dist / CONNECTION_DIST) * CONNECTION_MAX_OPACITY;
            const depthAvg = (a.depth + b.depth) / 2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(255, 214, 188, ${alpha})`;
            ctx.lineWidth = depthAvg > 0.66 ? 0.8 : 0.6;
            ctx.stroke();
          }
        }
      }
    };

    const drawStreakTail = (streak: Streak, starAlpha: number) => {
      for (let t = 1; t < streak.tail.length; t++) {
        const tAlpha = (t / streak.tail.length) * starAlpha * 0.5;
        ctx.beginPath();
        ctx.moveTo(streak.tail[t - 1].x, streak.tail[t - 1].y);
        ctx.lineTo(streak.tail[t].x, streak.tail[t].y);
        ctx.strokeStyle = `rgba(255, 228, 196, ${tAlpha})`;
        ctx.lineWidth = 2;
        ctx.filter = 'blur(2px)';
        ctx.stroke();
        ctx.filter = 'none';
      }
    };

    const updateStreaks = (w: number, h: number) => {
      const streaks = streaksRef.current;
      for (let s = streaks.length - 1; s >= 0; s--) {
        const streak = streaks[s];
        streak.x += streak.vx;
        streak.y += streak.vy;
        streak.life++;
        streak.tail.push({ x: streak.x, y: streak.y });
        if (streak.tail.length > 20) streak.tail.shift();

        const progress = streak.life / streak.maxLife;
        const starAlpha = Math.sin(progress * Math.PI) * 0.7;

        ctx.beginPath();
        ctx.arc(streak.x, streak.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 220, ${starAlpha})`;
        ctx.filter = 'blur(2px)';
        ctx.fill();
        ctx.filter = 'none';

        drawStreakTail(streak, starAlpha);

        if (streak.life > streak.maxLife) {
          streaks.splice(s, 1);
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = Date.now();
      const { x: mx, y: my } = mouseRef.current;
      const w = canvas.width;
      const h = canvas.height;

      streakTimer++;
      if (streakTimer > 60 + Math.random() * 100) {
        spawnStreak();
        streakTimer = 0;
      }

      for (const p of particles) {
        drawParticle(p, time, mx, my, w, h);
      }

      drawConnections(w, h);
      updateStreaks(w, h);

      rafRef.current = globalThis.requestAnimationFrame(animate);
    };

    rafRef.current = globalThis.requestAnimationFrame(animate);

    return () => {
      globalThis.cancelAnimationFrame(rafRef.current);
      globalThis.removeEventListener("resize", resize);
      globalThis.removeEventListener("mousemove", onMouse);
      globalThis.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [accentHue, spawnStreak]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 15 }}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
