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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RotateCcw, Eye, Loader2, Webhook } from "lucide-react";

const EVENT_OPTIONS = ["record.created", "record.updated", "status.changed", "scheduled"];
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const STATUS_BADGE: Record<string, any> = {
  delivered: "default",
  failed: "destructive",
  pending: "secondary",
  retrying: "warning",
  dead: "destructive",
};

function formatTime(date: string | Date) {
  return new Date(date).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function SettingsWebhooksPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState("endpoints");

  // ---- Endpoints ----
  const { data: endpointsData, isLoading } = useQuery({
    queryKey: ["webhook-endpoints"],
    queryFn: async () => {
      const res = await fetch("/api/tenant/webhook-endpoints");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });
  const endpoints: any[] = endpointsData?.data ?? [];

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [method, setMethod] = React.useState<string>("POST");
  const [headers, setHeaders] = React.useState("{}");
  const [secret, setSecret] = React.useState("");
  const [eventTypes, setEventTypes] = React.useState<string[]>([]);
  const [isActive, setIsActive] = React.useState(true);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setUrl("");
    setMethod("POST");
    setHeaders("{}");
    setSecret("");
    setEventTypes([]);
    setIsActive(true);
    setOpen(true);
  };

  const openEdit = (endpoint: any) => {
    setEditing(endpoint);
    setName(endpoint.name);
    setDescription(endpoint.description ?? "");
    setUrl(endpoint.url);
    setMethod(endpoint.method ?? "POST");
    setHeaders(JSON.stringify(endpoint.headers ?? {}, null, 2));
    setSecret("");
    setEventTypes(endpoint.eventTypes ?? []);
    setIsActive(endpoint.isActive);
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let parsedHeaders: Record<string, string> = {};
      try {
        parsedHeaders = JSON.parse(headers || "{}");
      } catch {
        throw new Error("Headers must be valid JSON");
      }
      const body: Record<string, any> = {
        name,
        description,
        url,
        method,
        headers: parsedHeaders,
        eventTypes,
        isActive,
      };
      if (secret) body.secret = secret;
      const urlPath = editing ? `/api/tenant/webhook-endpoints/${editing.id}` : "/api/tenant/webhook-endpoints";
      const res = await fetch(urlPath, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success(editing ? "Endpoint updated" : "Endpoint created");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/webhook-endpoints/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      toast.success("Endpoint deleted");
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ---- Deliveries ----
  const [deliveryStatus, setDeliveryStatus] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const limit = 25;

  const { data: deliveriesData, isFetching: deliveriesLoading, refetch: refetchDeliveries } = useQuery({
    queryKey: ["webhook-deliveries", deliveryStatus, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (deliveryStatus !== "all") params.set("status", deliveryStatus);
      const res = await fetch(`/api/tenant/webhook-deliveries?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });
  const deliveries = deliveriesData?.data?.deliveries ?? [];
  const deliveriesTotal = deliveriesData?.data?.pagination?.total ?? 0;

  const { data: detailData, isFetching: detailLoading } = useQuery({
    queryKey: ["webhook-delivery", detailId],
    queryFn: async () => {
      if (!detailId) return null;
      const res = await fetch(`/api/tenant/webhook-deliveries/${detailId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    enabled: !!detailId,
  });
  const detail = detailData?.data;

  const redeliverMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/webhook-deliveries/${id}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: (json) => {
      const status = json.data.status;
      toast.success(
        status === "delivered"
          ? "Delivery succeeded"
          : status === "retrying"
            ? "Delivery failed — will retry with backoff"
            : "Delivery dead-lettered after max retries"
      );
      refetchDeliveries();
      if (detailId) queryClient.invalidateQueries({ queryKey: ["webhook-delivery", detailId] });
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <BoneyardPage />;

  const toggleEvent = (event: string) => {
    setEventTypes((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Named endpoints for outgoing integrations and a delivery log with retry.
          </p>
        </div>
        {tab === "endpoints" && (
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New endpoint</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints ({endpoints.length})</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "endpoints" && (
        endpoints.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-2">
              <Webhook className="w-8 h-8 mx-auto opacity-40" />
              <p>No webhook endpoints yet.</p>
              <p className="text-xs">Create one, then reference it from a workflow&apos;s webhook action to post event payloads.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint: any) => (
                    <TableRow key={endpoint.id}>
                      <TableCell>
                        <div className="font-medium">{endpoint.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {endpoint.method} · {endpoint.successCount} ok · {endpoint.failureCount} failed
                          {endpoint.hasSecret && " · signed"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate text-xs">{endpoint.url}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(endpoint.eventTypes ?? []).slice(0, 3).map((e: string) => (
                            <Badge key={e} variant="outline">{e}</Badge>
                          ))}
                          {(endpoint.eventTypes ?? []).length > 3 && (
                            <Badge variant="outline">+{(endpoint.eventTypes ?? []).length - 3}</Badge>
                          )}
                          {(endpoint.eventTypes ?? []).length === 0 && <span className="text-xs text-muted-foreground">All events</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={endpoint.isActive ? "default" : "secondary"}>
                          {endpoint.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(endpoint)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(endpoint.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      )}

      {tab === "deliveries" && (
        <>
          <div className="flex items-center gap-2">
            <Select value={deliveryStatus} onValueChange={(v) => { setDeliveryStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="retrying">Retrying</SelectItem>
                <SelectItem value="dead">Dead-lettered</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            {deliveriesLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {deliveries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No deliveries{deliveryStatus !== "all" ? ` with status "${deliveryStatus}"` : ""} yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>When</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((delivery: any) => (
                      <TableRow key={delivery.id}>
                        <TableCell>
                          <div className="font-medium truncate max-w-[220px]">{delivery.endpointName ?? delivery.url}</div>
                          {delivery.lastError && <div className="text-xs text-destructive truncate max-w-[220px]">{delivery.lastError}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[delivery.status] ?? "secondary"}>{delivery.status}</Badge>
                        </TableCell>
                        <TableCell>{delivery.statusCode ?? "—"}</TableCell>
                        <TableCell>{delivery.attempts}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatTime(delivery.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setDetailId(delivery.id)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(delivery.status === "failed" || delivery.status === "dead" || delivery.status === "retrying") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => redeliverMutation.mutate(delivery.id)}
                                disabled={redeliverMutation.isPending}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {deliveriesTotal > limit && (
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Page {page} of {Math.ceil(deliveriesTotal / limit)}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= Math.ceil(deliveriesTotal / limit)} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit endpoint" : "New endpoint"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Slack alerts" />
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hooks/lioris" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Headers (JSON)</Label>
              <Textarea
                className="font-mono text-xs"
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Secret (sent as X-Lioris-Signature)</Label>
              <Input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={editing?.hasSecret ? "Leave blank to keep current secret" : "Optional shared secret"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subscribe to events</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_OPTIONS.map((event) => {
                  const checked = eventTypes.includes(event);
                  return (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs cursor-pointer ${checked ? "bg-primary/10 border-primary/40" : ""}`}
                    >
                      {event}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Leave empty to receive all events.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!name || !url || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailId} onOpenChange={(o) => { if (!o) setDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery detail</DialogTitle>
          </DialogHeader>
          {detailLoading && !detail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={STATUS_BADGE[detail.status] ?? "secondary"}>{detail.status}</Badge>
                <span className="text-muted-foreground">HTTP {detail.statusCode ?? "—"}</span>
                <span className="text-muted-foreground">· attempts {detail.attempts}</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">URL</h4>
                <p className="text-xs break-all">{detail.url}</p>
              </div>
              {detail.lastError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {detail.lastError}
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold mb-1">Payload</h4>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(detail.payload, null, 2)}
                </pre>
              </div>
              {detail.responseBody && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Response</h4>
                  <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto max-h-40">
                    {detail.responseBody}
                  </pre>
                </div>
              )}
              {(detail.status === "failed" || detail.status === "dead" || detail.status === "retrying") && (
                <DialogFooter>
                  <Button
                    onClick={() => redeliverMutation.mutate(detail.id)}
                    disabled={redeliverMutation.isPending}
                  >
                    {redeliverMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Redeliver now
                  </Button>
                </DialogFooter>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}