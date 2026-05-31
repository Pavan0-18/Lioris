"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTenant } from "@/hooks/use-tenant";
import { useFeature } from "@/hooks/use-feature";
import { cn } from "@/lib/utils";
import {
  Home,
  Calendar,
  Users,
  Clock,
  DollarSign,
  UserCheck,
  Receipt,
  Package,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  ShoppingCart,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function TenantSidebar() {
  const pathname = usePathname();
  const { role, name } = useTenant();

  const items = [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Appointments", href: "/appointments", icon: Calendar, feature: "APPOINTMENTS" },
    { label: "Staff", href: "/staff", icon: Users, feature: "STAFF_MGMT" },
    { label: "Attendance", href: "/staff/attendance", icon: Clock, feature: "ATTENDANCE" },
    { label: "Payroll", href: "/staff/payroll", icon: DollarSign, feature: "PAYROLL" },
    { label: "Customers", href: "/customers", icon: UserCheck, feature: "CRM" },
    { label: "Billing", href: "/billing", icon: Receipt, feature: "BILLING" },
    { label: "Inventory", href: "/inventory", icon: Package, feature: "INVENTORY" },
    { label: "Procurement", href: "/procurement", icon: ShoppingCart, feature: "INVENTORY" },
    { label: "Wastage", href: "/inventory/wastage", icon: AlertTriangle, feature: "INVENTORY" },
    { label: "Reports", href: "/reports", icon: BarChart2, feature: "ANALYTICS_ADV" },
    { label: "Settings", href: "/settings/general", icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800">
        <div className="p-6">
          <Link href="/dashboard">
            <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              SALON SAAS
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <SidebarNavItems items={items} pathname={pathname} />
        </nav>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-slate-700 text-slate-200">
                {name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate text-slate-200">{name}</span>
              <span className="text-xs truncate text-slate-400">{role}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/login" })} className="text-slate-400 hover:text-slate-200">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <span className="text-lg font-bold tracking-wider text-slate-100">SALON SAAS</span>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-100">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-slate-900 p-0 text-slate-100 border-r border-slate-800">
            <div className="p-6 border-b border-slate-800">
              <span className="text-lg font-bold text-slate-100">Menu</span>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1">
              <SidebarNavItems items={items} pathname={pathname} />
            </nav>
            <div className="p-4 border-t border-slate-800 absolute bottom-0 w-full flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-slate-700 text-slate-200">
                    {name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate">{name}</span>
                  <span className="text-xs truncate text-slate-400">{role}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/login" })} className="text-slate-400 hover:text-slate-200">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function SidebarNavItems({ items, pathname }: { items: any[]; pathname: string }) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

        if (item.feature) {
          return (
            <FeatureGateItem key={item.href} item={item} isActive={isActive} Icon={Icon} />
          );
        }

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
    </>
  );
}

function FeatureGateItem({ item, isActive, Icon }: { item: any; isActive: boolean; Icon: any }) {
  const { hasFeature } = useFeature(item.feature);
  if (!hasFeature) return null;

  return (
    <Link
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
}
