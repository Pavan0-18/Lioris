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
  id, label, type, value, onChange, focused, onFocus, onBlur,
  icon, children, className = "", autoComplete,
}: FloatingInputProps) {
  const hasValue = value.length > 0;
  const float = focused || hasValue;

  return (
    <div className={`relative group ${className}`}>
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-500"
        style={{
          boxShadow: focused
            ? `0 0 0 1px hsl(var(--primary)/0.3), 0 0 40px hsl(var(--primary)/0.08)`
            : `inset 0 1px 0 hsl(var(--border))`,
          background: focused
            ? `linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted)))`
            : `hsl(var(--card))`,
          border: `1px solid ${focused ? 'transparent' : 'hsl(var(--border))'}`,
        }}
      >
        <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-500 z-10"
          style={{ opacity: float ? 0.15 : 0.25, color: `hsl(var(--foreground))` }}
        >
          {icon}
        </div>
        <label
          htmlFor={id}
          className="absolute left-12 transition-all duration-500 pointer-events-none z-10"
          style={{
            top: float ? '10px' : '50%',
            transform: float ? 'translateY(0) scale(0.85)' : 'translateY(-50%) scale(1)',
            transformOrigin: 'left center',
            opacity: float ? 0.5 : 0.35,
            color: focused ? `hsl(var(--primary))` : `hsl(var(--foreground))`,
            fontSize: float ? '11px' : '14px',
            letterSpacing: float ? '0.05em' : '0.02em',
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
          className="w-full bg-transparent pt-5 pb-3 pl-12 pr-12 text-sm outline-none transition-all duration-500"
          style={{ color: `hsl(var(--foreground))`, caretColor: `hsl(var(--primary))` }}
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
