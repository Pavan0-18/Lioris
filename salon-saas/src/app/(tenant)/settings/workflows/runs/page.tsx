"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BoneyardPage } from "@/components/ui/boneyard";
import { toast } from "sonner";
import { RotateCcw, Eye, Loader2, History } from "lucide-react";

const STATUS_BADGE: Record<string, any> = {
  success: "default",
  failed: "destructive",
  skipped: "secondary",
};

function formatDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function WorkflowRunsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ["workflow-runs", status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/tenant/workflows/runs?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });

  const { data: detailData, isFetching: detailLoading } = useQuery({
    queryKey: ["workflow-run", detailId],
    queryFn: async () => {
      if (!detailId) return null;
      const res = await fetch(`/api/tenant/workflows/runs/${detailId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    enabled: !!detailId,
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tenant/workflows/runs/${id}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: (json) => {
      toast.success("Workflow re-run scheduled");
      setDetailId(null);
      queryClient.invalidateQueries({ queryKey: ["workflow-runs"] });
      if (json.data.runId) {
        setDetailId(json.data.runId);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <BoneyardPage />;

  const runs = data?.data?.runs ?? [];
  const total = data?.data?.pagination?.total ?? 0;
  const detail = detailData?.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workflow Runs</h2>
          <p className="text-sm text-muted-foreground">
            Execution history for every automation — inspect inputs, action results and retry failures.
          </p>
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {runs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-2">
            <History className="w-8 h-8 mx-auto opacity-40" />
            <p>No workflow runs{status !== "all" ? ` with status "${status}"` : ""} yet.</p>
            <p className="text-xs">Runs appear whenever an active workflow fires on a record event.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run: any) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <div className="font-medium">{run.workflowName ?? run.workflowId}</div>
                      {run.entityKey && <div className="text-xs text-muted-foreground">{run.entityKey}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{run.eventType}</span>
                      {run.recordId && <div className="text-xs text-muted-foreground truncate max-w-[160px]">{run.recordId}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[run.status] ?? "secondary"}>{run.status}</Badge>
                    </TableCell>
                    <TableCell>{run.actionsExecuted}</TableCell>
                    <TableCell>{formatDuration(run.durationMs)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatTime(run.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetailId(run.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {run.status === "failed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => retryMutation.mutate(run.id)}
                            disabled={retryMutation.isPending}
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

      {total > limit && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Page {page} of {Math.ceil(total / limit)}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={!!detailId} onOpenChange={(o) => { if (!o) setDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.workflowName ?? "Run detail"}</DialogTitle>
          </DialogHeader>
          {detailLoading && !detail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={STATUS_BADGE[detail.status] ?? "secondary"}>{detail.status}</Badge>
                <span className="text-muted-foreground">{detail.eventType}</span>
                {detail.entityKey && <span className="text-muted-foreground">· {detail.entityKey}</span>}
                <span className="text-muted-foreground">· {formatDuration(detail.durationMs)}</span>
              </div>

              {detail.error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {detail.error}
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-1">Actions</h4>
                {(detail.output ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No actions recorded.</p>
                ) : (
                  <div className="space-y-1">
                    {(detail.output ?? []).map((step: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <Badge variant={step.ok ? "default" : "destructive"}>{step.ok ? "OK" : "FAIL"}</Badge>
                        <span className="font-medium">{step.type}</span>
                        {step.message && <span className="text-xs text-destructive truncate">{step.message}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">Input snapshot</h4>
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(detail.input, null, 2)}
                </pre>
              </div>

              {detail.status === "failed" && (
                <DialogFooter>
                  <Button
                    onClick={() => retryMutation.mutate(detail.id)}
                    disabled={retryMutation.isPending}
                  >
                    {retryMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Retry workflow
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