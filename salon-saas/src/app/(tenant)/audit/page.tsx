"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BoneyardTable } from "@/components/ui/boneyard";
import { format } from "date-fns";
import { Search, RefreshCw } from "lucide-react";

const actionLabels: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  DEACTIVATE: "Deactivated",
  ROLE_CHANGE: "Role Changed",
  LOGIN: "Logged In",
};

const entityLabels: Record<string, string> = {
  STAFF: "Staff",
  CUSTOMER: "Customer",
  APPOINTMENT: "Appointment",
  SERVICE: "Service",
  BRANCH: "Branch",
  INVOICE: "Invoice",
  SETTINGS: "Settings",
};

const statusColors: Record<string, string> = {
  success: "bg-green-100 text-green-800",
  failure: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
};

export default function AuditLogPage() {
  const [page, setPage] = React.useState(1);
  const [action, setAction] = React.useState("");
  const [entityType, setEntityType] = React.useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", page, action, entityType],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      return fetch(`/api/tenant/audit?${params}`).then(res => res.json());
    },
    staleTime: 15 * 1000,
  });

  const logs = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const pages = data?.data?.pages || 1;

  if (isLoading) return <BoneyardTable rows={8} cols={5} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Trail</h2>
          <p className="text-sm text-muted-foreground">Track all changes made across your salon</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                {Object.entries(actionLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Entities</SelectItem>
                {Object.entries(entityLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">{log.user?.name}</span>
                      <span className="text-muted-foreground ml-1">({log.user?.role})</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {actionLabels[log.action] || log.action}
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      {entityLabels[log.entityType] || log.entityType}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColors[log.status] || "bg-gray-100"}`}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                      {log.description || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                Page {page} of {pages} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
