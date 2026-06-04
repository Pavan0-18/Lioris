"use client";
import React from "react";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" });

const luxury = "cubic-bezier(0.22, 1, 0.36, 1)";

interface AuthLayoutProps {
  children: React.ReactNode;
  aura?: string;
  showTopBar?: boolean;
  showFooter?: boolean;
  showMicrocopy?: boolean;
  showGreeting?: boolean;
  editorial?: boolean;
  focused?: boolean;
  cardTitle?: string;
  cardSubtitle?: string;
  cardClassName?: string;
}

export function stagger(i: number, mounted: boolean) {
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
    filter: mounted ? "blur(0px)" : "blur(6px)",
    transition: `all 0.8s ${luxury} ${i * 0.12}s`,
  };
}

export function AuthLayout({
  children,
  showTopBar = true,
  showFooter = true,
  showMicrocopy,
  showGreeting,
  focused,
  cardTitle,
  cardSubtitle,
  cardClassName = "",
}: AuthLayoutProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      <style>{`
        @keyframes float-slow { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-10px) scale(1.02); } }
        @keyframes drift { 0% { transform: translate(0, 0) rotate(0deg); } 33% { transform: translate(30px, -20px) rotate(1deg); } 66% { transform: translate(-20px, 10px) rotate(-1deg); } 100% { transform: translate(0, 0) rotate(0deg); } }
        @keyframes shimmer-glow { 0% { background-position: -100% 0; opacity: 0.5; } 50% { opacity: 0.8; } 100% { background-position: 200% 0; opacity: 0.5; } }
      `}</style>

      {/* Decorative gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-1/3 -right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.08] dark:opacity-[0.05]"
          style={{
            background: `radial-gradient(circle, hsl(var(--primary)), transparent 70%)`,
            animation: "float-slow 12s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-1/3 -left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.06] dark:opacity-[0.04]"
          style={{
            background: `radial-gradient(circle, hsl(var(--primary)), transparent 70%)`,
            animation: "float-slow 16s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-[0.03] dark:opacity-[0.02]"
          style={{
            background: `radial-gradient(ellipse, hsl(var(--primary)), transparent 60%)`,
            animation: "drift 20s ease-in-out infinite",
          }}
        />
      </div>

      {showTopBar && (
        <div className="relative z-10 flex items-center justify-between px-8 md:px-12 py-8">
          <div className="flex items-center gap-3" style={stagger(0, mounted)}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500"
              style={{
                background: `linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--primary)/0.05))`,
              }}
            >
              <svg className="w-4.5 h-4.5" style={{ color: `hsl(var(--primary))` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
              </svg>
            </div>
            <span
              className={`${playfair.className} text-xl font-semibold tracking-wider transition-all duration-700`}
              style={{
                color: `hsl(var(--foreground))`,
                opacity: 0.9,
              }}
            >
              Lioris
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm">
          <div className="relative" style={stagger(1, mounted)}>
            <div
              className={`rounded-2xl border p-8 md:p-10 relative overflow-hidden transition-all duration-700 ${cardClassName}`}
              style={{
                backgroundColor: `hsl(var(--card))`,
                borderColor: `hsl(var(--border))`,
                boxShadow: `0 4px 24px -8px hsl(var(--primary)/0.1), 0 1px 4px -2px hsl(var(--primary)/0.05)`,
              }}
            >
              {cardTitle && (
                <div className="text-center mb-6" style={stagger(2, mounted)}>
                  <h2
                    className={`${playfair.className} text-2xl font-light leading-tight tracking-wide`}
                    style={{ color: `hsl(var(--foreground))` }}
                  >
                    {cardTitle}
                  </h2>
                  {cardSubtitle && (
                    <p
                      className="text-sm mt-2"
                      style={{ color: `hsl(var(--muted-foreground))` }}
                    >
                      {cardSubtitle}
                    </p>
                  )}
                </div>
              )}

              {children}
            </div>
          </div>

          {showFooter && (
            <p
              className="mt-8 text-center text-xs tracking-wider transition-all duration-700"
              style={{ color: `hsl(var(--muted-foreground))`, opacity: 0.4 }}
            >
              &copy; {new Date().getFullYear()} Lioris Beauty Platform
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
