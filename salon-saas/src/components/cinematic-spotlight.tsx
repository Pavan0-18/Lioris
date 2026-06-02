import { useEffect, useRef } from "react";

export function CinematicSpotlight({ accentHue, focused }: { accentHue: number; focused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = Date.now();

    const animate = () => {
      const t = (Date.now() - start) / 1000;
      const f = 0.003;

      const cx = 50 + 8 * Math.sin(t * f * 1.1);
      const cy = 42 + 5 * Math.cos(t * f * 0.8);
      const spread = focused ? 35 : 40;

      el.style.background = `
        radial-gradient(ellipse ${spread}% ${spread}% at ${cx}% ${cy}%, hsla(${accentHue + 10}, 25%, 60%, 0.04) 0%, transparent 70%),
        radial-gradient(ellipse 25% 20% at ${100 - cx}% ${cy + 10}%, hsla(${accentHue - 10}, 20%, 50%, 0.025) 0%, transparent 60%)
      `;
      requestAnimationFrame(animate);
    };

    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [accentHue, focused]);

  return (
    <div
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 4, willChange: 'background' }}
    />
  );
}
