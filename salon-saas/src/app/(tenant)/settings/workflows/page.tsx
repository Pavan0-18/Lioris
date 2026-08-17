"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Workflow, Loader2, Play, RefreshCw } from "lucide-react";

const TRIGGERS = [
  { value: "record.created", label: "Record Created" },
  { value: "record.updated", label: "Record Updated" },
  { value: "status.changed", label: "Status Changed" },
  { value: "scheduled", label: "Scheduled (coming soon)" },
];

const ACTION_TYPES = [
  { value: "send_notification", label: "Send In-App Notification" },
  { value: "send_email", label: "Send Email" },
  { value: "create_record", label: "Create Record" },
  { value: "update_record", label: "Update Record" },
  { value: "webhook", label: "Call Webhook" },
];

const ACTION_EXAMPLES: Record<string, string> = {
  send_notification: `{
  "title": "Appointment confirmed",
  "message": "Customer {{customerName}} booked at {{startTime}}",
  "roles": ["OWNER", "MANAGER"]
}`,
  send_email: `{
  "to": "{{email}}",
  "subject": "Your booking is confirmed",
  "body": "<p>Hi {{customerName}}, see you soon!</p>"
}`,
  create_record: `{
  "entityKey": "tasks",
  "values": {
    "title": "Follow up with {{customerName}}",
    "dueDate": "2026-01-01"
  }
}`,
  update_record: `{
  "recordId": "{{id}}",
  "values": {
    "priority": "high"
  }
}`,
  webhook: `{
  "url": "https://example.com/hooks/lioris",
  "method": "POST",
  "headers": { "Authorization": "Bearer ..." }
}`,
};

