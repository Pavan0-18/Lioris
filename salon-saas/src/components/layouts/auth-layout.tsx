"use client";
import React from "react";
import { Playfair_Display } from "next/font/google";
import { useBeautyMood } from "@/hooks/useBeautyMood";
import { BeautyMotes } from "@/components/beauty-motes";
import { MeshGradient } from "@/components/mesh-gradient";
import { AuraTrails } from "@/components/aura-trails";
import { CinematicSpotlight } from "@/components/cinematic-spotlight";
import { GlassReflection } from "@/components/glass-reflection";
import { ReflectionDust } from "@/components/reflection-dust";
import { FloatingArtifacts } from "@/components/floating-artifacts";

const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" });

const spring = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const luxury = "cubic-bezier(0.22, 1, 0.36, 1)";

function WarmBase({ colors, accentHue, focused }: { colors: string[]; accentHue: number; focused: boolean }) {
  const dim = focused ? 0.88 : 1;
  return (
    <div className="fixed inset-0 transition-all duration-700" style={{
      opacity: dim,
      background: `
        radial-gradient(ellipse 100% 80% at 50% 0%, hsl(${accentHue + 10}, 30%, ${focused ? 18 : 18}%) 0%, transparent 70%),
        radial-gradient(ellipse 80% 60% at 20% 90%, hsl(${accentHue + 20}, 25%, ${focused ? 13 : 14}%) 0%, transparent 60%),
        radial-gradient(ellipse 60% 70% at 80% 80%, hsl(${accentHue - 10}, 20%, ${focused ? 12 : 13}%) 0%, transparent 50%),
        radial-gradient(ellipse 70% 50% at 50% 50%, ${colors[0]} 0%, transparent 70%),
        linear-gradient(180deg, ${colors.join(", ")})
      `,
    }} />
  );
}

function LightLeaks({ accentHue, intensity, speed, focused }: { accentHue: number; intensity: number; speed: number; focused: boolean }) {
  const leaks = React.useMemo(() => [
    { id: 0, hue: accentHue + 5, sat: 45, light: 60, w: 800, h: 300, x: 20, y: 10, dur: 25, delay: 0, blur: 120 },
    { id: 1, hue: accentHue - 10, sat: 35, light: 55, w: 600, h: 400, x: 60, y: 30, dur: 30, delay: -8, blur: 100 },
    { id: 2, hue: accentHue + 20, sat: 55, light: 65, w: 700, h: 250, x: 10, y: 60, dur: 20, delay: -15, blur: 140 },
    { id: 3, hue: accentHue - 20, sat: 30, light: 50, w: 500, h: 500, x: 70, y: 70, dur: 35, delay: -5, blur: 130 },
  ], [accentHue]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
      {leaks.map((l) => (
        <div
          key={l.id}
          className="absolute rounded-full transition-all duration-700"
          style={{
            width: focused ? l.w * 0.95 : l.w,
            height: focused ? l.h * 0.95 : l.h,
            left: `${l.x}%`,
            top: `${l.y}%`,
            background: `radial-gradient(ellipse at center, hsla(${l.hue}, ${l.sat}%, ${l.light}%, ${(focused ? intensity * 0.4 : intensity) * 0.6}), transparent 70%)`,
            filter: `blur(${focused ? l.blur * 1.2 : l.blur}px)`,
            animation: `light-leak-${l.id} ${l.dur * speed}s ease-in-out infinite, breathe ${l.dur * speed * 0.5}s ease-in-out infinite`,
            animationDelay: `${l.delay}s`,
            willChange: 'transform, width, height, filter',
          }}
        />
      ))}
    </div>
  );
}

function SilkReflection({ speed }: { speed: number }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = Date.now();
    const animate = () => {
      const t = (Date.now() - start) / 1000;
      const f = speed * 0.015;
      const x1 = 30 + 15 * Math.sin(t * f);
      const y1 = 40 + 10 * Math.cos(t * f * 1.33);
      const x2 = 60 + 12 * Math.sin(t * f * 1.2 + 2);
      const y2 = 50 + 8 * Math.cos(t * f * 1.47 + 1);
      el.style.background = `
        radial-gradient(ellipse 40% 30% at ${x1}% ${y1}%, rgba(255, 220, 200, ${0.04 * (speed / 0.85)}) 0%, transparent 70%),
        radial-gradient(ellipse 35% 25% at ${x2}% ${y2}%, rgba(230, 200, 210, ${0.03 * (speed / 0.85)}) 0%, transparent 60%),
        radial-gradient(ellipse 30% 20% at ${100 - x1}% ${100 - y2}%, rgba(240, 210, 180, ${0.025 * (speed / 0.85)}) 0%, transparent 50%)
      `;
      requestAnimationFrame(animate);
    };
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [speed]);

  return <div ref={ref} className="fixed inset-0 pointer-events-none z-20" />;
}

