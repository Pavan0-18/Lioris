"use client";
import React from "react";
import { useTimeBackground } from "@/hooks/useTimeBackground";

export function AmbientPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const bg = useTimeBackground();
  return (
    <div
      className={`min-h-screen transition-all duration-1000 ${className}`}
      style={{
        background: bg.gradient,
        transition: "background 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
    </div>
  );
}
