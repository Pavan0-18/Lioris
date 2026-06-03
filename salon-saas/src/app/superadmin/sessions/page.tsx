"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BoneyardPage } from "@/components/ui/boneyard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, LogOut, ShieldAlert, Monitor } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface Session {
  id: string; userId: string; userName: string; userEmail: string;
  userRole: string; tenantId: string; ipAddress: string | null;
  userAgent: string | null; lastActiveAt: string | null; createdAt: string;
}

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-sessions"],
    queryFn: () => fetch("/api/superadmin/sessions").then(r => r.json()),
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/superadmin/sessions/${id}`, { method: "DELETE" });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["superadmin-sessions"] }); toast.success("Session terminated"); setConfirmId(null); },
    onError: () => toast.error("Failed to terminate session"),
  });

  if (isLoading) return <BoneyardPage />;

  const sessions: Session[] = data?.data || [];
  const filtered = search
    ? sessions.filter(s =>
        s.userName?.toLowerCase().includes(search.toLowerCase()) ||
        s.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
        s.ipAddress?.includes(search)
      )
    : sessions;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Session Management</h1>
        <p className="text-sm text-muted-foreground">View and manage active user sessions across all tenants.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="ml-auto">{sessions.length} active sessions</Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="w-20">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No sessions found.
                </TableCell>
              </TableRow>
            ) : filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.userName}</div>
                  <div className="text-xs text-muted-foreground">{s.userEmail}</div>
                </TableCell>
                <TableCell className="text-xs font-mono">{s.tenantId?.slice(0, 8)}...</TableCell>
                <TableCell className="text-xs font-mono">{s.ipAddress || "—"}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate" title={s.userAgent || ""}>
                  {s.userAgent ? (
                    <span className="flex items-center gap-1"><Monitor className="h-3 w-3" />{parseUA(s.userAgent)}</span>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-xs">{s.lastActiveAt ? timeAgo(s.lastActiveAt) : "—"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmId(s.id)}
                    title="Force logout"
                  >
                    <LogOut className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Terminate Session</DialogTitle><DialogDescription>This will force logout the user and invalidate their token.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(confirmId!)}>Force Logout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function parseUA(ua: string): string {
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return ua.slice(0, 30);
}

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
