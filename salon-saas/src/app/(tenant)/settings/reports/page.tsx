"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Play, Loader2 } from "lucide-react";
import { AGGREGATIONS } from "@/lib/reports/engine";

export default function SettingsReportsPage() {
  const queryClient = useQueryClient();

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/reports");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });

  const { data: entitiesData } = useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/entities");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });

  const reports: any[] = reportsData?.data ?? [];

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [entityId, setEntityId] = React.useState("");
  const [metrics, setMetrics] = React.useState<any[]>([{ field: "", aggregation: "count", label: "" }]);
  const [groupBy, setGroupBy] = React.useState<any[]>([]);
  const [dateField, setDateField] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const [runId, setRunId] = React.useState<string | null>(null);

  const entity = (entitiesData?.data ?? []).find((e: any) => e.id === entityId);
  const entityFields = entity?.fields ?? [];

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setEntityId("");
    setMetrics([{ field: "", aggregation: "count", label: "" }]);
    setGroupBy([]);
    setDateField("");
    setFrom("");
    setTo("");
    setOpen(true);
  };

  const openEdit = (report: any) => {
    const config = report.config ?? {};
    setEditing(report);
    setName(report.name);
    setDescription(report.description ?? "");
    setEntityId(report.entityId);
    setMetrics(config.metrics?.length ? config.metrics : [{ field: "", aggregation: "count", label: "" }]);
    setGroupBy(config.groupBy ?? []);
    setDateField(config.dateRange?.field ?? "");
    setFrom(config.dateRange?.from ?? "");
    setTo(config.dateRange?.to ?? "");
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const config: Record<string, any> = {
        metrics: metrics.filter((m) => m.field || m.aggregation === "count").map((m) => ({
          field: m.field,
          aggregation: m.aggregation,
          label: m.label || undefined,
        })),
      };
      if (groupBy.length) config.groupBy = groupBy.filter((g) => g.field).map((g) => ({ field: g.field, label: g.label || undefined }));
      if (dateField) config.dateRange = { field: dateField, from: from || undefined, to: to || undefined };
      const url = editing ? `/api/tenant/reports/${editing.id}` : "/api/tenant/reports";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, entityKey: (entitiesData?.data ?? []).find((e: any) => e.id === entityId)?.key, config }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success(editing ? "Report updated" : "Report created");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/reports/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Report deleted");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: runData, isFetching: runLoading, refetch: runRefetch } = useQuery({
    queryKey: ["report-run", runId],
    queryFn: async () => {
      if (!runId) return null;
      const res = await fetch(`/api/tenant/reports/${runId}/run`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    enabled: !!runId,
  });

  if (isLoading) return <BoneyardPage />;

  const run = runData?.result;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Report Builder</h2>
          <p className="text-sm text-muted-foreground">Aggregate, group and filter your entity records into business reports.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New report</Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No reports yet. Create one to analyze your business data.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Metrics</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report: any) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="font-medium">{report.name}</div>
                      {report.description && <div className="text-xs text-muted-foreground">{report.description}</div>}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const name = (entitiesData?.data ?? []).find((e: any) => e.id === report.entityId)?.name;
                        return name ?? report.entityId;
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{(report.config?.metrics ?? []).length} metrics</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.isActive ? "default" : "secondary"}>{report.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setRunId(report.id)}><Play className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(report)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(report.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {run && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Result · {run.report.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => runRefetch()} disabled={runLoading}>
                  <Loader2 className={`w-4 h-4 mr-1 ${runLoading ? "animate-spin" : ""}`} /> Re-run
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRunId(null)}>Close</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 text-sm">
              <Badge variant="secondary">{run.recordCount} records</Badge>
              <Badge variant="secondary">{run.groups.length} groups</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {run.columns.map((c: string) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                  <TableHead className="text-right">Records</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.groups.map((g: any) => (
                  <TableRow key={g.key}>
                    {run.columns.map((c: string) => (
                      <TableCell key={c}>
                        {g.values[c] !== undefined ? (
                          <span className="font-medium">{Number.isInteger(g.values[c]) ? g.values[c] : Number(g.values[c]).toFixed(2)}</span>
                        ) : g.label}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-muted-foreground">{g.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {run.groups.length > 0 && (
              <div className="text-sm text-muted-foreground flex gap-6">
                {Object.entries(run.total).map(([column, value]) => (
                  <span key={column}>Total {column}: <strong className="text-foreground">{Number.isInteger(value) ? (value as number) : Number(Number(value).toFixed(2))}</strong></span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit report" : "New report"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Report name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Revenue by vehicle type" />
              </div>
              <div className="space-y-1.5">
                <Label>Entity</Label>
                <Select value={entityId} onValueChange={setEntityId}>
                  <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                  <SelectContent>
                    {(entitiesData?.data ?? []).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>

            <div className="space-y-2">
              <Label>Metrics</Label>
              {metrics.map((metric, mi) => (
                <div key={mi} className="flex items-center gap-2">
                  <Select
                    value={metric.aggregation}
                    onValueChange={(aggregation) => {
                      const next = [...metrics];
                      next[mi] = { ...metric, aggregation };
                      setMetrics(next);
                    }}
                  >
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AGGREGATIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {metric.aggregation !== "count" && (
                    <Select
                      value={metric.field}
                      onValueChange={(field) => {
                        const next = [...metrics];
                        next[mi] = { ...metric, field };
                        setMetrics(next);
                      }}
                    >
                      <SelectTrigger className="w-40"><SelectValue placeholder="Field" /></SelectTrigger>
                      <SelectContent>
                        {entityFields.map((f: any) => (
                          <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    className="w-40"
                    value={metric.label ?? ""}
                    onChange={(e) => {
                      const next = [...metrics];
                      next[mi] = { ...metric, label: e.target.value };
                      setMetrics(next);
                    }}
                    placeholder="Label (optional)"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMetrics(metrics.filter((_, i) => i !== mi))}
                    disabled={metrics.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setMetrics([...metrics, { field: "", aggregation: "count", label: "" }])}>
                <Plus className="w-4 h-4 mr-1" /> Metric
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Group by</Label>
              {groupBy.map((group, gi) => (
                <div key={gi} className="flex items-center gap-2">
                  <Select
                    value={group.field}
                    onValueChange={(field) => {
                      const next = [...groupBy];
                      next[gi] = { ...group, field };
                      setGroupBy(next);
                    }}
                  >
                    <SelectTrigger className="w-40"><SelectValue placeholder="Field" /></SelectTrigger>
                    <SelectContent>
                      {entityFields.map((f: any) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-40"
                    value={group.label ?? ""}
                    onChange={(e) => {
                      const next = [...groupBy];
                      next[gi] = { ...group, label: e.target.value };
                      setGroupBy(next);
                    }}
                    placeholder="Label (optional)"
                  />
                  <Button size="sm" variant="ghost" onClick={() => setGroupBy(groupBy.filter((_, i) => i !== gi))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setGroupBy([...groupBy, { field: "", label: "" }])}
                disabled={groupBy.length >= 4}
              >
                <Plus className="w-4 h-4 mr-1" /> Group
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Date range filter (optional)</Label>
              <div className="flex items-center gap-2">
                <Select value={dateField} onValueChange={setDateField}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Date field" /></SelectTrigger>
                  <SelectContent>
                    {entityFields.filter((f: any) => ["date", "datetime", "timestamp"].includes(f.type)).map((f: any) => (
                      <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <span className="text-muted-foreground text-sm">to</span>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!name || !entityId || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}