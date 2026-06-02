"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useBeautyTheme } from "@/hooks/useBeautyTheme";
import { useFeature } from "@/hooks/use-feature";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Moon, Sun, Menu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: string;
  section?: boolean;
}

interface DashboardShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  branding: {
    icon: React.ReactNode;
    name: string;
  };
  footer?: React.ReactNode;
  userProfile?: {
    name: string;
    role: string;
    avatar?: string;
    onSignOut: () => void;
  };
}

function SidebarLink({
  item,
  isActive,
  Icon,
}: {
  item: NavItem;
  isActive: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
        isActive
          ? "bg-primary/15 text-primary shadow-sm"
          : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
    >
      <Icon
        className={cn(
          "w-4.5 h-4.5 shrink-0 transition-all duration-200",
          isActive
            ? "text-primary"
            : "text-sidebar-muted group-hover:text-sidebar-foreground"
        )}
      />
      <span>{item.label}</span>
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
      )}
    </Link>
  );
}

function FeatureGateSidebarLink({
  item,
  isActive,
  Icon,
}: {
  item: NavItem;
  isActive: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const { hasFeature } = useFeature(item.feature!);
  if (!hasFeature) return null;
  return <SidebarLink item={item} isActive={isActive} Icon={Icon} />;
}

function SidebarContent({
  navItems,
  pathname,
  branding,
  footer,
  userProfile,
}: {
  navItems: NavItem[];
  pathname: string;
  branding: { icon: React.ReactNode; name: string };
  footer?: React.ReactNode;
  userProfile?: DashboardShellProps["userProfile"];
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border shrink-0">
        <Link
          href={navItems[0]?.href || "/"}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            {branding.icon}
          </div>
          <span className="font-playfair text-lg font-bold tracking-wide text-sidebar-foreground">
            {branding.name}
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          if (item.section) {
            return (
              <div key={item.href} className="px-3 pt-4 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-muted/60">
                  {item.label.replace(/──/g, "").trim()}
                </span>
              </div>
            );
          }
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          if (item.feature) {
            return (
              <FeatureGateSidebarLink
                key={item.href}
                item={item}
                isActive={isActive}
                Icon={Icon}
              />
            );
          }
          return <SidebarLink key={item.href} item={item} isActive={isActive} Icon={Icon} />;
        })}
      </nav>

      {userProfile ? (
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/50">
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                {userProfile.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold truncate text-sidebar-foreground">
                {userProfile.name}
              </span>
              <span className="text-xs truncate text-sidebar-muted capitalize">
                {userProfile.role.toLowerCase()}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 shrink-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {}}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={userProfile.onSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : footer ? (
        <div className="p-3 border-t border-sidebar-border shrink-0">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardShell({
  children,
  navItems,
  branding,
  footer,
  userProfile,
}: DashboardShellProps) {
  const pathname = usePathname();
  const { isDark, toggleDark } = useBeautyTheme();

  const sidebar = (
    <SidebarContent
      navItems={navItems}
      pathname={pathname}
      branding={branding}
      footer={footer}
      userProfile={userProfile}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3.5 bg-sidebar border-b border-sidebar-border">
        <Link href={navItems[0]?.href || "/"} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            {branding.icon}
          </div>
          <span className="font-playfair text-base font-bold text-sidebar-foreground">
            {branding.name}
          </span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 bg-sidebar p-0 text-sidebar-foreground border-r border-sidebar-border"
          >
            {sidebar}
          </SheetContent>
        </Sheet>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex items-center justify-end gap-3 px-6 py-3 bg-header-bg border-b border-border/60 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDark}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <NotificationBell />
        </header>

        {/* Mobile top actions */}
        <div className="md:hidden flex items-center justify-end gap-2 px-4 py-2 bg-header-bg border-b border-border/60 mt-[57px] shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDark}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <NotificationBell />
        </div>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
