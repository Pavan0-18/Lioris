import { useEffect, useRef } from "react";

export function ReflectionDust({ accentHue }: { accentHue: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    const specks: { x: number; y: number; phase: number; speed: number; size: number }[] = [];
    for (let i = 0; i < 50; i++) {
      specks.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.3 + 0.1,
        size: Math.random() * 2 + 0.8,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() * 0.001;

      for (const s of specks) {
        const alpha = Math.sin(t * s.speed + s.phase) * 0.03 + 0.03;
        if (alpha < 0.008) continue;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${accentHue + 20}, 20%, 70%, ${alpha})`;
        ctx.fill();
      }

      rafRef.current = globalThis.requestAnimationFrame(animate);
    };

    rafRef.current = globalThis.requestAnimationFrame(animate);

    return () => {
      globalThis.cancelAnimationFrame(rafRef.current);
      globalThis.removeEventListener("resize", resize);
    };
  }, [accentHue]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 33 }}
      aria-hidden="true"
    />
  );
}
