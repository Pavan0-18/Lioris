"use client";
import React from "react";

interface FloatingInputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  icon: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  autoComplete?: string;
}

export function FloatingInput({
  id,
  label,
  type,
  value,
  onChange,
  focused,
  onFocus,
  onBlur,
  icon,
  children,
  className = "",
  autoComplete,
}: FloatingInputProps) {
  const hasValue = value.length > 0;
  const float = focused || hasValue;

  return (
    <div className={`relative group ${className}`}>
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-700"
        style={{
          boxShadow: focused
            ? `0 0 0 1px rgba(255, 200, 180, 0.18), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 40px rgba(255, 180, 160, 0.08), 0 0 80px rgba(255, 180, 160, 0.03)`
            : `inset 0 1px 0 rgba(255,255,255,0.02)`,
          background: focused
            ? `linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.04) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0.02) 100%)`,
          border: 'none',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            opacity: focused ? 0.5 : 0,
            background: `linear-gradient(180deg, transparent 0%, rgba(255,220,200,0.03) 50%, transparent 100%)`,
          }}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/12 transition-all duration-500 z-10"
          style={{ opacity: float ? 0.06 : 0.12 }}
        >
          {icon}
        </div>
        <label
          htmlFor={id}
          className="absolute left-4 transition-all duration-500 pointer-events-none z-10"
          style={{
            top: float ? '10px' : '50%',
            transform: float ? 'translateY(0) scale(0.85)' : 'translateY(-50%) scale(1)',
            transformOrigin: 'left center',
            opacity: float ? 0.4 : 0.25,
            color: 'white',
            fontSize: float ? '11px' : '14px',
            letterSpacing: float ? '0.1em' : '0.03em',
            fontWeight: float ? 500 : 400,
          }}
        >
          {label}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-white/70 pt-5 pb-3 pl-4 pr-12 text-sm outline-none transition-all duration-500"
          style={{
            caretColor: 'rgba(255, 200, 180, 0.6)',
          }}
          required
        />
        {children && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
