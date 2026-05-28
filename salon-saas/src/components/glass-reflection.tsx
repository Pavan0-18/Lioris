import { useEffect, useRef } from "react";

export function GlassReflection({ accentHue }: { accentHue: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const move = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / globalThis.innerWidth,
        y: e.clientY / globalThis.innerHeight,
      };
    };
    globalThis.addEventListener("mousemove", move);

    let start = Date.now();
    const animate = () => {
      const t = (Date.now() - start) / 1000;
      const { x: mx, y: my } = mouseRef.current;

      const rx = (mx - 0.5) * 2;
      const ry = (my - 0.5) * 2;

      const subtleWave = Math.sin(t * 0.3) * 0.02;

      el.style.background = `
        radial-gradient(ellipse 30% 20% at ${50 + rx * 15 + subtleWave * 100}% ${50 + ry * 10}%, rgba(255, 220, 200, 0.015) 0%, transparent 60%),
        radial-gradient(ellipse 20% 15% at ${50 - rx * 10}% ${50 - ry * 8}%, rgba(255, 240, 220, 0.01) 0%, transparent 50%)
      `;
      requestAnimationFrame(animate);
    };

    const id = requestAnimationFrame(animate);
    return () => {
      globalThis.removeEventListener("mousemove", move);
      cancelAnimationFrame(id);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 32, willChange: 'background' }}
    />
  );
}
