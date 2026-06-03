"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

interface LeaveRequestsProps {
  staffId: string;
  staffName: string;
}

export function LeaveRequests({ staffId, staffName }: LeaveRequestsProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({
    startDate: "",
    endDate: "",
    type: "annual",
    reason: "",
  });

  const { data: leavesData } = useQuery({
    queryKey: ["leaves", staffId],
    queryFn: () => fetch(`/api/tenant/staff/leaves?staffId=${staffId}`).then(res => res.json()),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/staff/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Leave request submitted");
      queryClient.invalidateQueries({ queryKey: ["leaves", staffId] });
      setShowForm(false);
      setForm({ startDate: "", endDate: "", type: "annual", reason: "" });
    },
    onError: () => toast.error("Failed to submit leave request"),
  });

  const leaves = leavesData?.data || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Leave Requests — {staffName}</span>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "Request Leave"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Leave Type</Label>
                <Select value={form.type} onValueChange={(val) => setForm(p => ({ ...p, type: val }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason</Label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))}
                  className="min-h-[60px] text-xs"
                />
              </div>
              <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                Submit Request
              </Button>
            </div>
          )}

          {leaves.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No leave requests found.</p>
          ) : (
            <div className="space-y-2">
              {leaves.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold capitalize">{l.type}</span>
                      <Badge className={`text-[10px] ${statusColors[l.status]}`}>{l.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{l.reason}</p>
                    {l.rejectionReason && (
                      <p className="text-xs text-red-500">Rejected: {l.rejectionReason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
