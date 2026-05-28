"use client";
import { useEffect, useRef } from "react";

interface ArtifactState {
  x: number;
  y: number;
  rotate: number;
  phaseX: number;
  phaseY: number;
  phaseR: number;
}

const ARTIFACTS = [
  { type: "perfume", bx: 12, by: 28, s: 1, bl: 4, o: 0.12, sp: 0.22, br: -6, z: 7 },
  { type: "brush", bx: 80, by: 58, s: 0.8, bl: 6, o: 0.08, sp: 0.16, br: 14, z: 7 },
  { type: "jar", bx: 84, by: 18, s: 0.85, bl: 7, o: 0.07, sp: 0.2, br: 10, z: 6 },
  { type: "nail", bx: 18, by: 75, s: 0.65, bl: 5, o: 0.08, sp: 0.28, br: -18, z: 7 },
  { type: "petal", bx: 52, by: 88, s: 0.5, bl: 3, o: 0.07, sp: 0.35, br: 22, z: 12 },
  { type: "dropper", bx: 68, by: 32, s: 0.7, bl: 5, o: 0.06, sp: 0.18, br: -8, z: 6 },
];

function ArtifactSVG({ type, accentHue }: { type: string; accentHue: number }) {
  const hue = accentHue + 15;
  const fill = `hsla(${hue}, 15%, 70%, 1)`;

  switch (type) {
    case "perfume":
      return (
        <svg viewBox="-30 -50 60 80" className="w-full h-full" fill="none" stroke={fill} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-12,-20 Q-12,-38 0,-40 Q12,-38 12,-20 L12,12 Q12,22 0,22 Q-12,22 -12,12Z" />
          <path d="M-6,-34 L-6,-42 Q0,-46 6,-42 L6,-34" />
          <path d="M-8,5 L8,5" opacity="0.3" />
          <path d="M-10,10 L10,10" opacity="0.2" />
          <path d="M-12,-15 Q-18,-18 -20,-25" opacity="0.15" strokeWidth="0.5" />
          <path d="M12,-15 Q18,-18 20,-25" opacity="0.15" strokeWidth="0.5" />
        </svg>
      );
    case "brush":
      return (
        <svg viewBox="-15 -30 30 70" className="w-full h-full" fill="none" stroke={fill} strokeWidth="0.7" strokeLinecap="round">
          <path d="M-4,15 L-4,38 Q0,42 4,38 L4,15Z" opacity="0.4" />
          <path d="M-4,12 Q-10,0 -7,-12 Q-4,-5 -1,-18 Q2,-5 5,-12 Q8,0 4,12" opacity="0.25" />
          <path d="M-1,-18 Q0,-22 1,-18" opacity="0.15" strokeWidth="0.4" />
          <path d="M0,38 L0,42" opacity="0.3" strokeWidth="0.5" />
        </svg>
      );
    case "jar":
      return (
        <svg viewBox="-28 -20 56 50" className="w-full h-full" fill="none" stroke={fill} strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-22,-4 L-22,16 Q-22,22 0,22 Q22,22 22,16 L22,-4Z" />
          <path d="M-24,-4 L-24,-10 Q-24,-16 0,-16 Q24,-16 24,-10 L24,-4Z" />
          <path d="M-18,-10 Q-18,-13 0,-13 Q18,-13 18,-10" opacity="0.2" strokeWidth="0.4" />
          <path d="M-8,2 L8,2" opacity="0.15" strokeWidth="0.4" />
        </svg>
      );
    case "nail":
      return (
        <svg viewBox="-12 -20 24 50" className="w-full h-full" fill="none" stroke={fill} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-7,2 L-7,24 Q0,30 7,24 L7,2Z" />
          <path d="M-5,2 L-5,-10 Q0,-14 5,-10 L5,2Z" />
          <path d="M-7,8 L7,8" opacity="0.2" strokeWidth="0.4" />
          <path d="M-3,-10 L-3,-14" opacity="0.3" strokeWidth="0.4" />
          <path d="M3,-10 L3,-14" opacity="0.3" strokeWidth="0.4" />
          <path d="M0,-6 Q-4,-6 -6,-3" opacity="0.15" strokeWidth="0.4" />
          <path d="M0,-6 Q4,-6 6,-3" opacity="0.15" strokeWidth="0.4" />
        </svg>
      );
    case "petal":
      return (
        <svg viewBox="-25 -35 50 50" className="w-full h-full" fill="none" stroke={fill} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0,0 Q-18,-10 -22,-26 Q-12,-32 0,-22 Q12,-32 22,-26 Q18,-10 0,0Z" opacity="0.5" />
          <path d="M0,0 Q-10,-6 -14,-18 Q-6,-20 0,-14 Q6,-20 14,-18 Q10,-6 0,0Z" opacity="0.15" strokeWidth="0.3" />
          <path d="M0,-22 L0,-10" opacity="0.2" strokeWidth="0.3" />
        </svg>
      );
    case "dropper":
      return (
        <svg viewBox="-10 -45 20 60" className="w-full h-full" fill="none" stroke={fill} strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-6,8 L-6,28 Q0,33 6,28 L6,8Z" />
          <path d="M-4,8 L-4,-15 Q-4,-20 0,-22 Q4,-20 4,-15 L4,8" />
          <path d="M0,-15 L0,-30" opacity="0.4" strokeWidth="0.5" />
          <ellipse cx="0" cy="-30" rx="3" ry="6" opacity="0.3" />
          <path d="M-6,14 L6,14" opacity="0.15" strokeWidth="0.3" />
          <path d="M-8,24 L8,24" opacity="0.2" strokeWidth="0.4" />
        </svg>
      );
    default:
      return null;
  }
}

