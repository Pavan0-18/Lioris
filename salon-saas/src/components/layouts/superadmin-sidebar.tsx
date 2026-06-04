"use client";
import React from "react";
import { signOut } from "next-auth/react";
import { useBeautyTheme, themes } from "@/hooks/useBeautyTheme";
import { DashboardShell, NavItem } from "@/components/layouts/dashboard-shell";
import {
  Home, Layers, ShieldCheck, DollarSign, Users, Activity,
  ClipboardList, Settings as SettingsIcon,
  Wrench, LogOut, Monitor, HeartPulse,
  Moon, Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const superadminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/superadmin/dashboard", icon: Home },
  { label: "Tenants", href: "/superadmin/tenants", icon: Layers },
  { label: "Users", href: "/superadmin/users", icon: Users },
  { label: "Analytics", href: "/superadmin/analytics", icon: Activity },
  { label: "Sessions", href: "/superadmin/sessions", icon: Monitor },
  { label: "Health", href: "/superadmin/analytics", icon: HeartPulse },
  { label: "Audit Log", href: "/superadmin/audit", icon: ClipboardList },
  { label: "Bulk Ops", href: "/superadmin/bulk", icon: ShieldCheck },
  { label: "Features", href: "/superadmin/features", icon: DollarSign },
  { label: "Plans", href: "/superadmin/plans", icon: Layers },
  { label: "Maintenance", href: "/superadmin/maintenance", icon: Wrench },
  { label: "Config", href: "/superadmin/config", icon: SettingsIcon },
];

export function SuperAdminDashboardShell({ children }: { children: React.ReactNode }) {
  const { theme, isDark, setTheme, toggleDark, mounted } = useBeautyTheme();

  return (
    <DashboardShell
      navItems={superadminNavItems}
      branding={{ icon: <ShieldCheck className="w-4 h-4 text-primary" />, name: "Admin" }}
      footer={
        <div className="space-y-2">
          {mounted && (
            <div className="flex items-center gap-1 px-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    theme === t.id ? "border-primary scale-110" : "border-transparent hover:scale-110"
                  }`}
                  style={{ backgroundColor: isDark ? t.darkBg : t.lightBg }}
                  title={t.name}
                />
              ))}
              <div className="flex-1" />
              <Button variant="ghost" size="icon" onClick={toggleDark} className="h-6 w-6 text-sidebar-muted hover:text-sidebar-foreground">
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/login?type=superadmin" })}
            className="w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent h-auto"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            <span>Sign Out</span>
          </Button>
        </div>
      }
    >
      {children}
    </DashboardShell>
  );
}
