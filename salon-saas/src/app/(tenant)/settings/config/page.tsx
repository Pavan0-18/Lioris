"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { Settings2, Loader2, History, RotateCcw } from "lucide-react";

const KEY_DESCRIPTIONS: Record<string, string> = {
  "business.model": "What type of business is this? Drives defaults for entities and modules.",
  "business.hierarchy": "Which org levels exist (region, branch, department, team)?",
  "permissions.scopes": "Per-role record scopes per permission: all, branch, own, none.",
  "notifications.preferences": "Default notification channels per event type.",
  "branding": "Logo, colors, and invoice footer.",
};

export default function SettingsConfigPage() {
  const queryClient = useQueryClient();
  const [expandedKey, setExpandedKey] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [note, setNote] = React.useState("");
  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [versionsKey, setVersionsKey] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-config"],
    queryFn: () => fetch("/api/tenant/config").then((res) => res.json()),
    staleTime: 30 * 1000,
  });

  const { data: versionsData } = useQuery({
    queryKey: ["config-versions", versionsKey],
    queryFn: () => fetch(`/api/tenant/config/${versionsKey}/versions`).then((res) => res.json()),
    enabled: versionsOpen && !!versionsKey,
    staleTime: 15 * 1000,
  });

  const save = async (key: string) => {
    setSaving(true);
    try {
      let parsed;
      try {
        parsed = JSON.parse(draft);
      } catch {
        toast.error("Configuration must be valid JSON");
        setSaving(false);
        return;
      }
      const res = await fetch(`/api/tenant/config/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: parsed, note: note || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Saved v${json.data.version}`);
      queryClient.invalidateQueries({ queryKey: ["tenant-config"] });
      queryClient.invalidateQueries({ queryKey: ["config-versions"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const rollback = async (key: string, version: number) => {
    try {
      const res = await fetch(`/api/tenant/config/${key}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Rolled back to v${version}`);
      queryClient.invalidateQueries({ queryKey: ["tenant-config"] });
      queryClient.invalidateQueries({ queryKey: ["config-versions"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <BoneyardPage />;

  const configs = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Versioned, auditable configuration for this workspace. Every change is recorded and can be rolled back.
        </p>
      </div>

      <div className="grid gap-4">
        {configs.map((cfg: any) => {
          const isExpanded = expandedKey === cfg.key;
          const json = JSON.stringify(cfg.value, null, 2);
          return (
            <Card key={cfg.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base font-mono text-sm">{cfg.key}</CardTitle>
                    <Badge variant="outline" className="text-xs">v{cfg.version}</Badge>
                    <Badge variant={cfg.schema === "validated" ? "default" : "secondary"} className="text-xs">
                      {cfg.schema === "validated" ? "Validated" : "Freeform"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setVersionsKey(cfg.key); setVersionsOpen(true); }}>
                      <History className="w-3.5 h-3.5 mr-1.5" /> Versions
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setExpandedKey(isExpanded ? null : cfg.key); setDraft(json); setNote(""); }}>
                      {isExpanded ? "Close" : "Edit"}
                    </Button>
                  </div>
                </div>
                <CardDescription>{KEY_DESCRIPTIONS[cfg.key] ?? "Workspace configuration."}</CardDescription>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-3">
                  <Textarea
                    className="font-mono text-xs min-h-[160px]"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex-1">
                      <input
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                        placeholder="Change note (optional)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                    <Button onClick={() => save(cfg.key)} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Save v{cfg.version + 1}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-w-2xl max-h-[75vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{versionsKey} — Version History</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Changed by</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(versionsData?.data ?? []).map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">v{v.version}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{v.changeNote ?? "—"}</TableCell>
                  <TableCell className="text-xs">{v.changedById ? v.changedById.slice(0, 8) : "system"}</TableCell>
                  <TableCell className="text-xs">{new Date(v.changedAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Roll back "${versionsKey}" to v${v.version}?`)) {
                          rollback(versionsKey, v.version);
                        }
                      }}
                    >
                      <RotateCcw className="w-3 h-3 mr-1.5" /> Restore
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(versionsData?.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No versions recorded</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}