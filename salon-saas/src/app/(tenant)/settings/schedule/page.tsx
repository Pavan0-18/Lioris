"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SettingsSchedulePage() {
  const queryClient = useQueryClient();

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ["schedule-rules"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/schedule-rules");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });

  const { data: staffData } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/staff");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });

  const rules: any[] = rulesData?.data ?? [];
  const staff: any[] = staffData?.data ?? [];

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [staffId, setStaffId] = React.useState("");
  const [dayOfWeek, setDayOfWeek] = React.useState("1");
  const [isWorking, setIsWorking] = React.useState(true);
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("17:00");
  const [bufferMinutes, setBufferMinutes] = React.useState("15");
  const [maxConcurrent, setMaxConcurrent] = React.useState("1");

  const openCreate = () => {
    setEditing(null);
    setStaffId(staff[0]?.id ?? "");
    setDayOfWeek("1");
    setIsWorking(true);
    setStartTime("09:00");
    setEndTime("17:00");
    setBufferMinutes("15");
    setMaxConcurrent("1");
    setOpen(true);
  };

  const openEdit = (rule: any) => {
    setEditing(rule);
    setStaffId(rule.staffId);
    setDayOfWeek(String(rule.dayOfWeek));
    setIsWorking(rule.isWorking);
    setStartTime(rule.startTime ?? "09:00");
    setEndTime(rule.endTime ?? "17:00");
    setBufferMinutes(String(rule.bufferMinutes ?? 0));
    setMaxConcurrent(String(rule.maxConcurrent ?? 1));
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        staffId,
        dayOfWeek: Number(dayOfWeek),
        isWorking,
        startTime: isWorking ? startTime : null,
        endTime: isWorking ? endTime : null,
        bufferMinutes: Number(bufferMinutes) || 0,
        maxConcurrent: Number(maxConcurrent) || 1,
      };
      const url = editing ? `/api/tenant/schedule-rules/${editing.id}` : "/api/tenant/schedule-rules";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success(editing ? "Rule updated" : "Rule created");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["schedule-rules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/schedule-rules/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Rule deleted");
      queryClient.invalidateQueries({ queryKey: ["schedule-rules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <BoneyardPage />;

  const staffName = (id: string) => {
    const member = staff.find((s) => s.id === id);
    return member ? (member.name ?? member.fullName ?? member.email ?? id) : id;
  };

  const byStaff = new Map<string, any[]>();
  for (const rule of rules) {
    if (!byStaff.has(rule.staffId)) byStaff.set(rule.staffId, []);
    byStaff.get(rule.staffId)!.push(rule);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schedule Rules</h2>
          <p className="text-sm text-muted-foreground">
            Define weekly working hours, buffers and concurrency limits per staff member.
          </p>
        </div>
        <Button onClick={openCreate} disabled={staff.length === 0}>
          <Plus className="w-4 h-4 mr-1" /> New rule
        </Button>
      </div>

      {staff.length === 0 && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No staff members found. Add staff before creating schedule rules.
          </CardContent>
        </Card>
      )}

      {rules.length === 0 && staff.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No schedule rules yet. Add one to define a team member's working week.
          </CardContent>
        </Card>
      ) : (
        [...byStaff.entries()].map(([staffMemberId, memberRules]) => (
          <Card key={staffMemberId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" /> {staffName(staffMemberId)}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {memberRules.map((rule) => (
                <div key={rule.id} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant={rule.isWorking ? "default" : "secondary"}>
                      {DAY_LABELS[rule.dayOfWeek] ?? rule.dayOfWeek}
                    </Badge>
                    <div className="flex gap-0.5">
                      <Button size="sm" variant="ghost" className="h-6 w-6" onClick={() => openEdit(rule)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6" onClick={() => deleteMutation.mutate(rule.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {rule.isWorking ? (
                    <>
                      <div className="text-sm font-medium">
                        {rule.startTime} – {rule.endTime}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>Buffer: {rule.bufferMinutes} min</div>
                        <div>Max concurrent: {rule.maxConcurrent}</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Day off</div>
                  )}
                  {rule.notes && <div className="text-xs text-muted-foreground truncate">{rule.notes}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit rule" : "New schedule rule"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Staff member</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name ?? s.fullName ?? s.email ?? s.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Day</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_LABELS.map((label, i) => (
                      <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center gap-2">
                  <Switch checked={isWorking} onCheckedChange={setIsWorking} />
                  <Label>Working day</Label>
                </div>
              </div>
            </div>
            {isWorking && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Start time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>End time</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Buffer (minutes)</Label>
                <Input type="number" min={0} max={1440} value={bufferMinutes} onChange={(e) => setBufferMinutes(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Max concurrent</Label>
                <Input type="number" min={1} max={50} value={maxConcurrent} onChange={(e) => setMaxConcurrent(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!staffId || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}