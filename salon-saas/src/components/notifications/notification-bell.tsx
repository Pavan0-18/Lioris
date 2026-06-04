"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export function NotificationBell() {
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () => fetch("/api/tenant/notifications/unread-count").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const { data: recentData } = useQuery({
    queryKey: ["notifications-recent"],
    queryFn: () => fetch("/api/tenant/notifications?unread=true").then((r) => r.json()),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tenant/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-recent"] });
    },
  });

  const unreadCount = countData?.data?.count || 0;
  const notifications = recentData?.data || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center text-[10px] font-bold text-white bg-destructive rounded-full px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-medium">Notifications</span>
          <Link href="/settings/notifications" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No new notifications
            </div>
          ) : (
            notifications.slice(0, 10).map((n: any) => (
              <DropdownMenuItem
                key={n.id}
                className="flex flex-col items-start px-3 py-2.5 cursor-pointer"
                onClick={() => markReadMutation.mutate(n.id)}
              >
                <div className="flex items-start gap-2.5 w-full">
                  <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.isRead ? "bg-transparent" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground/70 line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {format(new Date(n.createdAt), "PPp")}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <div className="border-t border-border px-3 py-2">
          <Link href="/settings/notifications" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Go to Notification Center
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
