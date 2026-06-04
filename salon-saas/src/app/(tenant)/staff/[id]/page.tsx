"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AttendanceCalendar } from "@/components/staff/attendance-calendar";
import { ShiftScheduler } from "@/components/staff/shift-scheduler";
import { LeaveRequests } from "@/components/staff/leave-requests";
import { toast } from "sonner";
import { Scissors, Loader2, CalendarRange, Umbrella } from "lucide-react";

export default function StaffDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: profileData } = useQuery({
    queryKey: ["staff-profile", id],
    queryFn: () => fetch(`/api/tenant/staff/${id}`).then(res => res.json())
  });

  const { data: servicesData } = useQuery({
    queryKey: ["staff-services", id],
    queryFn: () => fetch(`/api/tenant/staff/${id}/services`).then(res => res.json())
  });

  const { data: allServicesData } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetch("/api/tenant/services").then(res => res.json()),
  });

  const profile = profileData?.data;
  const assignedServices = servicesData?.data || [];
  const allServices = allServicesData?.data || [];

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [commissionRates, setCommissionRates] = React.useState<Record<string, number>>({});
  const [savingServices, setSavingServices] = React.useState(false);

  React.useEffect(() => {
    if (assignedServices.length > 0) {
      setSelectedIds(assignedServices.map((s: any) => s.serviceId));
      const rates: Record<string, number> = {};
      assignedServices.forEach((s: any) => { rates[s.serviceId] = s.commissionPct; });
      setCommissionRates(rates);
    }
  }, [assignedServices]);

  const saveServicesMutation = useMutation({
    mutationFn: async () => {
      setSavingServices(true);
      const payload = {
        services: selectedIds.map(sid => ({
          serviceId: sid,
          commissionPct: commissionRates[sid] || 0,
        }))
      };
      const res = await fetch(`/api/tenant/staff/${id}/services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("Services updated");
      queryClient.invalidateQueries({ queryKey: ["staff-services", id] });
    },
    onError: () => toast.error("Failed to update services"),
    onSettled: () => setSavingServices(false),
  });

  if (!profile) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading stylist profile...</div>;
  }

  return (
    <FeatureGate feature="STAFF_MGMT">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
            {profile.user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-playfair text-2xl font-bold tracking-tight">{profile.user?.name}</h2>
            <p className="text-sm text-muted-foreground">{profile.designation || "Stylist"} — {profile.user?.email}</p>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-6 max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal & Employment Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block">Employee Code</span>
                  <span className="font-semibold">{profile.employeeCode || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Salary Structure</span>
                  <span className="font-semibold">${profile.baseSalary} / {profile.salaryType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Role</span>
                  <span className="font-semibold capitalize">{profile.role?.toLowerCase()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block">Status</span>
                  <Badge variant={profile.isActive ? "default" : "secondary"} className="text-[10px]">
                    {profile.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {profile.designation && (
                  <div>
                    <span className="text-muted-foreground text-xs block">Designation</span>
                    <span className="font-semibold">{profile.designation}</span>
                  </div>
                )}
                {profile.joiningDate && (
                  <div>
                    <span className="text-muted-foreground text-xs block">Joined</span>
                    <span className="font-semibold">{new Date(profile.joiningDate).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="py-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-primary" />
                  Assigned Services & Commission
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No services configured yet. Add services in Settings &rarr; Services Catalog first.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto border rounded-lg p-3">
                    {allServices.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`svc-${s.id}`}
                            checked={selectedIds.includes(s.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds(prev => [...prev, s.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(sid => sid !== s.id));
                                const { [s.id]: _, ...rest } = commissionRates;
                                setCommissionRates(rest);
                              }
                            }}
                          />
                          <Label htmlFor={`svc-${s.id}`} className="text-sm cursor-pointer">
                            {s.name}
                            <span className="text-xs text-muted-foreground ml-2">
                              {s.duration}min | ${Number(s.price).toFixed(2)}
                            </span>
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Comm%</span>
                          <Input
                            type="number"
                            disabled={!selectedIds.includes(s.id)}
                            value={selectedIds.includes(s.id) ? (commissionRates[s.id] ?? 0) : 0}
                            onChange={(e) => setCommissionRates(prev => ({ ...prev, [s.id]: Number(e.target.value) }))}
                            className="w-16 h-7 text-xs text-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end mt-4">
                  <Button onClick={() => saveServicesMutation.mutate()} disabled={savingServices || allServices.length === 0}>
                    {savingServices ? "Saving..." : "Save Assignments"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="py-4">
            <FeatureGate feature="STAFF_MGMT">
              <ShiftScheduler staffId={profile.id} />
            </FeatureGate>
          </TabsContent>

          <TabsContent value="attendance" className="py-4">
            <FeatureGate feature="ATTENDANCE">
              <AttendanceCalendar staffId={profile.id} />
            </FeatureGate>
          </TabsContent>

          <TabsContent value="leave" className="py-4">
            <FeatureGate feature="STAFF_MGMT">
              <LeaveRequests staffId={profile.id} staffName={profile.user?.name} />
            </FeatureGate>
          </TabsContent>

          <TabsContent value="payroll" className="py-4">
            <FeatureGate feature="PAYROLL">
              <Card>
                <CardHeader>
                  <CardTitle>Historical Payroll & Commissions</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  No payroll data found for current year. Use Staff Payroll tab to auto-generate monthly drafts.
                </CardContent>
              </Card>
            </FeatureGate>
          </TabsContent>
        </Tabs>
      </div>
    </FeatureGate>
  );
}
