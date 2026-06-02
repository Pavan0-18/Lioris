"use client";
import React from "react";
import { signOut } from "next-auth/react";
import { DashboardShell, NavItem } from "@/components/layouts/dashboard-shell";
import {
  Home, Layers, ShieldCheck, DollarSign, Users, Activity,
  ClipboardList, Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const superadminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/superadmin/dashboard", icon: Home },
  { label: "Tenants", href: "/superadmin/tenants", icon: Layers },
  { label: "Users", href: "/superadmin/users", icon: Users },
  { label: "Analytics", href: "/superadmin/analytics", icon: Activity },
  { label: "Audit Log", href: "/superadmin/audit", icon: ClipboardList },
  { label: "Bulk Ops", href: "/superadmin/bulk", icon: ShieldCheck },
  { label: "Features", href: "/superadmin/features", icon: DollarSign },
  { label: "Plans", href: "/superadmin/plans", icon: Layers },
  { label: "Config", href: "/superadmin/config", icon: SettingsIcon },
];

export function SuperAdminDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      navItems={superadminNavItems}
      branding={{ icon: <ShieldCheck className="w-4 h-4 text-primary" />, name: "Admin" }}
      footer={
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: "/login?type=superadmin" })}
          className="w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent h-auto"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          <span>Sign Out</span>
        </Button>
      }
    >
      {children}
    </DashboardShell>
  );
}