export default function SettingsWorkflowsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [showRuns, setShowRuns] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => fetch("/api/tenant/workflows").then((res) => res.json()),
    staleTime: 30 * 1000,
  });

  const { data: entitiesData } = useQuery({
    queryKey: ["entities"],
    queryFn: () => fetch("/api/tenant/entities").then((res) => res.json()),
    staleTime: 60 * 1000,
  });

  const { data: runsData } = useQuery({
    queryKey: ["workflow-runs"],
    queryFn: () => fetch("/api/tenant/workflows/runs?limit=20").then((res) => res.json()),
    enabled: showRuns,
    staleTime: 15 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: any) => {
      const res = await fetch(`/api/tenant/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/workflows/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Workflow deleted");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <BoneyardPage />;

  const workflows = data?.data || [];
  const entities = entitiesData?.data || [];
  const runs = runsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workflows & Automations</h2>
          <p className="text-sm text-muted-foreground">
            Automate your business: when something happens, run actions — notify, email, create records, call webhooks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRuns(!showRuns)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Run Log
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Automation
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {workflows.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Workflow className="w-8 h-8 mx-auto mb-3 opacity-50" />
              No automations yet. Create one — e.g. "When an appointment is completed, notify the customer."
            </CardContent>
          </Card>
        )}

        {workflows.map((wf: any) => (
          <Card key={wf.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">{wf.name}</CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">{wf.key}</Badge>
                  {wf.isActive ? <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Active</Badge> : <Badge variant="secondary">Paused</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={wf.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: wf.id, isActive: checked })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(wf); setDialogOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => { if (confirm(`Delete automation "${wf.name}"?`)) deleteMutation.mutate(wf.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {wf.entityKey ? `Entity: ${wf.entityKey}` : "Any entity"} · Trigger: {wf.triggerType} · {wf.actions?.length ?? 0} action(s) · {wf.runCount} runs
                {wf.lastRunAt ? ` · Last run: ${new Date(wf.lastRunAt).toLocaleString()}` : ""}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {showRuns && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Play className="w-4 h-4" /> Recent Runs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No runs yet</TableCell></TableRow>
                )}
                {runs.map((run: any) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.workflowName ?? run.workflowId.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{run.eventType}{run.entityKey ? ` · ${run.entityKey}` : ""}</TableCell>
                    <TableCell>
                      <Badge variant={run.status === "success" ? "default" : run.status === "skipped" ? "secondary" : "destructive"} className="text-xs">
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{run.actionsExecuted}</TableCell>
                    <TableCell className="text-xs">{run.durationMs}ms</TableCell>
                    <TableCell className="text-xs">{new Date(run.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <WorkflowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        entities={entities}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["workflows"] });
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function WorkflowDialog({ open, onOpenChange, editing, entities, onSaved }: any) {
  const [name, setName] = React.useState("");
  const [key, setKey] = React.useState("");
  const [entityKey, setEntityKey] = React.useState("");
  const [triggerType, setTriggerType] = React.useState("record.created");
  const [statusFrom, setStatusFrom] = React.useState("");
  const [statusTo, setStatusTo] = React.useState("");
  const [changedFields, setChangedFields] = React.useState("");
  const [conditions, setConditions] = React.useState("");
  const [actions, setActions] = React.useState<any[]>([{ type: "send_notification", configText: ACTION_EXAMPLES.send_notification }]);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setKey(editing?.key ?? "");
    setEntityKey(editing?.entityKey ?? "");
    setTriggerType(editing?.triggerType ?? "record.created");
    setStatusFrom(editing?.triggerConfig?.from ?? "");
    setStatusTo(editing?.triggerConfig?.to ?? "");
    setChangedFields((editing?.triggerConfig?.fields ?? []).join(", "));
    setConditions(editing?.conditions ? JSON.stringify(editing.conditions, null, 2) : "");
    setActions(
      (editing?.actions ?? [{ type: "send_notification", config: {} }]).map((a: any) => ({
        type: a.type,
        configText: JSON.stringify(a.config, null, 2),
      }))
    );
  }, [open, editing]);

  const autoKey = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const save = async () => {
    setPending(true);
    try {
      let parsedConditions = null;
      if (conditions.trim()) {
        try {
          parsedConditions = JSON.parse(conditions);
        } catch {
          toast.error("Conditions must be valid JSON");
          setPending(false);
          return;
        }
      }

      const parsedActions = actions.map((a: any) => {
        try {
          return { type: a.type, config: JSON.parse(a.configText || "{}") };
        } catch {
          throw new Error(`Invalid JSON in action: ${a.type}`);
        }
      });

      const triggerConfig: Record<string, any> = {};
      if (triggerType === "status.changed") {
        triggerConfig.statusField = "status";
        if (statusFrom) triggerConfig.from = statusFrom;
        if (statusTo) triggerConfig.to = statusTo;
      }
      if (triggerType === "record.updated") {
        triggerConfig.fields = changedFields.split(",").map((f: string) => f.trim()).filter(Boolean);
      }

      const payload = {
        name,
        ...(editing ? {} : { key: key || autoKey(name) }),
        entityKey: entityKey || null,
        triggerType,
        triggerConfig,
        conditions: parsedConditions,
        actions: parsedActions,
      };

      const res = await fetch(editing ? `/api/tenant/workflows/${editing.id}` : "/api/tenant/workflows", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(editing ? "Automation updated" : "Automation created");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save automation");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit: ${editing.name}` : "New Automation"}</DialogTitle>
          <DialogDescription>
            When the trigger fires and conditions match, all actions run. Use {"{{fieldKey}}"} to inject record values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); if (!editing && !key) setKey(autoKey(e.target.value)); }} placeholder="e.g. Confirm booking reminder" />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label>Key</Label>
                <Input value={key} onChange={(e) => setKey(autoKey(e.target.value))} className="font-mono" />
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entity (optional — empty means any)</Label>
              <Select value={entityKey} onValueChange={setEntityKey}>
                <SelectTrigger><SelectValue placeholder="Any entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any entity</SelectItem>
                  <SelectItem value="appointment">appointment</SelectItem>
                  <SelectItem value="invoice">invoice</SelectItem>
                  {entities.map((e: any) => (
                    <SelectItem key={e.key} value={e.key}>{e.key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t.value} value={t.value} disabled={t.value === "scheduled"}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {triggerType === "status.changed" && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-3">
              <div className="space-y-2">
                <Label>From status (optional)</Label>
                <Input value={statusFrom} onChange={(e) => setStatusFrom(e.target.value)} placeholder="e.g. confirmed" />
              </div>
              <div className="space-y-2">
                <Label>To status (optional)</Label>
                <Input value={statusTo} onChange={(e) => setStatusTo(e.target.value)} placeholder="e.g. completed" />
              </div>
            </div>
          )}

          {triggerType === "record.updated" && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label>Only fire when these fields change (comma separated, empty = any)</Label>
              <Input value={changedFields} onChange={(e) => setChangedFields(e.target.value)} placeholder="status, priority" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Conditions (JSON, optional)</Label>
            <Textarea
              className="font-mono text-xs min-h-[80px]"
              placeholder={'{"all": [{"field": "status", "operator": "eq", "value": "completed"}]}'}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Operators: eq, neq, gt, gte, lt, lte, contains, starts_with, ends_with, in, not_in, is_empty, is_not_empty, changed, changed_to, changed_from
            </p>
          </div>

          <div className="space-y-3">
            <Label>Actions</Label>
            {actions.map((action: any, idx: number) => (
              <div key={idx} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Select value={action.type} onValueChange={(t) => {
                    const next = [...actions];
                    next[idx] = { type: t, configText: ACTION_EXAMPLES[t] ?? "{}" };
                    setActions(next);
                  }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive shrink-0"
                    disabled={actions.length === 1}
                    onClick={() => setActions(actions.filter((_: any, i: number) => i !== idx))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Textarea
                  className="font-mono text-xs min-h-[90px]"
                  value={action.configText}
                  onChange={(e) => {
                    const next = [...actions];
                    next[idx] = { ...action, configText: e.target.value };
                    setActions(next);
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActions([...actions, { type: "send_notification", configText: ACTION_EXAMPLES.send_notification }])}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Action
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={pending || !name}>
            {pending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {editing ? "Save Changes" : "Create Automation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}