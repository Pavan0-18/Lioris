"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Home, Layers, ShieldCheck, DollarSign, Users, Activity, ClipboardList, Settings as SettingsIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuperAdminSidebar() {
  const pathname = usePathname();

  const items = [
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

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800">
      <div className="p-6">
        <Link href="/superadmin/dashboard">
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-pink-400 to-indigo-400 bg-clip-text text-transparent">
            SUPER ADMIN
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: "/login?type=superadmin" })}
          className="w-full justify-start text-slate-400 hover:text-slate-200"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