function CursorGlow({ intensity, focused }: { intensity: number; focused: boolean }) {
  const glowRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;
    let mouseX = -500, mouseY = -500;
    const move = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; };
    const leave = () => { mouseX = -500; mouseY = -500; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseleave', leave);
    const animate = () => {
      if (glow) {
        glow.style.opacity = mouseX > 0 ? '1' : '0';
        glow.style.transform = `translate(${mouseX - 200}px, ${mouseY - 200}px)`;
      }
      requestAnimationFrame(animate);
    };
    const id = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseleave', leave);
      cancelAnimationFrame(id);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="fixed top-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none z-30 transition-all duration-700"
      style={{
        background: `radial-gradient(circle, rgba(255, 210, 190, ${intensity * (focused ? 1.5 : 0.8)}) 0%, rgba(255, 210, 190, ${intensity * (focused ? 0.6 : 0.3)}) 40%, transparent 70%)`,
        filter: `blur(${focused ? 30 : 40}px)`,
        willChange: 'transform',
      }}
    />
  );
}

function FocusIsolation({ focused }: { focused: boolean }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none transition-all duration-700"
      style={{
        zIndex: 25,
        opacity: focused ? 0.04 : 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.15) 100%)',
      }}
    />
  );
}

function BackgroundDeco({ accentHue }: { accentHue: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 6 }}>
      <svg className="w-full h-full opacity-[0.02]" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="d1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={`hsl(${accentHue + 20}, 30%, 60%)`} />
            <stop offset="100%" stopColor={`hsl(${accentHue - 10}, 25%, 50%)`} />
          </linearGradient>
          <linearGradient id="d2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={`hsl(${accentHue + 40}, 25%, 65%)`} />
            <stop offset="100%" stopColor={`hsl(${accentHue - 20}, 20%, 45%)`} />
          </linearGradient>
        </defs>
        <path d="M0,600 C200,400 400,700 600,500 C800,300 1000,600 1200,450 C1300,375 1400,475 1440,400 L1440,900 L0,900Z" fill="url(#d1)" />
        <path d="M0,700 C250,550 450,800 650,650 C850,500 1050,750 1250,600 C1350,525 1400,625 1440,550 L1440,900 L0,900Z" fill="url(#d2)" />
        <path d="M0,500 C150,650 350,400 550,550 C750,700 950,450 1150,600 C1300,700 1400,550 1440,620 L1440,900 L0,900Z" fill="url(#d1)" opacity="0.5" />
        <circle cx="200" cy="300" r="400" fill={`hsl(${accentHue + 15}, 25%, 55%)`} opacity="0.15" />
        <circle cx="1200" cy="200" r="350" fill={`hsl(${accentHue - 15}, 20%, 50%)`} opacity="0.12" />
        <ellipse cx="720" cy="650" rx="500" ry="200" fill={`hsl(${accentHue + 30}, 20%, 60%)`} opacity="0.08" />
        <path d="M0,450 Q360,350 720,480 Q1080,610 1440,420" stroke={`hsl(${accentHue + 10}, 20%, 65%)`} strokeWidth="1" fill="none" opacity="0.15" />
        <path d="M0,550 Q360,650 720,520 Q1080,390 1440,550" stroke={`hsl(${accentHue - 10}, 15%, 55%)`} strokeWidth="0.8" fill="none" opacity="0.1" />
      </svg>
    </div>
  );
}

function BreathingAmbience({ focused }: { focused: boolean }) {
  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 8,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(255,220,200,0.04), transparent 70%)',
          animation: 'breathe-ambient 15s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-700"
        style={{
          zIndex: 9,
          opacity: focused ? 0.06 : 0,
          background: 'radial-gradient(ellipse at 50% 45%, rgba(255,220,200,0.2), transparent 60%)',
          transition: 'opacity 1s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </>
  );
}