export function FloatingArtifacts({ accentHue }: { accentHue: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ nx: 0.5, ny: 0.5 });
  const stateRef = useRef<ArtifactState[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      mouseRef.current = {
        nx: e.clientX / window.innerWidth,
        ny: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", handleMove);

    stateRef.current = ARTIFACTS.map((a) => ({
      x: a.bx,
      y: a.by,
      rotate: a.br,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      phaseR: Math.random() * Math.PI * 2,
    }));

    let start = Date.now();
    const animIds: number[] = [];

    const animate = () => {
      const t = (Date.now() - start) / 1000;
      const { nx, ny } = mouseRef.current;

      const children = el.children;
      for (let i = 0; i < children.length && i < ARTIFACTS.length; i++) {
        const cfg = ARTIFACTS[i];
        const st = stateRef.current[i];
        if (!st) continue;

        const driftX = Math.sin(t * cfg.sp * 0.08 + st.phaseX) * 4;
        const driftY = Math.cos(t * cfg.sp * 0.06 + st.phaseY) * 3.5;
        const driftR = Math.sin(t * cfg.sp * 0.05 + st.phaseR) * 4;

        const cursorDx = (nx - 0.5) * 2;
        const cursorDy = (ny - 0.5) * 2;
        const cursorDist = Math.hypot(
          (nx * 100 - cfg.bx) / 100,
          (ny * 100 - cfg.by) / 100,
        );
        const cursorInfluence = Math.max(0, 1 - cursorDist * 2.5);
        const pushX = cursorDx * cursorInfluence * 6;
        const pushY = cursorDy * cursorInfluence * 4;

        const x = cfg.bx + driftX + pushX;
        const y = cfg.by + driftY + pushY;
        const r = cfg.br + driftR + cursorInfluence * cursorDx * 3;

        const child = children[i] as HTMLElement;
        if (child) {
          child.style.transform = `translate(${x - 50}vw, ${y - 50}vh) rotate(${r}deg)`;
        }
      }

      animIds[0] = requestAnimationFrame(animate);
    };

    animIds[0] = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(animIds[0]);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 7 }}>
      {ARTIFACTS.map((cfg, i) => (
        <div
          key={cfg.type}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: `${cfg.s * 120}px`,
            height: `${cfg.s * 160}px`,
            opacity: cfg.o,
            filter: `blur(${cfg.bl}px)`,
            zIndex: cfg.z,
            transform: `translate(${cfg.bx - 50}vw, ${cfg.by - 50}vh) rotate(${cfg.br}deg)`,
            willChange: 'transform',
            transition: 'opacity 2s ease',
          }}
        >
          <ArtifactSVG type={cfg.type} accentHue={accentHue} />
        </div>
      ))}
    </div>
  );
}
