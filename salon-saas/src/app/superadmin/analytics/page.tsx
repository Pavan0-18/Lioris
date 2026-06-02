"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BoneyardPage } from "@/components/ui/boneyard";

export default function SuperadminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["superadmin-stats"],
    queryFn: () => fetch("/api/superadmin/stats").then(res => res.json()),
    refetchInterval: 30000,
  });

  const stats = data?.data;

  if (isLoading) {
    return <BoneyardPage />;
  }

  const overviewCards = [
    { label: "Total Tenants", value: stats.totalTenants, icon: Layers, sub: `${stats.onboardedTenants} onboarded` },
    { label: "Active", value: stats.activeTenants, icon: CheckCircle, sub: `${((stats.activeTenants / stats.totalTenants) * 100).toFixed(0)}% of total` },
    { label: "Trialing", value: stats.trialingTenants, icon: TrendingUp, sub: `${stats.recentSignups} signed up in last 30d` },
    { label: "Suspended", value: stats.suspendedTenants, icon: AlertTriangle, sub: `${((stats.suspendedTenants / stats.totalTenants) * 100).toFixed(0)}% of total` },
    { label: "Total Users", value: stats.totalUsers, icon: Users, sub: `across all tenants` },
    { label: "MRR", value: `$${stats.totalMRR.toFixed(2)}`, icon: DollarSign, sub: `active subscriptions` },
    { label: "30d Actions", value: stats.recentActions, icon: Activity, sub: `audit events` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Platform Analytics</h2>
        <p className="text-sm text-muted-foreground">Real-time metrics across the entire platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Status Breakdown</CardTitle>
            <CardDescription>Active vs trialing vs suspended</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell><Badge>Active</Badge></TableCell>
                  <TableCell className="text-right font-bold">{stats.activeTenants}</TableCell>
                  <TableCell className="text-right">{((stats.activeTenants / stats.totalTenants) * 100).toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Badge variant="secondary">Trialing</Badge></TableCell>
                  <TableCell className="text-right font-bold">{stats.trialingTenants}</TableCell>
                  <TableCell className="text-right">{((stats.trialingTenants / stats.totalTenants) * 100).toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Badge variant="destructive">Suspended</Badge></TableCell>
                  <TableCell className="text-right font-bold">{stats.suspendedTenants}</TableCell>
                  <TableCell className="text-right">{((stats.suspendedTenants / stats.totalTenants) * 100).toFixed(1)}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signups by Month</CardTitle>
            <CardDescription>Tenant registration trend</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">New Tenants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats.signupsByMonth || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-6 text-xs text-muted-foreground">No data yet.</TableCell>
                  </TableRow>
                ) : (
                  (stats.signupsByMonth || []).map((row: any) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-semibold text-sm">{row.month}</TableCell>
                      <TableCell className="text-right font-bold">{row.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