function MirrorReflection({ color }: { color: string }) {
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none"
      style={{
        top: '100%',
        height: '60px',
        marginTop: '2px',
        background: `linear-gradient(to bottom, ${color}, transparent)`,
        transform: 'scaleY(-1)',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%)',
        borderRadius: 'inherit',
        filter: 'blur(4px)',
        opacity: 0.6,
      }}
    />
  );
}

function CardShimmer({ accentHue }: { accentHue: number }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start = Date.now();
    const animate = () => {
      const t = (Date.now() - start) / 1000;
      const x = 30 + 25 * Math.sin(t * 0.12);
      const y = 20 + 15 * Math.cos(t * 0.09);
      if (el) {
        el.style.background = `
          radial-gradient(ellipse 60% 40% at ${x}% ${y}%, rgba(255,220,200,0.02) 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at ${100 - x}% ${80 - y * 0.5}%, rgba(255,230,210,0.015) 0%, transparent 50%)
        `;
      }
      requestAnimationFrame(animate);
    };
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [accentHue]);

  return <div ref={ref} className="absolute inset-0 pointer-events-none" style={{ borderRadius: 'inherit' }} />;
}



function useTimeGreeting() {
  return React.useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return { greeting: "Good morning", emoji: "" };
    if (h >= 12 && h < 17) return { greeting: "Good afternoon", emoji: "" };
    if (h >= 17 && h < 22) return { greeting: "Good evening", emoji: "" };
    return { greeting: "Good evening", emoji: "" };
  }, []);
}

const luxuryCurve = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export function stagger(i: number, mounted: boolean, isSpring = false) {
  const curve = isSpring ? luxuryCurve : luxury;
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.95)',
    filter: mounted ? 'blur(0px)' : 'blur(10px)',
    transition: `all 0.9s ${curve} ${i * 0.18}s`,
  };
}

const microcopy = [
  "Beauty operations, simplified.",
  "Where artistry meets precision.",
  "Every detail matters.",
  "Welcome back, gorgeous.",
  "Your studio, elevated.",
];

interface AuthLayoutProps {
  children: React.ReactNode;
  aura?: "spa" | "bridal" | "nail" | "luxury";
  showTopBar?: boolean;
  showFooter?: boolean;
  showMicrocopy?: boolean;
  showGreeting?: boolean;
  cardTitle?: string;
  cardSubtitle?: string;
  cardClassName?: string;
  focused?: boolean;
  editorial?: boolean;
}

