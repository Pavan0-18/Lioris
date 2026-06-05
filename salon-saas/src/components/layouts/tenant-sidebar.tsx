"use client";
import React from "react";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";
import { DashboardShell, NavItem } from "@/components/layouts/dashboard-shell";
import {
  Home, Calendar, Users, Clock, DollarSign, UserCheck,
  Receipt, Package, Settings, ShoppingCart,
  AlertTriangle, Sparkles, LineChart, Umbrella, TrendingUp, FileText,
  Gift, Tag, QrCode, ClipboardList, List, History, Truck,
} from "lucide-react";

function buildNavItems(lowStockCount: number): NavItem[] {
  const inventoryChildren: NavItem[] = [
    { label: "Dashboard", href: "/inventory/dashboard", icon: TrendingUp, feature: "INVENTORY" },
    { label: "Products", href: "/inventory/products", icon: Package, feature: "INVENTORY" },
    { label: "Low Stock Alerts", href: "/inventory/low-stock", icon: AlertTriangle, feature: "INVENTORY", badge: lowStockCount > 0 ? lowStockCount : undefined },
    { label: "Product Usage", href: "/inventory/product-usage", icon: ClipboardList, feature: "INVENTORY" },
    { label: "Inventory Reports", href: "/inventory/reports", icon: FileText, feature: "INVENTORY" },
  ];

  const procurementChildren: NavItem[] = [
    { label: "Vendors", href: "/procurement/vendors", icon: Truck, feature: "INVENTORY" },
    { label: "Purchases", href: "/procurement/purchases", icon: ShoppingCart, feature: "INVENTORY" },
    { label: "Goods Receipt", href: "/procurement/goods-receipt", icon: Package, feature: "INVENTORY" },
    { label: "Purchase History", href: "/procurement/history", icon: History, feature: "INVENTORY" },
    { label: "Wastage", href: "/inventory/wastage", icon: AlertTriangle, feature: "INVENTORY" },
  ];

  return [
    // ─── Main ─────────────────────────────────────────────────────
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Appointments", href: "/appointments", icon: Calendar, feature: "APPOINTMENTS" },
    { label: "Customers", href: "/customers", icon: UserCheck, feature: "CRM" },
    { label: "Billing", href: "/billing", icon: Receipt, feature: "BILLING" },
    { label: "Reports", href: "/reports", icon: LineChart },

    // ─── Team ────────────────────────────────────────────────────
    { label: "── Team ──", href: "#", icon: Users, section: true },
    { label: "Staff", href: "/staff", icon: Users, feature: "STAFF_MGMT" },
    { label: "Attendance", href: "/staff/attendance", icon: Clock, feature: "ATTENDANCE" },
    { label: "Leaves", href: "/staff/leaves", icon: Umbrella, feature: "STAFF_MGMT" },
    { label: "Payroll", href: "/staff/payroll", icon: DollarSign, feature: "PAYROLL" },
    { label: "Performance", href: "/staff/performance", icon: TrendingUp, feature: "STAFF_MGMT" },

    // ─── Operations ────────────────────────────────────────────────
    { label: "── Operations ──", href: "#", icon: Package, section: true },
    { label: "Inventory", href: "#", icon: Package, feature: "INVENTORY", children: inventoryChildren },
    { label: "Procurement", href: "#", icon: ShoppingCart, feature: "INVENTORY", children: procurementChildren },
    { label: "Audit Trail", href: "/audit", icon: FileText },
    { label: "Waitlist", href: "/waitlist", icon: List },
    { label: "Shift Handovers", href: "/shift-handovers", icon: ClipboardList },
    { label: "Cash Drawer", href: "/cash-drawer", icon: DollarSign },

    // ─── Marketing ──────────────────────────────────────────────────
    { label: "── Marketing ──", href: "#", icon: Gift, section: true },
    { label: "Promotions", href: "/marketing", icon: Tag },
    { label: "Gift Cards", href: "/gift-cards", icon: Gift },
    { label: "Packages", href: "/packages", icon: Package },
    { label: "QR Check-In", href: "/check-in", icon: QrCode },

    // ─── Settings ──────────────────────────────────────────────────
    { label: "── Settings ──", href: "#", icon: Settings, section: true },
    { label: "General", href: "/settings/general", icon: Settings },
    { label: "Branches", href: "/settings/branches", icon: Settings },
    { label: "Services", href: "/settings/services", icon: Settings },
  ];
}

export function TenantDashboardShell({ children }: { children: React.ReactNode }) {
  const { role, name } = useTenant();
  const { data: lowStockData } = useQuery({
    queryKey: ["sidebar-low-stock-count"],
    queryFn: () =>
      fetch("/api/tenant/inventory/low-stock?pageSize=1").then((r) => r.json()),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const lowStockCount = lowStockData?.data?.total ?? 0;
  const navItems = React.useMemo(() => buildNavItems(lowStockCount), [lowStockCount]);

  return (
    <DashboardShell
      navItems={navItems}
      branding={{ icon: <Sparkles className="w-4 h-4 text-primary" />, name: "Lioris" }}
      userProfile={{
        name: name || "User",
        role: role || "TENANT",
        onSignOut: () => signOut({ callbackUrl: "/login" }),
      }}
    >
      {children}
    </DashboardShell>
  );
}
