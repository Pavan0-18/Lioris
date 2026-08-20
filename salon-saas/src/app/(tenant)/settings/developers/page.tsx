"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Check, KeyRound } from "lucide-react";

const SCOPES = [
  "customers:read",
  "customers:write",
  "appointments:read",
  "appointments:write",
  "invoices:read",
  "invoices:write",
  "entities:read",
  "entities:write",
  "webhooks:read",
];

const ENDPOINTS = [
  { method: "GET", path: "/api/v1/customers", scope: "customers:read", desc: "List customers" },
  { method: "POST", path: "/api/v1/customers", scope: "customers:write", desc: "Create a customer" },
  { method: "GET", path: "/api/v1/customers/:id", scope: "customers:read", desc: "Get a customer" },
  { method: "PUT", path: "/api/v1/customers/:id", scope: "customers:write", desc: "Update a customer" },
  { method: "DELETE", path: "/api/v1/customers/:id", scope: "customers:write", desc: "Delete a customer" },
  { method: "GET", path: "/api/v1/appointments", scope: "appointments:read", desc: "List appointments (filter by status/from/to)" },
  { method: "POST", path: "/api/v1/appointments", scope: "appointments:write", desc: "Create an appointment" },
  { method: "GET", path: "/api/v1/appointments/:id", scope: "appointments:read", desc: "Get an appointment" },
  { method: "PUT", path: "/api/v1/appointments/:id", scope: "appointments:write", desc: "Update status or reschedule" },
  { method: "GET", path: "/api/v1/invoices", scope: "invoices:read", desc: "List invoices" },
  { method: "GET", path: "/api/v1/invoices/:id", scope: "invoices:read", desc: "Get an invoice with items" },
];

const methodColor: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600",
  POST: "bg-blue-500/10 text-blue-600",
  PUT: "bg-amber-500/10 text-amber-600",
  DELETE: "bg-red-500/10 text-red-600",
};

export default function SettingsDevelopersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState("keys");
  const [open, setOpen] = React.useState(false);
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [name, setName] = React.useState("");
  const [environment, setEnvironment] = React.useState("production");
  const [scopes, setScopes] = React.useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/api-keys");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });
  const keys: any[] = data?.data?.keys ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, environment, scopes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (key) => {
      setCreatedKey(key.key);
      setOpen(false);
      setName("");
      setScopes([]);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/api-keys/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("API key revoked");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyKey = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <BoneyardPage />;

  const toggleScope = (scope: string) => {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Developer Platform</h2>
          <p className="text-sm text-muted-foreground">
            Public API keys, scopes, and versioned endpoints for programmatic access to your workspace.
          </p>
        </div>
        {tab === "keys" && (
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> New API key</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="keys">API Keys ({keys.length})</TabsTrigger>
          <TabsTrigger value="docs">API Reference</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "keys" && (
        keys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-2">
              <KeyRound className="w-8 h-8 mx-auto opacity-40" />
              <p>No API keys yet.</p>
              <p className="text-xs">Create a key with scoped permissions to call the /api/v1 endpoints.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key: any) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell className="font-mono text-xs">{key.prefix}...</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {(key.scopes ?? []).length === 0 && <span className="text-xs text-muted-foreground">No scopes</span>}
                          {(key.scopes ?? []).slice(0, 3).map((s: string) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                          {(key.scopes ?? []).length > 3 && <Badge variant="outline">+{(key.scopes ?? []).length - 3}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{key.environment}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.revokedAt ? "secondary" : "default"}>
                          {key.revokedAt ? "Revoked" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!key.revokedAt && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => revokeMutation.mutate(key.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      )}

      {tab === "docs" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <h4 className="text-sm font-semibold">Authentication</h4>
              <p className="text-xs text-muted-foreground">
                Send the API key in the <code className="font-mono">Authorization: Bearer &lt;key&gt;</code> header.
                Mutations accept an optional <code className="font-mono">Idempotency-Key</code> header; re-sending the same
                key with the same body returns the stored response instead of repeating the write.
              </p>
              <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{`curl -H "Authorization: Bearer lior_prod_..." \\
     https://your-domain.com/api/v1/customers`}</pre>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ENDPOINTS.map((e) => (
                    <TableRow key={`${e.method}-${e.path}`}>
                      <TableCell>
                        <span className={`rounded px-1.5 py-0.5 text-xs font-mono font-semibold ${methodColor[e.method]}`}>
                          {e.method}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{e.path}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{e.scope}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New API key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zapier integration" />
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Scopes</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {SCOPES.map((scope) => {
                  const checked = scopes.includes(scope);
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={`rounded-md border px-2 py-1.5 text-xs text-left cursor-pointer ${checked ? "bg-primary/10 border-primary/40" : ""}`}
                    >
                      {scope}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">No scopes = read access only.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdKey} onOpenChange={(o) => { if (!o) { setCreatedKey(null); setCopied(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Key created — copy it now</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              For security, the full key is shown only once. Store it somewhere safe.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono overflow-x-auto break-all">
                {createdKey}
              </code>
              <Button variant="outline" size="icon" onClick={copyKey}>
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}