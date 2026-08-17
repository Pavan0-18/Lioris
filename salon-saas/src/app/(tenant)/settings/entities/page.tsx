"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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
import { Plus, Pencil, Trash2, Database, ExternalLink, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { FIELD_TYPES } from "@/lib/entities/engine";

interface EntityItem {
  id: string;
  key: string;
  name: string;
  singular: string;
  description: string | null;
  icon: string | null;
  moduleKey: string;
  isSystem: boolean;
  fieldCount: number;
  fields: any[];
}

export default function SettingsEntitiesPage() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [fieldOpen, setFieldOpen] = React.useState(false);
  const [editingField, setEditingField] = React.useState<any | null>(null);
  const [targetEntity, setTargetEntity] = React.useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["entities"],
    queryFn: () => fetch("/api/tenant/entities").then((res) => res.json()),
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/tenant/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Entity created");
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      setCreateOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteEntityMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch(`/api/tenant/entities/${key}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Entity deleted");
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fieldMutation = useMutation({
    mutationFn: async ({ entityKey, fieldKey, values }: any) => {
      const url = fieldKey
        ? `/api/tenant/entities/${entityKey}/fields/${fieldKey}`
        : `/api/tenant/entities/${entityKey}/fields`;
      const res = await fetch(url, {
        method: fieldKey ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success(editingField ? "Field updated" : "Field added");
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      setFieldOpen(false);
      setEditingField(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async ({ entityKey, fieldKey }: any) => {
      const res = await fetch(`/api/tenant/entities/${entityKey}/fields/${fieldKey}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Field deleted");
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <BoneyardPage />;

  const entities: EntityItem[] = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Entities</h2>
          <p className="text-sm text-muted-foreground">
            Build custom data models — vehicles, projects, memberships, work orders, anything your business needs.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Entity
        </Button>
      </div>

      <div className="grid gap-4">
        {entities.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-3 opacity-50" />
              No custom entities yet. Create one to model any part of your business.
            </CardContent>
          </Card>
        )}

        {entities.map((entity) => (
          <Card key={entity.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpanded(expanded === entity.key ? null : entity.key)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {expanded === entity.key ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <Database className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">{entity.name}</CardTitle>
                  {entity.isSystem && <Badge variant="secondary">System</Badge>}
                  <Badge variant="outline" className="font-mono text-xs">{entity.key}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{entity.fieldCount} fields</Badge>
                  <Link href={`/entities/${entity.key}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Records
                    </Button>
                  </Link>
                  {!entity.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Delete entity "${entity.name}" and all its records?`)) {
                          deleteEntityMutation.mutate(entity.key);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              {entity.description && <CardDescription>{entity.description}</CardDescription>}
            </CardHeader>

            {expanded === entity.key && (
              <CardContent>
                <div className="flex justify-end mb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingField(null);
                      setTargetEntity(entity.key);
                      setFieldOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Field
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Required</TableHead>
                      <TableHead className="text-center">Unique</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entity.fields.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                          No fields yet — add your first field to start recording data.
                        </TableCell>
                      </TableRow>
                    )}
                    {entity.fields.map((field: any) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.label}</TableCell>
                        <TableCell className="font-mono text-xs">{field.key}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{field.type}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {field.isSystem ? <Badge variant="secondary" className="text-xs">System</Badge> : (
                            <Switch checked={field.required} disabled />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {field.isSystem ? null : <Switch checked={field.unique} disabled />}
                        </TableCell>
                        <TableCell className="text-right">
                          {!field.isSystem && (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingField(field);
                                  setTargetEntity(entity.key);
                                  setFieldOpen(true);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete field "${field.label}"?`)) {
                                    deleteFieldMutation.mutate({ entityKey: entity.key, fieldKey: field.key });
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <CreateEntityDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={createMutation.mutate} pending={createMutation.isPending} />
      <FieldDialog
        open={fieldOpen}
        onOpenChange={setFieldOpen}
        entityKey={targetEntity}
        field={editingField}
        onSubmit={fieldMutation.mutate}
        onDelete={editingField ? (fk: string) => deleteFieldMutation.mutate({ entityKey: targetEntity, fieldKey: fk }) : undefined}
        pending={fieldMutation.isPending}
      />
    </div>
  );
}

function CreateEntityDialog({ open, onOpenChange, onSubmit, pending }: any) {
  const [name, setName] = React.useState("");
  const [key, setKey] = React.useState("");
  const [singular, setSingular] = React.useState("");
  const [description, setDescription] = React.useState("");

  const autoKey = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Entity</DialogTitle>
          <DialogDescription>A new data model for this workspace.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name (plural)</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); if (!key) setKey(autoKey(e.target.value)); }} placeholder="e.g. Vehicles" />
          </div>
          <div className="space-y-2">
            <Label>Key</Label>
            <Input value={key} onChange={(e) => setKey(autoKey(e.target.value))} placeholder="vehicles" className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Singular name</Label>
            <Input value={singular} onChange={(e) => setSingular(e.target.value)} placeholder="e.g. Vehicle" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this entity for?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!name || !key || !singular || pending}
            onClick={() => onSubmit({ name, key, singular, description: description || undefined })}
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create Entity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldDialog({ open, onOpenChange, entityKey, field, onSubmit, onDelete, pending }: any) {
  const [label, setLabel] = React.useState("");
  const [key, setKey] = React.useState("");
  const [type, setType] = React.useState("text");
  const [required, setRequired] = React.useState(false);
  const [unique, setUnique] = React.useState(false);
  const [choices, setChoices] = React.useState("");
  const [defaultValue, setDefaultValue] = React.useState("");
  const [placeholder, setPlaceholder] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setLabel(field?.label ?? "");
    setKey(field?.key ?? "");
    setType(field?.type ?? "text");
    setRequired(field?.required ?? false);
    setUnique(field?.unique ?? false);
    setChoices((field?.options?.choices ?? []).map((c: any) => (typeof c === "object" ? c.value : c)).join("\n"));
    setDefaultValue(field?.defaultValue ?? "");
    setPlaceholder(field?.placeholder ?? "");
  }, [open, field]);

  const autoKey = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const needsChoices = type === "select" || type === "multiselect";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{field ? `Edit Field: ${field.label}` : `Add Field to "${entityKey}"`}</DialogTitle>
          <DialogDescription>Field types define how data is validated and displayed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => { setLabel(e.target.value); if (!field && !key) setKey(autoKey(e.target.value)); }} placeholder="e.g. Registration Number" />
          </div>
          <div className="space-y-2">
            <Label>Key</Label>
            <Input value={key} onChange={(e) => setKey(autoKey(e.target.value))} disabled={!!field} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType} disabled={!!field}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsChoices && (
            <div className="space-y-2">
              <Label>Choices (one per line)</Label>
              <Textarea value={choices} onChange={(e) => setChoices(e.target.value)} placeholder={"Haircut\nColor\nTreatment"} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={required} onCheckedChange={setRequired} />
              <Label>Required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={unique} onCheckedChange={setUnique} />
              <Label>Unique</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default value</Label>
            <Input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="justify-between">
          {field && onDelete ? (
            <Button variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Delete field "${field.label}"?`)) onDelete(key); }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={!label || !key || pending}
              onClick={() => onSubmit({
                entityKey,
                fieldKey: field?.key,
                values: {
                  label,
                  key,
                  type,
                  required,
                  unique,
                  options: needsChoices ? { choices: choices.split("\n").map((c) => c.trim()).filter(Boolean) } : {},
                  defaultValue: defaultValue || null,
                  placeholder: placeholder || null,
                },
              })}
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {field ? "Save Changes" : "Add Field"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}