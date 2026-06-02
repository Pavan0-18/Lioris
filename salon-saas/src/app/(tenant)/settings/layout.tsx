"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Settings, Store, Users, Scissors, Bell, Palette } from "lucide-react";

const settingsNav = [
  { label: "General", href: "/settings/general", icon: Settings },
  { label: "Appearance", href: "/settings/appearance", icon: Palette },
  { label: "Branches", href: "/settings/branches", icon: Store },
  { label: "Team", href: "/settings/team", icon: Users },
  { label: "Services", href: "/settings/services", icon: Scissors },
  { label: "Notifications", href: "/settings/notifications", icon: Bell },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-playfair text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground/80 mt-1">Manage your salon preferences and configurations</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-0 lg:gap-8">
        <nav className="flex lg:flex-col lg:w-48 shrink-0 overflow-x-auto pb-2 lg:pb-0 gap-1 lg:gap-1 -mx-2 lg:mx-0 px-2 lg:px-0">
          {settingsNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap lg:whitespace-normal",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0 mt-6 lg:mt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
