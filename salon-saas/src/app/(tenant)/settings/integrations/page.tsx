"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { PlugZap, Loader2, Settings2 } from "lucide-react";

const STATUS_BADGE: Record<string, any> = {
  configured: "success",
  active: "success",
  inactive: "secondary",
  not_configured: "outline",
};

const CATEGORY_BADGE: Record<string, any> = {
  payments: "warning",
  messaging: "default",
  automation: "secondary",
};

export default function SettingsIntegrationsPage() {
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = React.useState<any | null>(null);
  const [formValues, setFormValues] = React.useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/integrations");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    staleTime: 30 * 1000,
  });
  const integrations: any[] = data?.data?.integrations ?? [];

  const saveMutation = useMutation({
    mutationFn: async ({ target, values }: { target: any; values: Record<string, string> }) => {
      const res = await fetch("/api/tenant/settings/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: target.integration.key, config: values, isActive: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Integration configured");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setEditTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ target, enabled }: { target: any; enabled: boolean }) => {
      const res = await fetch("/api/tenant/settings/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: target.integration.key,
          config: target.config,
          isActive: enabled,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Integration updated");
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <BoneyardPage />;

  const openEdit = (item: any) => {
    const values: Record<string, string> = {};
    for (const field of item.integration.fields ?? []) {
      const existing = item.config?.[field.key];
      values[field.key] = typeof existing === "string" && !existing.startsWith("••") ? existing : "";
    }
    setFormValues(values);
    setEditTarget(item);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <PlugZap className="w-5 h-5 text-primary" /> Integrations
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect messaging, payment and automation providers to your workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((item: any) => {
          const int = item.integration;
          return (
            <Card key={int.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{int.name}</CardTitle>
                    <Badge variant={CATEGORY_BADGE[int.category] ?? "secondary"} className="mt-1 text-xs">
                      {int.category}
                    </Badge>
                  </div>
                  <Badge variant={STATUS_BADGE[item.status] ?? "outline"}>{item.status.replace("_", " ")}</Badge>
                </div>
                <CardDescription>{int.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {int.kind === "env" ? (
                  <p className="text-xs text-muted-foreground">
                    Configured at platform level — status reflects server environment settings.
                  </p>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <Switch
                      checked={item.isActive}
                      disabled={toggleMutation.isPending}
                      onCheckedChange={(v) => toggleMutation.mutate({ target: item, enabled: v })}
                    />
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                      <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Configure
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {editTarget?.integration?.name}</DialogTitle>
            <DialogDescription>
              Credentials are stored encrypted at rest and masked after saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(editTarget?.integration?.fields ?? []).map((field: any) => (
              <div key={field.key} className="space-y-1.5">
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  type={field.type === "password" ? "password" : "text"}
                  placeholder={field.secret ? "Enter secret" : ""}
                  value={formValues[field.key] ?? ""}
                  onChange={(e) => setFormValues({ ...formValues, [field.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate({ target: editTarget, values: formValues })}
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}