import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { Layers, DollarSign, Activity } from "lucide-react";

export default async function SuperAdminDashboardPage() {
  const allTenants = await db.select().from(tenants);

  // Filter plans
  const totalMRR = allTenants.reduce((sum, t) => sum + 49.00, 0); // Mock MRR calculation

  const stats = [
    { label: "Total Salon Workspaces", value: allTenants.length, icon: Layers },
    { label: "Active MRR (All Currencies)", value: `$${totalMRR.toFixed(2)}`, icon: DollarSign },
    { label: "System Uptime & Rate", value: "99.98%", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SuperAdmin Control Panel</h1>
        <p className="text-sm text-muted-foreground">Monitor platform tenants, features, and subscriptions.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tenant Signups</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salon Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan Status</TableHead>
                <TableHead className="text-right">Registered On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                    No tenants registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                allTenants.slice(0, 10).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold text-sm">{t.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.planStatus.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
