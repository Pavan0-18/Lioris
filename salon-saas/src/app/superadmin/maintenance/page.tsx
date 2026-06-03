"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BoneyardPage } from "@/components/ui/boneyard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Wrench } from "lucide-react";

export default function MaintenancePage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-maintenance"],
    queryFn: () => fetch("/api/superadmin/maintenance").then(r => r.json()),
  });

  const mutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/superadmin/maintenance", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["superadmin-maintenance"] }),
  });

  if (isLoading) return <BoneyardPage />;

  const config = data?.data || {};
  const isEnabled = config.maintenanceMode;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maintenance Mode</h1>
        <p className="text-sm text-muted-foreground">Enable or disable platform-wide maintenance mode.</p>
      </div>

      <Card className={`p-6 ${isEnabled ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20" : ""}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`h-6 w-6 ${isEnabled ? "text-yellow-600" : "text-muted-foreground"}`} />
            <div>
              <p className="font-semibold text-lg">Maintenance Mode {isEnabled ? "Active" : "Inactive"}</p>
              <p className="text-sm text-muted-foreground">
                {isEnabled
                  ? "All tenant users will see a maintenance message and cannot access the platform."
                  : "The platform is operating normally."}
              </p>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => mutation.mutate({ maintenanceMode: checked, maintenanceMessage: config.maintenanceMessage })}
          />
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.target as HTMLFormElement);
          mutation.mutate({
            maintenanceMode: isEnabled,
            maintenanceMessage: fd.get("message") as string,
          });
        }} className="space-y-4">
          <div>
            <Label>Maintenance Message</Label>
            <Input
              name="message"
              defaultValue={config.maintenanceMessage || ""}
              placeholder="We'll be back soon! Scheduled maintenance in progress..."
            />
          </div>
          <Button type="submit" variant="outline" size="sm">Save Message</Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-2">How it works</h3>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>When enabled, all non-authenticated and tenant users will be redirected to a maintenance page</li>
          <li>Super admins can still access the admin panel during maintenance</li>
          <li>API requests from tenants will return a 503 Service Unavailable response</li>
          <li>The maintenance message is shown on the maintenance page</li>
        </ul>
      </Card>
    </div>
  );
}
