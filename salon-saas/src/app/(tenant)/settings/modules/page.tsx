"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, Calendar, Receipt, Package, Users2,
  Blocks, BarChart3, CreditCard, Loader2,
} from "lucide-react";

const ICONS: Record<string, any> = {
  LayoutDashboard, Users, Calendar, Receipt, Package, Users2, Blocks, BarChart3, CreditCard,
};

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  commerce: "Commerce",
  operations: "Operations",
  people: "People",
  growth: "Growth",
  platform: "Platform",
};

export default function SettingsModulesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["modules"],
    queryFn: () => fetch("/api/tenant/modules").then((res) => res.json()),
    staleTime: 30 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ moduleKey, enabled }: { moduleKey: string; enabled: boolean }) => {
      const res = await fetch("/api/tenant/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: (data, vars) => {
      toast.success(`${vars.enabled ? "Enabled" : "Disabled"} ${data.name || "module"}`);
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <BoneyardPage />;

  const modules = data?.data || [];
  const grouped = modules.reduce((acc: Record<string, any[]>, m: any) => {
    (acc[m.category] = acc[m.category] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Modules</h2>
        <p className="text-sm text-muted-foreground">
          Enable or disable business modules for this workspace. Disabling a module hides its features.
        </p>
      </div>

      {Object.entries(grouped as Record<string, any[]>).map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m: any) => {
              const Icon = ICONS[m.icon] ?? Blocks;
              return (
                <Card key={m.key} className={m.enabled ? "" : "opacity-60"}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <CardTitle className="text-base">{m.name}</CardTitle>
                      </div>
                      {m.isSystem ? (
                        <Badge variant="secondary">System</Badge>
                      ) : (
                        <Switch
                          checked={m.enabled}
                          onCheckedChange={(checked) => toggleMutation.mutate({ moduleKey: m.key, enabled: checked })}
                          disabled={toggleMutation.isPending}
                        />
                      )}
                    </div>
                    <CardDescription>{m.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">v{m.version}</Badge>
                      {m.permissions?.slice(0, 4).map((p: string) => (
                        <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>
                      ))}
                      {m.permissions?.length > 4 && (
                        <Badge variant="outline" className="text-xs">+{m.permissions.length - 4}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3" />
        Module changes take effect immediately across the workspace.
      </div>
    </div>
  );
}