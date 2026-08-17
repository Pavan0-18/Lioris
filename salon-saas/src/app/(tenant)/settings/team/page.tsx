"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StaffTable } from "@/components/staff/staff-table";
import { BoneyardPage, BoneyardCard } from "@/components/ui/boneyard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Percent, Save } from "lucide-react";

export default function SettingsTeamPage() {
  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = React.useState("");
  const [commissionPcts, setCommissionPcts] = React.useState<Record<string, number>>({});

  const { data: staffData, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetch("/api/tenant/staff").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetch("/api/tenant/services").then(res => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["staff-services", selectedStaffId],
    queryFn: () => fetch(`/api/tenant/staff/${selectedStaffId}/services`).then(res => res.json()),
    enabled: !!selectedStaffId,
    staleTime: 30 * 1000,
  });

  const staffList = staffData?.data || [];
  const serviceList = servicesData?.data || [];

  React.useEffect(() => {
    if (assignmentsData?.data) {
      const map: Record<string, number> = {};
      assignmentsData.data.forEach((a: any) => {
        map[a.serviceId] = a.commissionPct;
      });
      setCommissionPcts(map);
    }
  }, [assignmentsData]);

  const saveCommissionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tenant/staff/${selectedStaffId}/services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: serviceList.map((s: any) => ({
            serviceId: s.id,
            commissionPct: Math.max(0, Math.min(100, commissionPcts[s.id] || 0)),
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save commission mapping");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Commission mapping saved");
      queryClient.invalidateQueries({ queryKey: ["staff-services", selectedStaffId] });
    },
    onError: () => toast.error("Failed to save commission mapping"),
  });

  if (isLoading) {
    return <BoneyardPage />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Team Configuration</h2>
        <p className="text-sm text-muted-foreground">Manage your team members and commission mappings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Percent className="w-4 h-4 text-primary" />
            Commission Mapping
          </CardTitle>
          <CardDescription>
            Set the commission percentage each stylist earns per service. Unassigned services earn 0%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Stylist</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Select a team member..." />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStaffId && (
            assignmentsLoading ? (
              <BoneyardCard rows={4} />
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {serviceList.map((svc: any) => (
                    <div key={svc.id} className="rounded-lg border p-3 space-y-1.5">
                      <div>
                        <div className="text-sm font-medium truncate">{svc.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {svc.duration} min · {Number(svc.price || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          className="w-24 h-8 text-sm"
                          value={commissionPcts[svc.id] ?? ""}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCommissionPcts((prev) => ({
                              ...prev,
                              [svc.id]: isNaN(val) ? 0 : val,
                            }));
                          }}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => saveCommissionMutation.mutate()}
                    disabled={saveCommissionMutation.isPending}
                  >
                    {saveCommissionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Commission Mapping
                  </Button>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
          <CardDescription>All staff members in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <StaffTable staffList={staffList} />
        </CardContent>
      </Card>
    </div>
  );
}