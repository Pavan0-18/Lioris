"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureGate } from "@/components/feature-gate";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BoneyardTable } from "@/components/ui/boneyard";
import { BarChart3, DollarSign, Scissors, Star, TrendingUp } from "lucide-react";

export default function StaffPerformancePage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = React.useState(firstOfMonth.toISOString().split("T")[0]);
  const [to, setTo] = React.useState(today.toISOString().split("T")[0]);

  const { data: perfData, isLoading } = useQuery({
    queryKey: ["staff-performance", from, to],
    queryFn: () =>
      fetch(`/api/tenant/staff/performance?from=${from}&to=${to}`).then(res => res.json()),
    staleTime: 2 * 60 * 1000,
  });

  const metrics = perfData?.data || [];

  const totalRevenue = metrics.reduce((sum: number, m: any) => sum + Number(m.totalRevenue), 0);
  const totalAppointments = metrics.reduce((sum: number, m: any) => sum + Number(m.appointmentCount), 0);

  if (isLoading) return <BoneyardTable rows={5} cols={5} />;

  return (
    <FeatureGate feature="STAFF_MGMT">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Staff Performance</h2>
            <p className="text-sm text-muted-foreground">
              Service counts, revenue, and appointments per staff member.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-36 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-36 h-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Total Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalAppointments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${Number(totalRevenue).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Active Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metrics.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Staff Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead className="text-center">Appointments</TableHead>
                  <TableHead className="text-center">Services Performed</TableHead>
                  <TableHead className="text-right">Revenue Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-xs text-muted-foreground">
                      No performance data for the selected date range.
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.map((m: any, idx: number) => (
                    <TableRow key={m.staffId || idx}>
                      <TableCell className="font-semibold text-sm">{m.staffName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          <Scissors className="w-3 h-3 mr-1" /> {m.appointmentCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">{m.serviceCount}</TableCell>
                      <TableCell className="text-right font-semibold text-teal-600">
                        ${Number(m.totalRevenue).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
