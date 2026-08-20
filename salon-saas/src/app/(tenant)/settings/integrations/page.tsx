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
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { PlugZap, Loader2, Settings2, CreditCard, ExternalLink, Ban } from "lucide-react";

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

const planStatusLabel: Record<string, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Past Due",
  cancelled: "Cancelled",
  inactive: "Inactive",
};

export default function SettingsIntegrationsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [editTarget, setEditTarget] = React.useState<any | null>(null);
  const [formValues, setFormValues] = React.useState<Record<string, string>>({});
  const [selectedPlanId, setSelectedPlanId] = React.useState("");

  React.useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success("Subscription updated. Thank you!");
    } else if (checkout === "cancelled") {
      toast.info("Checkout cancelled. No changes were made.");
    }
  }, [searchParams]);

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

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => fetch("/api/tenant/billing/subscription").then((res) => res.json()),
    staleTime: 30 * 1000,
  });

  const { data: plansData } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => fetch("/api/tenant/billing/plans").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

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

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: (json) => {
      if (json?.data?.url) {
        window.location.href = json.data.url;
      } else {
        toast.error("Subscription is not configured yet");
      }
    },
    onError: () => toast.error("Failed to start checkout"),
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/billing/subscription/portal", { method: "POST" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: (json) => {
      if (json?.data?.url) window.location.href = json.data.url;
    },
    onError: () => toast.error("Failed to open billing portal"),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tenant/billing/subscription", { method: "DELETE" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Subscription will be cancelled at the end of the billing period");
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: () => toast.error("Failed to cancel subscription"),
  });

  if (isLoading) return <BoneyardPage />;

  const subscription = subData?.data;
  const publicPlans = (plansData?.data || []).filter((p: any) => p.isPublic !== false);

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
          Connect messaging, payment and automation providers to your workspace, and manage your plan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Plan & Subscription</CardTitle>
                <CardDescription>Manage your plan, billing period, and payment method.</CardDescription>
              </div>
            </div>
            {subscription?.plan && (
              <Badge variant={subscription.tenant?.planStatus === "active" ? "default" : "outline"}>
                {planStatusLabel[subscription.tenant?.planStatus] || subscription.tenant?.planStatus?.toUpperCase()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Current plan</div>
                  <div className="font-semibold">
                    {subscription?.plan?.name || "—"}
                    {subscription?.plan && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {subscription.plan.currency} {Number(subscription.plan.basePrice).toFixed(2)}/{subscription.plan.billingCycle}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Billing period</div>
                  <div className="font-semibold">
                    {subscription?.subscription?.currentPeriodEnd
                      ? format(new Date(subscription.subscription.currentPeriodEnd), "MMM d, yyyy")
                      : subscription?.tenant?.trialEndsAt
                        ? `Trial ends ${format(new Date(subscription.tenant.trialEndsAt), "MMM d, yyyy")}`
                        : "—"}
                    {subscription?.subscription?.cancelAtPeriodEnd && (
                      <span className="ml-2 text-xs font-normal text-amber-600">cancels at period end</span>
                    )}
                  </div>
                </div>
              </div>

              {subscription?.plan && publicPlans.length > 0 && (
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="space-y-1 min-w-52">
                    <Label className="text-xs">Change plan</Label>
                    <select
                      className="w-full border rounded px-3 py-2 text-sm bg-card"
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                    >
                      <option value="">Select a plan...</option>
                      {publicPlans.map((p: any) => (
                        <option key={p.id} value={p.id} disabled={p.id === subscription.plan.id}>
                          {p.name} — {p.currency} {Number(p.basePrice).toFixed(2)}/{p.billingCycle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    size="sm"
                    disabled={!selectedPlanId || checkoutMutation.isPending}
                    onClick={() => checkoutMutation.mutate()}
                  >
                    {checkoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    {subscription?.subscription ? "Change Plan" : "Subscribe"}
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {subscription?.subscription?.stripeSubscriptionId && (
                  <Button size="sm" variant="outline" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
                    {portalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    Manage Billing
                  </Button>
                )}
                {subscription?.subscription?.stripeSubscriptionId && !subscription.subscription.cancelAtPeriodEnd && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Cancel your subscription at the end of the current billing period?")) cancelMutation.mutate();
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    <Ban className="w-4 h-4" />
                    Cancel Subscription
                  </Button>
                )}
              </div>
              {!subscription?.stripeConfigured && (
                <p className="text-xs text-muted-foreground">
                  Online billing is not configured yet. Contact support to activate card payments.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

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