export function AuthLayout({
  children,
  aura: auraProp,
  showTopBar = true,
  showFooter = true,
  showMicrocopy = true,
  showGreeting = false,
  cardTitle,
  cardSubtitle,
  cardClassName = "",
  focused = false,
  editorial = false,
}: AuthLayoutProps) {
  const [mounted, setMounted] = React.useState(false);
  const [microIndex, setMicroIndex] = React.useState(0);
  const formCardRef = React.useRef<HTMLDivElement>(null);
  const mood = useBeautyMood(auraProp);
  const { greeting } = useTimeGreeting();

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (!showMicrocopy) return;
    const id = setInterval(() => setMicroIndex((prev) => (prev + 1) % microcopy.length), 4500);
    return () => clearInterval(id);
  }, [showMicrocopy]);

  React.useEffect(() => {
    const card = formCardRef.current;
    if (!card) return;
    const handleMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1000px) rotateY(${x * 2.5}deg) rotateX(${-y * 2.5}deg)`;
    };
    const handleLeave = () => {
      card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
    };
    const parent = card.closest('.tilt-container') as HTMLElement | null;
    if (parent) {
      parent.addEventListener('mousemove', handleMove as EventListener);
      parent.addEventListener('mouseleave', handleLeave as EventListener);
    }
    return () => {
      if (parent) {
        parent.removeEventListener('mousemove', handleMove as EventListener);
        parent.removeEventListener('mouseleave', handleLeave as EventListener);
      }
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes light-leak-0 { 0%,100% { transform:translate(0,0) scale(1); opacity:1; } 25% { transform:translate(40px,-30px) scale(1.05); opacity:0.7; } 50% { transform:translate(-20px,20px) scale(0.95); opacity:1; } 75% { transform:translate(30px,-10px) scale(1.02); opacity:0.8; } }
        @keyframes light-leak-1 { 0%,100% { transform:translate(0,0) scale(1); opacity:0.8; } 33% { transform:translate(-30px,20px) scale(0.95); opacity:1; } 66% { transform:translate(20px,-40px) scale(1.08); opacity:0.7; } }
        @keyframes light-leak-2 { 0%,100% { transform:translate(0,0) scale(1); opacity:0.7; } 20% { transform:translate(20px,-50px) scale(1.1); opacity:1; } 40% { transform:translate(-30px,-10px) scale(0.9); opacity:0.8; } 60% { transform:translate(10px,30px) scale(1.05); opacity:0.6; } 80% { transform:translate(-20px,-20px) scale(0.95); opacity:0.9; } }
        @keyframes light-leak-3 { 0%,100% { transform:translate(0,0) scale(1); opacity:0.6; } 50% { transform:translate(50px,30px) scale(1.12); opacity:1; } }
        @keyframes breathe { 0%,100% { opacity:0.8; } 50% { opacity:0.5; } }
        @keyframes breathe-ambient { 0%,100% { opacity:0.5; transform: scale(1); } 33% { opacity:0.8; transform: scale(1.03); } 66% { opacity:0.4; transform: scale(0.97); } }
        @keyframes gold-sweep { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes fade-up-in { 0% { opacity: 0; transform: translateY(10px); filter: blur(4px); } 100% { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes icon-pulse { 0%,100% { transform: scale(1); opacity: 0.35; } 50% { transform: scale(1.15); opacity: 0.6; } }
        @keyframes liquid-shine { 0% { transform: translateX(-100%) rotate(15deg); } 100% { transform: translateX(200%) rotate(15deg); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes shimmer-diffuse {
          0% { opacity: 0.3; transform: scale(0.95); filter: blur(4px); }
          25% { opacity: 0.6; transform: scale(1.02); filter: blur(2px); }
          50% { opacity: 0.8; transform: scale(1); filter: blur(0); }
          75% { opacity: 0.6; transform: scale(1.02); filter: blur(2px); }
          100% { opacity: 0.3; transform: scale(0.95); filter: blur(4px); }
        }
        @keyframes card-surface-sweep {
          0% { opacity: 0.3; transform: translateX(-30%); }
          50% { opacity: 0.6; transform: translateX(0%); }
          100% { opacity: 0.3; transform: translateX(30%); }
        }
        .tilt-card { transition: transform 0.2s ${luxury}; }
        .micro-text { animation: fade-up-in 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
        .btn-liquid::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.03), transparent);
          animation: liquid-shine 5s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          pointer-events: none;
        }
        .premium-loading {
          animation: shimmer-diffuse 2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
      `}</style>

      <WarmBase colors={mood.baseColors} accentHue={mood.accentHue} focused={focused} />
      <MeshGradient accentHue={mood.accentHue} />
      <CinematicSpotlight accentHue={mood.accentHue} focused={focused} />
      <div className="fixed inset-0 pointer-events-none" style={{
        zIndex: 5,
        opacity: 0.025,
        mixBlendMode: 'overlay' as any,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '256px 256px',
      }} />
      <BackgroundDeco accentHue={mood.accentHue} />
      <LightLeaks accentHue={mood.accentHue} intensity={mood.glowIntensity} speed={mood.animationSpeed} focused={focused} />
      <FloatingArtifacts accentHue={mood.accentHue} />
      <BeautyMotes accentHue={mood.accentHue} />
      <BreathingAmbience focused={focused} />
      <SilkReflection speed={mood.animationSpeed} />
      <FocusIsolation focused={focused} />
      <CursorGlow intensity={mood.glowIntensity} focused={focused} />
      <GlassReflection accentHue={mood.accentHue} />
      <ReflectionDust accentHue={mood.accentHue} />
      <AuraTrails />

      <div className="relative min-h-screen flex flex-col" style={{ backgroundColor: '#0a0607' }}>
        {showTopBar && (
          <div className="relative z-40 flex items-center justify-between px-8 md:px-12 py-8">
            <div className="flex items-center gap-3" style={stagger(0, mounted)}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, rgba(255,200,180,0.12), rgba(255,200,180,0.03))`,
                  animation: 'float 6s cubic-bezier(0.22, 1, 0.36, 1) infinite',
                }}
              >
                <svg className="w-4 h-4" style={{ opacity: mood.logoOpacity, color: 'white', animation: 'icon-pulse 5s ease-in-out infinite' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                </svg>
              </div>
              <span
                className={`${playfair.className} text-xl font-semibold tracking-wider transition-all duration-700 bg-clip-text text-transparent`}
                style={{
                  backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,230,210,0.9) 40%, rgba(255,200,180,0.6) 70%, rgba(255,255,255,0.8) 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'gold-sweep 6s cubic-bezier(0.22, 1, 0.36, 1) infinite',
                  opacity: mood.logoOpacity,
                }}
              >
                LIORIS
              </span>
            </div>
            <div className="flex items-center gap-3">
              {auraProp && (
                <span className="text-[10px] tracking-[0.25em] uppercase transition-all duration-700" style={{ opacity: mood.logoOpacity * 0.3, color: 'white' }}>
                  {mood.aura}
                </span>
              )}
              <span className="text-[10px] tracking-[0.3em] transition-all duration-700" style={{ opacity: mood.logoOpacity * 0.35, color: 'white' }}>
                {mood.label}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center px-4 pb-20 tilt-container">
          <div className="w-full max-w-sm">
            <div className="relative" style={stagger(1, mounted)}>
              <div className="relative tilt-card" ref={formCardRef}>
                <div
                  className={`rounded-2xl backdrop-blur-xl border p-8 md:p-10 transition-all duration-700 relative overflow-hidden ${cardClassName}`}
                  style={{
                    backgroundColor: `rgba(255,255,255,${focused ? mood.glowIntensity * 0.35 : mood.glowIntensity * 0.25})`,
                    borderColor: `rgba(255,255,255,${focused ? mood.glowIntensity * 0.55 : mood.glowIntensity * 0.4})`,
                    boxShadow: focused
                      ? `0 8px 40px rgba(0,0,0,0.25), 0 0 80px rgba(255,180,160,${mood.glowIntensity * 0.2})`
                      : `0 4px 20px rgba(0,0,0,0.15)`,
                    transition: 'all 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <CardShimmer accentHue={mood.accentHue} />

                  {showGreeting && (
                    <div className="text-center mb-1" style={stagger(2, mounted)}>
                      <p
                        className="text-xs tracking-[0.15em] transition-all duration-700"
                        style={{ opacity: mood.textOpacity * 0.3, color: 'white' }}
                      >
                        {greeting}
                      </p>
                    </div>
                  )}

                  {cardTitle && (
                    <div className="text-center mb-5" style={stagger(editorial ? 2 : 3, mounted)}>
                      <div
                        className="w-14 h-14 mx-auto rounded-full flex items-center justify-center transition-all duration-700"
                        style={{
                          borderColor: `rgba(255,255,255,${mood.glowIntensity * 0.35})`,
                          background: `radial-gradient(circle at 30% 30%, rgba(255,220,200,${mood.glowIntensity * 0.8}), rgba(255,220,200,${mood.glowIntensity * 0.15}))`,
                          animation: 'float 7s cubic-bezier(0.22, 1, 0.36, 1) infinite',
                          transform: focused ? 'scale(1.06)' : 'scale(1)',
                          transition: 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      >
                        <svg className="w-6 h-6 transition-all duration-700" style={{ opacity: mood.logoOpacity, color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {cardTitle && (
                    <div className="text-center mb-2" style={stagger(editorial ? 3 : 4, mounted)}>
                      <h2
                        className={`${playfair.className} font-light leading-[1.2] tracking-wide transition-all duration-700`}
                        style={{
                          opacity: mood.textOpacity,
                          color: 'white',
                          fontSize: editorial ? '28px' : '24px',
                          letterSpacing: editorial ? '0.06em' : '0.03em',
                        }}
                      >
                        {cardTitle}
                      </h2>
                      {cardSubtitle && (
                        <p
                          className="text-xs tracking-[0.08em] mt-2 transition-all duration-700"
                          style={{ opacity: mood.textOpacity * 0.3, color: 'white' }}
                        >
                          {cardSubtitle}
                        </p>
                      )}
                    </div>
                  )}

                  {showMicrocopy && (
                    <div className="text-center mb-8" style={stagger(5, mounted)}>
                      <p
                        key={microIndex}
                        className="text-xs micro-text tracking-[0.08em] transition-all duration-500"
                        style={{ opacity: mood.textOpacity * 0.35, color: 'white' }}
                      >
                        {microcopy[microIndex]}
                      </p>
                    </div>
                  )}

                  {children}
                </div>
              </div>
              <MirrorReflection color={mood.cardReflection} />
            </div>

            {showFooter && (
              <p className="mt-8 text-center text-[10px] tracking-[0.2em] transition-all duration-700" style={{ opacity: mood.textOpacity * 0.08, color: 'white' }}>
                &copy; {new Date().getFullYear()} Lioris Beauty Platform
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
