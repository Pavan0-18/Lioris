"use client";
import React from "react";

interface LuxuryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  type?: "submit" | "button";
  className?: string;
}

export function LuxuryButton({
  children,
  onClick,
  disabled,
  loading,
  loadingText = "Loading...",
  type = "submit",
  className = "",
}: LuxuryButtonProps) {
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0.5, y: 0.5 });
  const [isHovered, setIsHovered] = React.useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      });
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <div
        className="absolute -inset-3 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(255,200,180,0.1) 0%, rgba(255,180,160,0.03) 40%, transparent 70%)`,
          filter: 'blur(25px)',
          transition: 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'opacity',
        }}
      />
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(255,220,200,0.05) 0%, transparent 50%)`,
          filter: 'blur(8px)',
          transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
      <button
        ref={btnRef}
        type={type}
        disabled={disabled || loading}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-full py-4 px-6 rounded-2xl text-sm font-medium text-white overflow-hidden disabled:opacity-60"
        style={{
          background: `linear-gradient(135deg, rgba(255,200,180,0.14), rgba(255,220,200,0.1))`,
          boxShadow: isHovered
            ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(255,180,160,0.1)`
            : `inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(255,180,160,0.06)`,
          transform: isHovered ? 'scale(1.01)' : 'scale(1)',
          transition: `
            transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1),
            background 0.6s cubic-bezier(0.22, 1, 0.36, 1)
          `,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            opacity: isHovered ? 1 : 0.6,
            background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(255,220,200,0.08) 0%, transparent 60%)`,
            transition: 'opacity 0.5s ease',
          }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)`,
          backgroundSize: '200% auto',
          animation: 'shimmer 3s linear infinite',
        }} />
        <div
          className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.025] transition-colors duration-500 pointer-events-none"
        />
        <span className="relative flex items-center justify-center gap-3">
          {loading ? (
            <span className="premium-loading flex items-center gap-3">
              <span className="inline-block w-4 h-4 rounded-full border border-white/30" style={{
                background: 'rgba(255,255,255,0.05)',
              }} />
              {loadingText}
            </span>
          ) : (
            <>
              {children}
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </span>
      </button>
    </div>
  );
}
