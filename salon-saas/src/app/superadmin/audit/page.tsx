"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const actionLabels: Record<string, { label: string; color: "default" | "destructive" | "outline" | "secondary" }> = {
  create_tenant: { label: "Create Tenant", color: "default" },
  suspend: { label: "Suspend", color: "destructive" },
  activate: { label: "Activate", color: "default" },
  change_plan: { label: "Change Plan", color: "secondary" },
  toggle_feature: { label: "Toggle Feature", color: "outline" },
  create_user: { label: "Create User", color: "secondary" },
};

export default function SuperadminAuditPage() {
  const { data } = useQuery({
    queryKey: ["superadmin-audit"],
    queryFn: () => fetch("/api/superadmin/audit").then(res => res.json()),
    refetchInterval: 15000,
  });

  const logs = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Trail</h2>
        <p className="text-sm text-muted-foreground">Track all super admin actions across the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-xs text-muted-foreground">
                    No audit logs recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log: any) => {
                  const actionDef = actionLabels[log.action] || { label: log.action, color: "outline" as const };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{log.adminName || "Unknown"}</TableCell>
                      <TableCell>
                        <Badge variant={actionDef.color}>{actionDef.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.changes ? JSON.stringify(log.changes) : log.entityType + " " + log.entityId.slice(0, 8)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
