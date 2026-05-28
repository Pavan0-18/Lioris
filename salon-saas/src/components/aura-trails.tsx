import { useEffect, useRef } from "react";

export function AuraTrails() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailsRef = useRef<{ x: number; y: number; life: number; maxLife: number }[]>([]);
  const mouseRef = useRef({ x: -100, y: -100, px: -100, py: -100 });
  const rafRef = useRef<number>(0);

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

    const move = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        px: mouseRef.current.x,
        py: mouseRef.current.y,
      };
    };
    const leave = () => {
      mouseRef.current = { x: -100, y: -100, px: -100, py: -100 };
    };
    globalThis.addEventListener("mousemove", move);
    globalThis.addEventListener("mouseleave", leave);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x, y, px, py } = mouseRef.current;

      if (x > 0 && (Math.abs(x - px) > 2 || Math.abs(y - py) > 2)) {
        trailsRef.current.push({
          x, y, life: 0, maxLife: 18 + Math.random() * 12,
        });
      }

      const trails = trailsRef.current;
      for (let i = trails.length - 1; i >= 0; i--) {
        const t = trails[i];
        t.life++;
        const progress = t.life / t.maxLife;
        const alpha = Math.sin(progress * Math.PI) * 0.06;

        ctx.beginPath();
        ctx.arc(t.x, t.y, 8 * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 214, 188, ${alpha})`;
        ctx.fill();

        if (t.life > t.maxLife) trails.splice(i, 1);
      }

      rafRef.current = globalThis.requestAnimationFrame(animate);
    };

    rafRef.current = globalThis.requestAnimationFrame(animate);

    return () => {
      globalThis.cancelAnimationFrame(rafRef.current);
      globalThis.removeEventListener("resize", resize);
      globalThis.removeEventListener("mousemove", move);
      globalThis.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 35 }}
      aria-hidden="true"
    />
  );
}
