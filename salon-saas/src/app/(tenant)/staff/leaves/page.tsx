"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { BoneyardTable } from "@/components/ui/boneyard";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function LeaveManagementPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState("pending");
  const [rejectReason, setRejectReason] = React.useState<Record<string, string>>({});

  const { data: leavesData, isLoading } = useQuery({
    queryKey: ["leaves", "all", statusFilter],
    queryFn: () => fetch(`/api/tenant/staff/leaves?status=${statusFilter}`).then(res => res.json()),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/staff/leaves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Leave approved");
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
    onError: () => toast.error("Failed to approve leave"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/tenant/staff/leaves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", rejectionReason: reason }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Leave rejected");
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
    onError: () => toast.error("Failed to reject leave"),
  });

  const leaves = leavesData?.data || [];

  if (isLoading) return <BoneyardTable rows={5} cols={5} />;

  return (
    <FeatureGate feature="STAFF_MGMT">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Leave Management</h2>
            <p className="text-sm text-muted-foreground">Approve or reject staff leave requests.</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                      No leave requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaves.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-semibold text-sm">{l.staffName}</TableCell>
                      <TableCell className="text-xs capitalize">{l.type}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{l.reason}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${statusColors[l.status]}`}>{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {l.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            {rejectReason[l.id] !== undefined && rejectReason[l.id] !== "" ? (
                              <div className="flex items-center gap-1">
                                <Textarea
                                  placeholder="Rejection reason..."
                                  value={rejectReason[l.id] || ""}
                                  onChange={(e) => setRejectReason(p => ({ ...p, [l.id]: e.target.value }))}
                                  className="w-28 h-7 text-[10px]"
                                />
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 h-7"
                                onClick={() => setRejectReason(p => ({ ...p, [l.id]: "" }))}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            )}
                            {rejectReason[l.id] !== undefined ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 h-7"
                                onClick={() => rejectMutation.mutate({ id: l.id, reason: rejectReason[l.id] })}
                                disabled={rejectMutation.isPending}
                              >
                                Confirm
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-500 h-7"
                                onClick={() => approveMutation.mutate(l.id)}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                            )}
                          </div>
                        ) : (
                          l.rejectionReason && (
                            <span className="text-[10px] text-red-500">{l.rejectionReason}</span>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
