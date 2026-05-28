"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AttendanceCalendar } from "@/components/staff/attendance-calendar";

export default function StaffDetailPage() {
  const { id } = useParams();

  const { data: profileData } = useQuery({
    queryKey: ["staff-profile", id],
    queryFn: () => fetch(`/api/tenant/staff/${id}`).then(res => res.json())
  });

  const profile = profileData?.data;

  if (!profile) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading stylist profile...</div>;
  }

  return (
    <FeatureGate feature="STAFF_MGMT">
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
            {profile.user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{profile.user?.name}</h2>
            <p className="text-sm text-muted-foreground">{profile.designation || "Stylist"} — {profile.user?.email}</p>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="payroll">Payroll Summary</TabsTrigger>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="py-4">
            <FeatureGate feature="ATTENDANCE">
              <AttendanceCalendar staffId={profile.id} />
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
