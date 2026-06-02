"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function SuperadminConfigPage() {
  const { data: configData, refetch } = useQuery({
    queryKey: ["superadmin-config"],
    queryFn: () => fetch("/api/superadmin/config").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: plansData } = useQuery({
    queryKey: ["superadmin-plans"],
    queryFn: () => fetch("/api/superadmin/plans").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const config = configData?.data;
  const plansList = plansData?.data || [];

  const [form, setForm] = React.useState({
    defaultTrialDays: 14,
    defaultCurrency: "INR",
    defaultCountry: "IN",
    defaultTimezone: "Asia/Kolkata",
    defaultPlanId: "",
    allowPublicSignup: true,
  });

  React.useEffect(() => {
    if (config) {
      setForm({
        defaultTrialDays: config.defaultTrialDays ?? 14,
        defaultCurrency: config.defaultCurrency ?? "INR",
        defaultCountry: config.defaultCountry ?? "IN",
        defaultTimezone: config.defaultTimezone ?? "Asia/Kolkata",
        defaultPlanId: config.defaultPlanId ?? "",
        allowPublicSignup: config.allowPublicSignup ?? true,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/superadmin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Configuration saved");
      refetch();
    },
    onError: () => toast.error("Failed to save config"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Configuration</h2>
        <p className="text-sm text-muted-foreground">Platform-wide defaults and settings.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Platform Defaults</CardTitle>
          <CardDescription>These values are used when new tenants sign up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Trial Days</Label>
              <Input type="number" value={form.defaultTrialDays} onChange={(e) => setForm({ ...form, defaultTrialDays: parseInt(e.target.value) || 14 })} />
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <select className="w-full border rounded px-3 py-2 text-sm bg-card" value={form.defaultCurrency} onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Default Country</Label>
              <select className="w-full border rounded px-3 py-2 text-sm bg-card" value={form.defaultCountry} onChange={(e) => setForm({ ...form, defaultCountry: e.target.value })}>
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Default Timezone</Label>
              <select className="w-full border rounded px-3 py-2 text-sm bg-card" value={form.defaultTimezone} onChange={(e) => setForm({ ...form, defaultTimezone: e.target.value })}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Default Plan</Label>
              <select className="w-full border rounded px-3 py-2 text-sm bg-card" value={form.defaultPlanId} onChange={(e) => setForm({ ...form, defaultPlanId: e.target.value })}>
                <option value="">None (no plan assigned)</option>
                {plansList.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} (${p.basePrice}/{p.billingCycle})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <Label>Allow Public Signup</Label>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={form.allowPublicSignup} onCheckedChange={(v) => setForm({ ...form, allowPublicSignup: v })} />
                <span className="text-sm text-muted-foreground">{form.allowPublicSignup ? "Enabled" : "Disabled"}</span>
              </div>
            </div>
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
