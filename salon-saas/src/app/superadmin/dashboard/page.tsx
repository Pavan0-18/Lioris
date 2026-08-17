import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { tenants, plans, tenantSubscriptions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { Layers, DollarSign, CreditCard, Activity } from "lucide-react";

export default async function SuperAdminDashboardPage() {
  const [allTenants, activePlans, activeSubscriptions] = await Promise.all([
    db.select().from(tenants),
    db.select({
      id: plans.id,
      name: plans.name,
      basePrice: plans.basePrice,
      currency: plans.currency,
    }).from(plans).where(eq(plans.isActive, true)),
    db.select({ count: sql<number>`count(*)::int` })
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.status, "active")),
  ]);

  const planMap = new Map(activePlans.map((p) => [p.id, p]));

  const payingTenants = allTenants.filter((t) => t.planStatus === "active");
  const trialingTenants = allTenants.filter((t) => t.planStatus === "trialing");

  const mrrByCurrency = new Map<string, number>();
  for (const t of [...payingTenants, ...trialingTenants]) {
    const plan = t.planId ? planMap.get(t.planId) : null;
    if (!plan) continue;
    const currency = plan.currency || "USD";
    mrrByCurrency.set(currency, (mrrByCurrency.get(currency) || 0) + plan.basePrice);
  }

  const mrrLines = [...mrrByCurrency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([currency, amount]) => ({ currency, amount }));

  const totalMRR = mrrLines.reduce((sum, l) => sum + l.amount, 0);
  const displayMRR =
    mrrLines.length === 1
      ? `${mrrLines[0].currency} ${totalMRR.toFixed(2)}`
      : mrrLines.map((l) => `${l.currency} ${l.amount.toFixed(2)}`).join(" + ");

  const stats = [
    { label: "Total Salon Workspaces", value: String(allTenants.length), icon: Layers },
    { label: "Active Subscriptions", value: String(activeSubscriptions[0]?.count || 0), icon: CreditCard },
    { label: "MRR (All Currencies)", value: displayMRR, icon: DollarSign },
    { label: "Trialing Workspaces", value: String(trialingTenants.length), icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SuperAdmin Control Panel</h1>
        <p className="text-sm text-muted-foreground">Monitor platform tenants, plans, and subscriptions.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Active Tenants</TableHead>
                <TableHead className="text-right">Monthly Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activePlans.map((p) => {
                const activeCount = payingTenants.filter((t) => t.planId === p.id).length;
                const trialCount = trialingTenants.filter((t) => t.planId === p.id).length;
                const revenue = (activeCount + trialCount) * p.basePrice;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold text-sm">{p.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.currency} {p.basePrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{activeCount} active</Badge>
                      {trialCount > 0 && <span className="ml-2 text-muted-foreground">{trialCount} trialing</span>}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {p.currency} {revenue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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