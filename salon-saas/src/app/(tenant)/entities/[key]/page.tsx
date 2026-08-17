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
import { toast } from "sonner";
import { Plus, Search, X, Pencil, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { formatFieldValue } from "@/lib/entities/engine";

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
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["entity-records", entityKey, search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      const res = await fetch(`/api/tenant/entities/${entityKey}/records?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    staleTime: 15 * 1000,
  });

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

  if (isLoading) return <BoneyardPage />;

  const entity = data?.data?.entity;
  const fields = data?.data?.fields ?? [];
  const records = data?.data?.records ?? [];
  const total = data?.data?.pagination?.total ?? 0;
  const displayFields = fields.slice(0, 6);

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
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New {entity?.singular ?? "Record"}</Button>
      </div>

      <div className="relative max-w-sm">
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

      <Card>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No records yet. Create your first {entity?.singular?.toLowerCase() ?? "record"}.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {displayFields.map((f: any) => (
                    <TableHead key={f.id}>{f.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record: any) => (
                  <TableRow key={record.id}>
                    {displayFields.map((f: any) => (
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

      {total > limit && (
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
    </div>
  );
}