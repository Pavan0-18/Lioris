"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Megaphone } from "lucide-react";

export default function SuperadminBulkPage() {
  const [featureKey, setFeatureKey] = React.useState("");
  const [isEnabled, setIsEnabled] = React.useState(true);
  const [tenantFilter, setTenantFilter] = React.useState("all");
  const [notifyTitle, setNotifyTitle] = React.useState("");
  const [notifyMessage, setNotifyMessage] = React.useState("");
  const [notifyFilter, setNotifyFilter] = React.useState("all");
  const [viaEmail, setViaEmail] = React.useState(true);

  const { data: featuresData } = useQuery({
    queryKey: ["bulk-features"],
    queryFn: () => fetch("/api/superadmin/bulk/features").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const featuresList = featuresData?.data || [];

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/superadmin/bulk/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey, isEnabled, tenantFilter }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`${data.featureName} ${data.isEnabled ? "enabled" : "disabled"} for ${data.affectedTenants} tenants`);
    },
    onError: () => toast.error("Bulk operation failed"),
  });

  const notifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/superadmin/bulk/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: notifyTitle, message: notifyMessage, tenantFilter: notifyFilter, viaEmail }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Notification sent to ${data.notified} owners${data.emailsSent > 0 ? ` (${data.emailsSent} emails)` : ""}`);
      setNotifyTitle("");
      setNotifyMessage("");
    },
    onError: () => toast.error("Bulk notify failed"),
  });

  const notifyDisabled = !notifyTitle.trim() || !notifyMessage.trim() || notifyMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Bulk Operations</h2>
        <p className="text-sm text-muted-foreground">Perform actions across multiple tenants at once.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Toggle Feature</CardTitle>
            <CardDescription>Enable or disable a feature for all tenants or a filtered subset.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Feature</Label>
              <select className="w-full border rounded px-3 py-2 text-sm bg-card" value={featureKey} onChange={(e) => setFeatureKey(e.target.value)}>
                <option value="">Select a feature...</option>
                {featuresList.map((f: any) => (
                  <option key={f.id} value={f.key}>{f.name} ({f.key})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <select className="w-full border rounded px-3 py-2 text-sm bg-card" value={isEnabled ? "enable" : "disable"} onChange={(e) => setIsEnabled(e.target.value === "enable")}>
                <option value="enable">Enable</option>
                <option value="disable">Disable</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Apply To</Label>
              <select className="w-full border rounded px-3 py-2 text-sm bg-card" value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
                <option value="all">All Tenants</option>
                <option value="active">Active Tenants Only</option>
                <option value="trialing">Trialing Tenants Only</option>
              </select>
            </div>
            <Button
              onClick={() => bulkMutation.mutate()}
              disabled={!featureKey || bulkMutation.isPending}
              className="w-full"
            >
              {bulkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Apply to All
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              Bulk Notify
            </CardTitle>
            <CardDescription>Send an announcement to all tenant owners via in-app notification and email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="e.g. Scheduled maintenance tonight at 2 AM"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                placeholder="Details of the announcement..."
                rows={4}
                maxLength={2000}
              />
            </div>
            <div className="space-y-2">
              <Label>Send To</Label>
              <select className="w-full border rounded px-3 py-2 text-sm bg-card" value={notifyFilter} onChange={(e) => setNotifyFilter(e.target.value)}>
                <option value="all">All Tenants</option>
                <option value="active">Active Tenants Only</option>
                <option value="paying">Paying Tenants Only</option>
                <option value="trialing">Trialing Tenants Only</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Also send by email</Label>
              <Switch checked={viaEmail} onCheckedChange={setViaEmail} />
            </div>
            <Button
              onClick={() => notifyMutation.mutate()}
              disabled={notifyDisabled}
              className="w-full"
            >
              {notifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
              {notifyMutation.isPending ? "Sending..." : "Send Announcement"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}