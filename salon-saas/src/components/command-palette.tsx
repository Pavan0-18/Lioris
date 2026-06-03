"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import {
  Home, Calendar, Users, Clock, DollarSign, UserCheck,
  Receipt, Package, Settings, Umbrella, TrendingUp, BarChart3,
  User, FileText, Search,
} from "lucide-react";

const staticItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Appointments", href: "/appointments", icon: Calendar },
  { label: "Customers", href: "/customers", icon: UserCheck },
  { label: "Billing", href: "/billing", icon: Receipt },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Staff", href: "/staff", icon: Users },
  { label: "Attendance", href: "/staff/attendance", icon: Clock },
  { label: "Leaves", href: "/staff/leaves", icon: Umbrella },
  { label: "Payroll", href: "/staff/payroll", icon: DollarSign },
  { label: "Performance", href: "/staff/performance", icon: TrendingUp },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Settings", href: "/settings/general", icon: Settings },
  { label: "My Profile", href: "/profile", icon: User },
  { label: "Audit Trail", href: "/audit", icon: FileText },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: staffData } = useQuery({
    queryKey: ["staff-search-cmd"],
    queryFn: () => fetch("/api/tenant/staff?limit=20").then(res => res.json()),
    enabled: open,
  });

  const { data: customerData } = useQuery({
    queryKey: ["customers-search-cmd"],
    queryFn: () => fetch("/api/tenant/customers?limit=20").then(res => res.json()),
    enabled: open,
  });

  const staffList = staffData?.data || [];
  const customerList = customerData?.data || [];

  const q = query.toLowerCase();

  const filteredPages = staticItems.filter(i => i.label.toLowerCase().includes(q));
  const filteredStaff = staffList.filter((s: any) => s.name?.toLowerCase().includes(q)).slice(0, 5);
  const filteredCustomers = customerList.filter((c: any) => c.name?.toLowerCase().includes(q)).slice(0, 5);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg top-[15%] p-0 gap-0">
        <div className="flex items-center border-b px-3">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, staff, customers..."
            className="border-0 focus-visible:ring-0 shadow-none h-11"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {!query && (
            <>
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Navigation
              </div>
              {filteredPages.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => handleSelect(item.href)}
                    className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </>
          )}

          {query && filteredPages.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Pages
              </div>
              {filteredPages.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => handleSelect(item.href)}
                    className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </>
          )}

          {query && filteredStaff.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-t pt-3 mt-1">
                Staff
              </div>
              {filteredStaff.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => handleSelect(`/staff/${s.id}`)}
                  className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{s.designation || "Staff"}</span>
                </button>
              ))}
            </>
          )}

          {query && filteredCustomers.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-t pt-3 mt-1">
                Customers
              </div>
              {filteredCustomers.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(`/customers/${c.id}`)}
                  className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <span>{c.name}</span>
                </button>
              ))}
            </>
          )}

          {query && filteredPages.length === 0 && filteredStaff.length === 0 && filteredCustomers.length === 0 && (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          )}
        </div>
        <div className="border-t px-3 py-2 text-[10px] text-muted-foreground flex items-center gap-4">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
