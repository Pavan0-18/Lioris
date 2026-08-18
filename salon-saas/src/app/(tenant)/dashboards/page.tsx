"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw, LayoutDashboard, TrendingUp, Hash, List } from "lucide-react";

const WIDGET_LABELS: Record<string, string> = {
  count: "Count",
  metric: "Metric (sum/avg/min/max)",
  recent: "Recent records",
  bar: "Bar chart",
  line: "Line chart",
  pie: "Pie chart",
};

export default function DashboardsPage() {
  const queryClient = useQueryClient();

  const { data: dashboardsData, isLoading } = useQuery({
    queryKey: ["dashboards"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/dashboards");
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

  const dashboards: any[] = dashboardsData?.data ?? [];
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const active = dashboards.find((d) => d.id === activeId) ?? dashboards.find((d) => d.isDefault) ?? dashboards[0];

  const { data: dashboardData, isFetching, refetch } = useQuery({
    queryKey: ["dashboard-data", active?.id],
    queryFn: async () => {
      if (!active?.id) return null;
      const res = await fetch(`/api/tenant/dashboards/${active.id}/data`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    enabled: !!active?.id,
  });

  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: (json) => {
      toast.success("Dashboard created");
      setCreateOpen(false);
      setNewName("");
      setActiveId(json.data.id);
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/dashboards/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Dashboard deleted");
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [widgetOpen, setWidgetOpen] = React.useState(false);
  const [widgetTitle, setWidgetTitle] = React.useState("");
  const [widgetType, setWidgetType] = React.useState("count");
  const [widgetEntity, setWidgetEntity] = React.useState("");
  const [widgetField, setWidgetField] = React.useState("");
  const [widgetAgg, setWidgetAgg] = React.useState("count");

  const addWidgetMutation = useMutation({
    mutationFn: async () => {
      const config: Record<string, any> = {};
      if (widgetField) config.field = widgetField;
      if (widgetType !== "count") config.aggregation = widgetAgg;
      if (widgetType === "recent") config.limit = 10;
      const res = await fetch(`/api/tenant/dashboards/${active.id}/widgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: widgetTitle,
          type: widgetType,
          entityId: widgetEntity || null,
          config,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Widget added");
      setWidgetOpen(false);
      setWidgetTitle("");
      setWidgetField("");
      setWidgetAgg("count");
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeWidgetMutation = useMutation({
    mutationFn: async (widgetId: string) => {
      const res = await fetch(`/api/tenant/dashboards/${active.id}/widgets/${widgetId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Widget removed");
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <BoneyardPage />;

  const activeEntityId = widgetEntity;
  const activeEntity = (entitiesData?.data ?? []).find((e: any) => e.id === activeEntityId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboards</h2>
          <p className="text-sm text-muted-foreground">Monitor your business with custom widget grids.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setWidgetOpen(true)} disabled={!active}>
            <Plus className="w-4 h-4 mr-1" /> Widget
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <LayoutDashboard className="w-4 h-4 mr-1" /> New dashboard
          </Button>
        </div>
      </div>

      {dashboards.length > 0 && (
        <Tabs value={active?.id ?? ""} onValueChange={setActiveId}>
          <TabsList className="flex-wrap">
            {dashboards.map((d) => (
              <TabsTrigger key={d.id} value={d.id} className="gap-1">
                {d.name}
                {d.isDefault && <Badge variant="secondary" className="ml-1">default</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {!active ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No dashboards yet. Create your first dashboard to start monitoring your business.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{active.name}</h3>
              {active.description && <p className="text-sm text-muted-foreground">{active.description}</p>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(active.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>

          {isFetching && !dashboardData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 rounded-lg border bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(dashboardData?.data ?? []).map((item: any) => (
                <Card key={item.widgetId} className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removeWidgetMutation.mutate(item.widgetId)}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {item.type === "count" ? <Hash className="w-4 h-4 text-primary" /> :
                       item.type === "recent" ? <List className="w-4 h-4 text-primary" /> :
                       <TrendingUp className="w-4 h-4 text-primary" />}
                      {item.title}
                      {item.entityName && <span className="text-xs text-muted-foreground font-normal">· {item.entityName}</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {item.data.empty && item.type !== "recent" ? (
                      <p className="text-sm text-muted-foreground py-4">No data</p>
                    ) : item.data.value !== undefined ? (
                      <div className="text-3xl font-bold">
                        {Number.isInteger(item.data.value) ? item.data.value : Number(item.data.value).toFixed(2)}
                        {item.data.suffix && <span className="text-base text-muted-foreground ml-1">{item.data.suffix}</span>}
                      </div>
                    ) : item.data.records ? (
                      <ul className="space-y-1 text-sm">
                        {item.data.records.slice(0, 6).map((r: any) => (
                          <li key={r.id} className="truncate text-muted-foreground">
                            {Object.entries(r).filter(([k]) => !k.startsWith("_")).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                          </li>
                        ))}
                      </ul>
                    ) : item.data.chart ? (
                      <ChartView chart={item.data.chart} />
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New dashboard</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Salon overview" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newName || createMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={widgetOpen} onOpenChange={setWidgetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add widget</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={widgetTitle} onChange={(e) => setWidgetTitle(e.target.value)} placeholder="e.g. Total vehicles" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={widgetType} onValueChange={setWidgetType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(WIDGET_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Entity</Label>
                <Select value={widgetEntity} onValueChange={(v) => { setWidgetEntity(v); setWidgetField(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                  <SelectContent>
                    {(entitiesData?.data ?? []).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {widgetType !== "count" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Field</Label>
                  <Select value={widgetField} onValueChange={setWidgetField}>
                    <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>
                      {(activeEntity?.fields ?? []).map((f: any) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Aggregation</Label>
                  <Select value={widgetAgg} onValueChange={setWidgetAgg}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["count", "sum", "avg", "min", "max"].map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWidgetOpen(false)}>Cancel</Button>
            <Button onClick={() => addWidgetMutation.mutate()} disabled={!widgetTitle || addWidgetMutation.isPending}>
              Add widget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChartView({ chart }: { chart: { labels: string[]; series: Record<string, number[]> } }) {
  const labels = chart.labels;
  const seriesEntries = Object.entries(chart.series);
  const max = Math.max(1, ...seriesEntries.flatMap(([, v]) => v));
  return (
    <div className="space-y-2">
      {labels.map((label, i) => (
        <div key={label} className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate text-muted-foreground max-w-[60%]">{label}</span>
            <span className="font-medium">
              {seriesEntries.map(([name, values]) => `${name}: ${values[i] ?? 0}`).join(" · ")}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            {seriesEntries.map(([name, values]) => (
              <div
                key={name}
                className="h-full inline-block bg-primary"
                style={{ width: `${Math.max(2, ((values[i] ?? 0) / max) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}