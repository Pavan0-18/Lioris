"use client";
import React from "react";
import { useTimeBackground } from "@/hooks/useTimeBackground";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function AmbientContent({ children }: { children: React.ReactNode }) {
  const bg = useTimeBackground();
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex items-center justify-end px-6 py-2 bg-background/50 backdrop-blur-sm border-b">
        <NotificationBell />
      </header>
      <main
        className="flex-1 overflow-y-auto p-6 transition-all duration-1000"
        style={{
          background: bg.gradient,
          transition: "background 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
