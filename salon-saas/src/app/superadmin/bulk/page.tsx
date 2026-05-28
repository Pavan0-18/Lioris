"use client";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SuperadminBulkPage() {
  const [featureKey, setFeatureKey] = React.useState("");
  const [isEnabled, setIsEnabled] = React.useState(true);
  const [tenantFilter, setTenantFilter] = React.useState("all");

  const { data: featuresData } = useQuery({
    queryKey: ["bulk-features"],
    queryFn: () => fetch("/api/superadmin/bulk/features").then(res => res.json()),
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
              {bulkMutation.isPending ? "Applying..." : "Apply to All"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Notify</CardTitle>
            <CardDescription>Send email notification to all tenants (coming soon).</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground py-8 text-center">
            Email notification system will be available after integrating a mail provider.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
