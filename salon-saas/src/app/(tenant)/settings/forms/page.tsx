"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BoneyardPage, BoneyardTable } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Play, X, ChevronDown } from "lucide-react";
import { FIELD_TYPES } from "@/lib/entities/engine";
import { fieldTypeLabel } from "@/lib/forms/engine";

const OPERATORS = ["eq", "neq", "contains", "starts_with", "is_empty", "is_not_empty"];

export default function SettingsFormsPage() {
  const queryClient = useQueryClient();

  const { data: entitiesData, isLoading: entitiesLoading } = useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/entities");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });

  const [entityKey, setEntityKey] = React.useState("");
  const [forms, setForms] = React.useState<any[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["entity-forms", entityKey],
    queryFn: async () => {
      if (!entityKey) return null;
      const res = await fetch(`/api/tenant/entities/${entityKey}/forms`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    enabled: !!entityKey,
  });

  React.useEffect(() => {
    if (entitiesData?.data?.length && !entityKey) {
      setEntityKey(entitiesData.data[0].key);
    }
  }, [entitiesData, entityKey]);

  React.useEffect(() => {
    setForms(data?.forms ?? []);
  }, [data]);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [sections, setSections] = React.useState<any[]>([]);

  const fields = data?.fields ?? [];

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setSections([{ id: `sec_${Date.now()}`, title: "General", description: "", fields: [] }]);
    setOpen(true);
  };

  const openEdit = (form: any) => {
    setEditing(form);
    setName(form.name);
    setDescription(form.description ?? "");
    const layout = form.layout ?? { sections: [] };
    setSections(layout.sections?.length ? layout.sections : [{ id: `sec_${Date.now()}`, title: "General", description: "", fields: [] }]);
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const layout = { sections };
      const url = editing
        ? `/api/tenant/entities/${entityKey}/forms/${editing.id}`
        : `/api/tenant/entities/${entityKey}/forms`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, layout }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success(editing ? "Form updated" : "Form created");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["entity-forms", entityKey] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/entities/${entityKey}/forms/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Form deleted");
      queryClient.invalidateQueries({ queryKey: ["entity-forms", entityKey] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || entitiesLoading) return <BoneyardPage />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Forms</h2>
          <p className="text-sm text-muted-foreground">
            Design data-capture forms for your custom entities. Each form submits a record.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={entityKey} onValueChange={setEntityKey}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Select entity" /></SelectTrigger>
            <SelectContent>
              {(entitiesData?.data ?? []).map((e: any) => (
                <SelectItem key={e.key} value={e.key}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Form</Button>
        </div>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No forms yet for this entity. Create one to start capturing structured records.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form: any) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <div className="font-medium">{form.name}</div>
                      {form.description && <div className="text-xs text-muted-foreground">{form.description}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {((form.layout?.sections ?? []).reduce((n: number, s: any) => n + s.fields.length, 0))} fields
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={form.isActive ? "default" : "secondary"}>{form.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <a href={`/entities/${entityKey}/forms/${form.id}`}><Play className="w-4 h-4" /></a>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(form)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(form.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit form" : "New form"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Form name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New vehicle intake" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            {sections.map((section, si) => (
              <Card key={section.id}>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <Label>Section title</Label>
                      <Input
                        value={section.title}
                        onChange={(e) => {
                          const next = [...sections];
                          next[si] = { ...section, title: e.target.value };
                          setSections(next);
                        }}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-5"
                      onClick={() => setSections(sections.filter((_, i) => i !== si))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {section.fields.map((placement: any, fi: number) => (
                      <div key={fi} className="flex items-center gap-2 rounded-md border p-2">
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{fields.find((f: any) => f.key === placement.key)?.label ?? placement.key}</div>
                          {placement.visibleWhen && (
                            <div className="text-xs text-muted-foreground">
                              Visible when {placement.visibleWhen.field} {placement.visibleWhen.operator} {placement.visibleWhen.value ?? ""}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={placement.required === true}
                            onCheckedChange={(checked) => {
                              const next = [...sections];
                              next[si].fields = section.fields.map((f: any, i: number) =>
                                i === fi ? { ...f, required: checked } : f
                              );
                              setSections(next);
                            }}
                          />
                          <span className="text-xs text-muted-foreground">Required</span>
                          <Select
                            value={placement.visibleWhen ? `${placement.visibleWhen.field}:${placement.visibleWhen.operator}` : "__none__"}
                            onValueChange={(v) => {
                              const next = [...sections];
                              next[si].fields = section.fields.map((f: any, i: number) => {
                                if (i !== fi) return f;
                                if (v === "__none__") return { ...f, visibleWhen: null };
                                const [field, operator] = v.split(":");
                                return { ...f, visibleWhen: { field, operator } };
                              });
                              setSections(next);
                            }}
                          >
                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Always visible</SelectItem>
                              {fields.filter((f: any) => f.key !== placement.key).map((f: any) => (
                                OPERATORS.map((op) => (
                                  <SelectItem key={`${f.key}:${op}`} value={`${f.key}:${op}`}>
                                    When {f.label} {op}
                                  </SelectItem>
                                ))
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const next = [...sections];
                              next[si].fields = section.fields.filter((_: any, i: number) => i !== fi);
                              setSections(next);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value=""
                      onValueChange={(fieldKey) => {
                        const next = [...sections];
                        next[si].fields = [...section.fields, { key: fieldKey, visibleWhen: null, required: false }];
                        setSections(next);
                      }}
                    >
                      <SelectTrigger className="w-56"><SelectValue placeholder="Add field..." /></SelectTrigger>
                      <SelectContent>
                        {fields.map((f: any) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label} · {fieldTypeLabel(f.type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSections([...sections, { id: `sec_${Date.now()}`, title: "New section", description: "", fields: [] }])}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Section
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Tip: set field visibility conditions by clicking a field — see the field editor for advanced rules.
              </div>
              <Button variant="outline" size="sm" onClick={() => setSections([...sections, { id: `sec_${Date.now()}`, title: "New section", description: "", fields: [] }])}>
                <Plus className="w-4 h-4 mr-1" /> Section
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!name || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}