"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BoneyardPage, BoneyardTable } from "@/components/ui/boneyard";
import { KanbanBoard } from "@/components/ui/kanban-board";
import { toast } from "sonner";
import { Plus, Search, X, Pencil, Trash2, ArrowLeft, Loader2, Eye, LayoutGrid, CalendarDays } from "lucide-react";
import { formatFieldValue } from "@/lib/entities/engine";
import { applyView, type ViewConfig, type ViewType } from "@/lib/views/engine";

const FILTER_OPERATORS = ["eq", "neq", "contains", "starts_with", "ends_with", "is_empty", "is_not_empty", "gt", "gte", "lt", "lte"];
const VIEW_TYPE_LABELS: Record<ViewType, string> = { list: "List", kanban: "Kanban", calendar: "Calendar" };

function FieldInput({ field, value, onChange }: any) {
  const common = {
    value: value ?? "",
    onChange: (e: any) => onChange(e.target.value),
    placeholder: field.placeholder ?? undefined,
  };

  switch (field.type) {
    case "textarea":
      return <Textarea {...common} />;
    case "boolean":
      return (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <span className="text-sm text-muted-foreground">Yes</span>
        </div>
      );
    case "select":
      return (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {(field.options?.choices ?? []).map((c: any) => {
              const v = typeof c === "object" ? c.value : c;
              return <SelectItem key={v} value={v}>{v}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      );
    case "multiselect":
      return (
        <Select
          value={Array.isArray(value) ? value[0] ?? "" : ""}
          onValueChange={(v) => onChange(value?.includes(v) ? value.filter((x: string) => x !== v) : [...(value ?? []), v])}
        >
          <SelectTrigger><SelectValue placeholder="Select one or more..." /></SelectTrigger>
          <SelectContent>
            {(field.options?.choices ?? []).map((c: any) => {
              const v = typeof c === "object" ? c.value : c;
              return <SelectItem key={v} value={v}>{v}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      );
    case "number":
    case "currency":
    case "percentage":
    case "rating":
      return <Input type="number" step="any" {...common} />;
    case "date":
      return <Input type="date" {...common} />;
    case "datetime":
      return <Input type="datetime-local" {...common} />;
    case "email":
      return <Input type="email" {...common} />;
    case "url":
      return <Input type="url" {...common} />;
    case "json":
      return <Textarea {...common} className="font-mono" />;
    default:
      return <Input {...common} />;
  }
}

export default function EntityRecordsPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const entityKey = params.key;

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [values, setValues] = React.useState<Record<string, any>>({});
  const [viewId, setViewId] = React.useState("");
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["entity-records", entityKey, search, page, viewId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(viewId ? 100 : limit));
      if (search) params.set("search", search);
      const res = await fetch(`/api/tenant/entities/${entityKey}/records?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    staleTime: 15 * 1000,
  });

  const { data: viewsData } = useQuery({
    queryKey: ["entity-views", entityKey],
    queryFn: async () => {
      const res = await fetch(`/api/tenant/entities/${entityKey}/views`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    enabled: !!data?.data?.entity,
  });

  const views: any[] = viewsData?.views ?? [];
  const activeView = views.find((v) => v.id === viewId);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editing
        ? `/api/tenant/entities/${entityKey}/records/${editing.id}`
        : `/api/tenant/entities/${entityKey}/records`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success(editing ? "Record updated" : "Record created");
      queryClient.invalidateQueries({ queryKey: ["entity-records", entityKey] });
      setDialogOpen(false);
      setEditing(null);
      setValues({});
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/entities/${entityKey}/records/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Record deleted");
      queryClient.invalidateQueries({ queryKey: ["entity-records", entityKey] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ---- Views management ----
  const [viewsOpen, setViewsOpen] = React.useState(false);
  const [viewFormOpen, setViewFormOpen] = React.useState(false);
  const [viewEditing, setViewEditing] = React.useState<any | null>(null);
  const [vName, setVName] = React.useState("");
  const [vType, setVType] = React.useState<ViewType>("list");
  const [vFilters, setVFilters] = React.useState<any[]>([]);
  const [vSortBy, setVSortBy] = React.useState("");
  const [vSortDir, setVSortDir] = React.useState<"asc" | "desc">("asc");
  const [vGroupByField, setVGroupByField] = React.useState("");
  const [vCalendarField, setVCalendarField] = React.useState("");
  const [vColumns, setVColumns] = React.useState<string[]>([]);
  const [vIsDefault, setVIsDefault] = React.useState(false);

  const openViewCreate = () => {
    setViewEditing(null);
    setVName("");
    setVType("list");
    setVFilters([]);
    setVSortBy("");
    setVSortDir("asc");
    setVGroupByField("");
    setVCalendarField("");
    setVColumns([]);
    setVIsDefault(false);
    setViewFormOpen(true);
  };

  const openViewEdit = (view: any) => {
    const config = view.config ?? {};
    setViewEditing(view);
    setVName(view.name);
    setVType(view.type);
    setVFilters(config.filters ?? []);
    setVSortBy(config.sortBy ?? "");
    setVSortDir(config.sortDir ?? "asc");
    setVGroupByField(config.groupByField ?? "");
    setVCalendarField(config.calendarField ?? "");
    setVColumns(config.columns ?? []);
    setVIsDefault(view.isDefault === true);
    setViewFormOpen(true);
  };

  const viewSaveMutation = useMutation({
    mutationFn: async () => {
      const config: ViewConfig = {};
      if (vFilters.length) config.filters = vFilters.filter((f) => f.field);
      if (vSortBy) { config.sortBy = vSortBy; config.sortDir = vSortDir; }
      if (vType === "kanban") config.groupByField = vGroupByField;
      if (vType === "calendar") config.calendarField = vCalendarField;
      if (vColumns.length) config.columns = vColumns;
      const url = viewEditing
        ? `/api/tenant/entities/${entityKey}/views/${viewEditing.id}`
        : `/api/tenant/entities/${entityKey}/views`;
      const res = await fetch(url, {
        method: viewEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: vName, type: vType, config, isDefault: vIsDefault }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: (json) => {
      toast.success(viewEditing ? "View updated" : "View created");
      setViewFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["entity-views", entityKey] });
      if (!viewEditing) setViewId(json.data.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const viewDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/entities/${entityKey}/views/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("View deleted");
      if (viewId) setViewId("");
      queryClient.invalidateQueries({ queryKey: ["entity-views", entityKey] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <BoneyardPage />;

  const entity = data?.data?.entity;
  const fields = data?.data?.fields ?? [];
  const records = data?.data?.records ?? [];
  const total = data?.data?.pagination?.total ?? 0;
  const displayFields = fields.slice(0, 6);

  const viewColumns = activeView?.config?.columns?.length
    ? fields.filter((f: any) => activeView.config.columns.includes(f.key))
    : displayFields;

  const applied = activeView
    ? applyView(records as Record<string, any>[], activeView.config ?? {}, fields, activeView.type)
    : null;

  const openCreate = () => {
    setEditing(null);
    setValues({});
    setDialogOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    const next: Record<string, any> = {};
    for (const f of fields) {
      if (record[f.key] !== undefined) next[f.key] = record[f.key];
    }
    setValues(next);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/settings/entities")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Entities
          </button>
          <h2 className="text-2xl font-bold tracking-tight">{entity?.name ?? entityKey}</h2>
          <p className="text-sm text-muted-foreground">{total} records · {fields.length} fields</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setViewsOpen(true)}>
            <Eye className="w-4 h-4 mr-2" /> Views {views.length > 0 && `(${views.length})`}
          </Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New {entity?.singular ?? "Record"}</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 pr-8"
            placeholder="Search records..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { setSearch(""); setPage(1); }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {views.length > 0 && (
          <Select value={viewId} onValueChange={setViewId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Table view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Table view</SelectItem>
              {views.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {VIEW_TYPE_LABELS[v.type as ViewType] ?? v.type} · {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {activeView?.type === "kanban" && applied?.groups ? (
        <KanbanBoard
          columns={applied.groups.map((g) => ({ id: g.key, title: g.label, items: g.records }))}
          renderCard={(record: any) => (
            <div className="rounded-md border bg-background p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{record._title ?? "Untitled"}</span>
                <div className="flex gap-0.5 shrink-0">
                  <Button size="sm" variant="ghost" className="h-6 w-6" onClick={() => openEdit(record)}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => { if (confirm("Delete this record?")) deleteMutation.mutate(record.id); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {fields.slice(0, 3).map((f: any) => (
                <div key={f.id} className="text-xs text-muted-foreground truncate">
                  <span className="text-muted-foreground/70">{f.label}: </span>
                  {formatFieldValue(f, record[f.key])}
                </div>
              ))}
            </div>
          )}
          className="overflow-x-auto"
        />
      ) : activeView?.type === "calendar" && applied?.calendar ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {applied.calendar.map((day) => (
            <div key={day.date} className="w-56 shrink-0 rounded-lg border">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/40 rounded-t-lg">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">{new Date(day.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
              </div>
              <div className="space-y-2 p-2">
                {day.records.length === 0 && <div className="text-xs text-muted-foreground py-2 text-center">No records</div>}
                {day.records.map((record: any) => (
                  <div key={record.id} className="rounded-md border p-2 space-y-1">
                    <div className="text-sm font-medium truncate">{record._title ?? "Untitled"}</div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6" onClick={() => openEdit(record)}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => { if (confirm("Delete this record?")) deleteMutation.mutate(record.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {(activeView ? (applied?.records ?? []) : records).length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                No records{activeView ? " match this view" : ""}. Create your first {entity?.singular?.toLowerCase() ?? "record"}.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {(activeView ? viewColumns : displayFields).map((f: any) => (
                      <TableHead key={f.id}>{f.label}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(activeView ? (applied?.records ?? []) : records).map((record: any) => (
                    <TableRow key={record.id}>
                      {(activeView ? viewColumns : displayFields).map((f: any) => (
                        <TableCell key={f.id} className="max-w-[220px] truncate">
                          {f.type === "boolean"
                            ? <Badge variant={record[f.key] ? "default" : "outline"}>{record[f.key] ? "Yes" : "No"}</Badge>
                            : formatFieldValue(f, record[f.key])}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(record)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => { if (confirm("Delete this record?")) deleteMutation.mutate(record.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {!activeView && total > limit && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Page {page} of {Math.ceil(total / limit)}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setValues({}); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${entity?.singular ?? "Record"}` : `New ${entity?.singular ?? "Record"}`}</DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {fields.map((f: any) => (
              <div key={f.id} className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {f.label}
                  {f.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                <FieldInput field={f} value={values[f.key]} onChange={(v: any) => setValues((prev) => ({ ...prev, [f.key]: v }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? "Save Changes" : "Create Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewsOpen} onOpenChange={setViewsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Views</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {views.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No saved views yet.</p>
            )}
            {views.map((view: any) => (
              <div key={view.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                <div className="flex items-center gap-2 min-w-0">
                  {view.type === "kanban" ? <LayoutGrid className="w-4 h-4 text-primary shrink-0" /> :
                   view.type === "calendar" ? <CalendarDays className="w-4 h-4 text-primary shrink-0" /> :
                   <Eye className="w-4 h-4 text-primary shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{view.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {VIEW_TYPE_LABELS[view.type as ViewType] ?? view.type}
                      {view.isDefault && " · default"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7" onClick={() => setViewId(view.id)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7" onClick={() => openViewEdit(view)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => viewDeleteMutation.mutate(view.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewsOpen(false)}>Close</Button>
            <Button onClick={openViewCreate}><Plus className="w-4 h-4 mr-1" /> New view</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewFormOpen} onOpenChange={setViewFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewEditing ? "Edit view" : "New view"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>View name</Label>
                <Input value={vName} onChange={(e) => setVName(e.target.value)} placeholder="e.g. Unpaid invoices" />
              </div>
              <div className="space-y-1.5">
                <Label>Layout</Label>
                <Select value={vType} onValueChange={(v) => setVType(v as ViewType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(VIEW_TYPE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Filters</Label>
              {vFilters.map((filter, fi) => (
                <div key={fi} className="flex items-center gap-2">
                  <Select
                    value={filter.field}
                    onValueChange={(field) => {
                      const next = [...vFilters];
                      next[fi] = { ...filter, field };
                      setVFilters(next);
                    }}
                  >
                    <SelectTrigger className="w-40"><SelectValue placeholder="Field" /></SelectTrigger>
                    <SelectContent>
                      {fields.map((f: any) => (
                        <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filter.operator}
                    onValueChange={(operator) => {
                      const next = [...vFilters];
                      next[fi] = { ...filter, operator };
                      setVFilters(next);
                    }}
                  >
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FILTER_OPERATORS.map((op) => (
                        <SelectItem key={op} value={op}>{op.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!["is_empty", "is_not_empty"].includes(filter.operator) && (
                    <Input
                      className="w-32"
                      value={filter.value ?? ""}
                      onChange={(e) => {
                        const next = [...vFilters];
                        next[fi] = { ...filter, value: e.target.value };
                        setVFilters(next);
                      }}
                      placeholder="Value"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setVFilters(vFilters.filter((_, i) => i !== fi))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setVFilters([...vFilters, { field: "", operator: "eq", value: "" }])}
              >
                <Plus className="w-4 h-4 mr-1" /> Filter
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sort by</Label>
                <Select value={vSortBy} onValueChange={setVSortBy}>
                  <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    {fields.map((f: any) => (
                      <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sort direction</Label>
                <Select value={vSortDir} onValueChange={(v) => setVSortDir(v as "asc" | "desc")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {vType === "kanban" && (
              <div className="space-y-1.5">
                <Label>Group by field</Label>
                <Select value={vGroupByField} onValueChange={setVGroupByField}>
                  <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                  <SelectContent>
                    {fields.map((f: any) => (
                      <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {vType === "calendar" && (
              <div className="space-y-1.5">
                <Label>Calendar field</Label>
                <Select value={vCalendarField} onValueChange={setVCalendarField}>
                  <SelectTrigger><SelectValue placeholder="Select date field" /></SelectTrigger>
                  <SelectContent>
                    {fields.filter((f: any) => ["date", "datetime", "timestamp"].includes(f.type)).map((f: any) => (
                      <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Visible columns</Label>
              <div className="flex flex-wrap gap-2">
                {fields.slice(0, 10).map((f: any) => {
                  const checked = vColumns.includes(f.key);
                  return (
                    <label
                      key={f.id}
                      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs cursor-pointer ${checked ? "bg-primary/10 border-primary/40" : ""}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) =>
                          setVColumns(c ? [...vColumns, f.key] : vColumns.filter((k) => k !== f.key))
                        }
                      />
                      {f.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={vIsDefault} onCheckedChange={(c) => setVIsDefault(c === true)} />
              <Label>Set as default view</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewFormOpen(false)}>Cancel</Button>
            <Button
              onClick={() => viewSaveMutation.mutate()}
              disabled={
                !vName ||
                (vType === "kanban" && !vGroupByField) ||
                (vType === "calendar" && !vCalendarField) ||
                viewSaveMutation.isPending
              }
            >
              {viewSaveMutation.isPending ? "Saving..." : viewEditing ? "Save changes" : "Create view"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}