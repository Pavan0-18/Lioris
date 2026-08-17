"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail, MessageSquare, MessageCircle, CreditCard, ExternalLink, Ban } from "lucide-react";
import { format } from "date-fns";

const providers = [
  { id: "sendgrid", name: "SendGrid", icon: Mail, description: "Transactional email delivery", fields: [{ key: "apiKey", label: "API Key", type: "password" }, { key: "fromEmail", label: "From Email", type: "email" }] },
  { id: "twilio_sms", name: "Twilio SMS", icon: MessageSquare, description: "SMS notifications via Twilio", fields: [{ key: "accountSid", label: "Account SID", type: "text" }, { key: "authToken", label: "Auth Token", type: "password" }, { key: "fromNumber", label: "From Number", type: "text" }] },
  { id: "twilio_whatsapp", name: "Twilio WhatsApp", icon: MessageCircle, description: "WhatsApp messaging via Twilio", fields: [{ key: "accountSid", label: "Account SID", type: "text" }, { key: "authToken", label: "Auth Token", type: "password" }, { key: "fromNumber", label: "WhatsApp Number", type: "text" }] },
];

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [configs, setConfigs] = React.useState<Record<string, any>>({});
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
    queryKey: ["provider-configs"],
    queryFn: () => fetch("/api/tenant/settings/providers").then(res => res.json()),
  });

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => fetch("/api/tenant/billing/subscription").then(res => res.json()),
    staleTime: 30 * 1000,
  });

  const { data: plansData } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => fetch("/api/tenant/billing/plans").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (data?.data) {
      const map: Record<string, any> = {};
      data.data.forEach((p: any) => {
        map[p.provider] = { config: JSON.parse(p.config || "{}"), isActive: p.isActive };
      });
      setConfigs(map);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async ({ provider, config, isActive }: any) => {
      const res = await fetch("/api/tenant/settings/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, config, isActive }),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => toast.success("Provider configuration saved"),
    onError: () => toast.error("Failed to save configuration"),
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

  const updateConfig = (providerId: string, key: string, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        config: { ...(prev[providerId]?.config || {}), [key]: value },
      },
    }));
  };

  const toggleActive = (providerId: string) => {
    const current = configs[providerId];
    saveMutation.mutate({
      provider: providerId,
      config: current?.config || {},
      isActive: !current?.isActive,
    });
  };

  const subscription = subData?.data;
  const publicPlans = (plansData?.data || []).filter((p: any) => p.isPublic !== false);

  const planStatusLabel: Record<string, string> = {
    trialing: "Trialing",
    active: "Active",
    past_due: "Past Due",
    cancelled: "Cancelled",
    inactive: "Inactive",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-playfair text-2xl font-bold tracking-tight">Integrations</h2>
        <p className="text-muted-foreground/80 mt-1">Connect your email and messaging providers</p>
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

      {providers.map((provider) => {
        const Icon = provider.icon;
        const cfg = configs[provider.id];
        const isActive = cfg?.isActive || false;
        const config = cfg?.config || {};

        return (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <CardDescription>{provider.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {isActive ? "Active" : "Inactive"}
                  </span>
                  <Switch checked={isActive} onCheckedChange={() => toggleActive(provider.id)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {provider.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    type={field.type}
                    value={config[field.key] || ""}
                    onChange={(e) => updateConfig(provider.id, field.key, e.target.value)}
                    placeholder={`Enter ${field.label}`}
                  />
                </div>
              ))}
              <Button
                size="sm"
                onClick={() => saveMutation.mutate({ provider: provider.id, config, isActive })}
                disabled={saveMutation.isPending}
              >
                Save {provider.name} Settings
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
