import { useEffect, useRef } from "react";

export function MeshGradient({ accentHue }: { accentHue: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = Date.now();

    const animate = () => {
      const t = (Date.now() - start) / 1000;
      const f = 0.005;

      const x1 = 30 + 15 * Math.sin(t * f * 1.1);
      const y1 = 25 + 12 * Math.cos(t * f * 0.9);
      const x2 = 70 + 10 * Math.sin(t * f * 0.8 + 2);
      const y2 = 35 + 14 * Math.cos(t * f * 1.2 + 1);
      const x3 = 50 + 18 * Math.sin(t * f * 0.6 + 4);
      const y3 = 70 + 10 * Math.cos(t * f * 1.0 + 3);
      const x4 = 20 + 12 * Math.sin(t * f * 1.3 + 1);
      const y4 = 75 + 8 * Math.cos(t * f * 0.7 + 2);
      const x5 = 80 + 10 * Math.sin(t * f * 0.5 + 3);
      const y5 = 70 + 12 * Math.cos(t * f * 0.9 + 4);

      el.style.background = `
        radial-gradient(ellipse 50% 40% at ${x1}% ${y1}%, hsla(${accentHue + 15}, 25%, 55%, 0.06) 0%, transparent 70%),
        radial-gradient(ellipse 45% 35% at ${x2}% ${y2}%, hsla(${accentHue - 10}, 20%, 50%, 0.05) 0%, transparent 60%),
        radial-gradient(ellipse 40% 45% at ${x3}% ${y3}%, hsla(${accentHue + 30}, 20%, 60%, 0.04) 0%, transparent 65%),
        radial-gradient(ellipse 35% 30% at ${x4}% ${y4}%, hsla(${accentHue - 20}, 15%, 45%, 0.035) 0%, transparent 55%),
        radial-gradient(ellipse 30% 35% at ${x5}% ${y5}%, hsla(${accentHue + 10}, 25%, 55%, 0.04) 0%, transparent 60%)
      `;
      requestAnimationFrame(animate);
    };

    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [accentHue]);

  return (
    <div
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 3, filter: 'blur(60px)', willChange: 'background' }}
    />
  );
}
