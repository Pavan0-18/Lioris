import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { appointments, customers, invoices, payments, staff, users } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  Calendar, DollarSign, UserCheck, Users, TrendingUp, Sparkles,
  Receipt, PiggyBank, Clock,
} from "lucide-react";
import Link from "next/link";

export default async function TenantDashboardPage() {
  const session = await auth();
  if (!session || !session.user) redirect("/login");
  const tenantId = session.user.tenantId || "";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── Today's appointments ──
  const apptsToday = await db.select()
    .from(appointments)
    .where(and(eq(appointments.tenantId, tenantId), gte(appointments.startTime, todayStart), lte(appointments.startTime, todayEnd)));

  // ── Today's revenue ──
  const paymentsToday = await db.select({ amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), gte(payments.paidAt, todayStart), lte(payments.paidAt, todayEnd)));
  const todayRevenue = paymentsToday.reduce((s, p) => s + Number(p.amount), 0);

  // ── Invoices today ──
  const invoicesToday = await db.select({ total: invoices.total, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), gte(invoices.createdAt, todayStart), lte(invoices.createdAt, todayEnd)));
  const draftInvoices = invoicesToday.filter((i) => i.status === "draft");
  const paidInvoices = invoicesToday.filter((i) => i.status === "paid");
  const pendingInvoices = invoicesToday.filter((i) => i.status === "partial");

  // ── Customer count ──
  const [customerCount] = await db.select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.isActive, true)));

  // ── Total loyalty points across all customers ──
  const [loyaltyResult] = await db.select({ total: sql<number>`coalesce(sum(loyalty_points), 0)` })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.isActive, true)));
  const totalLoyaltyPoints = loyaltyResult?.total ?? 0;

  // ── Staff count ──
  const [staffCount] = await db.select({ count: sql<number>`count(*)` })
    .from(staff)
    .where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)));

  // ── Recent appointments ──
  const recentAppts = await db.select()
    .from(appointments)
    .where(eq(appointments.tenantId, tenantId))
    .orderBy(sql`${appointments.startTime} desc`)
    .limit(10);

  const allCustomers = await db.select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.isActive, true)));
  const customerMap = new Map(allCustomers.map((c) => [c.id, c.name]));

  const staffList = await db.select()
    .from(staff)
    .leftJoin(users, eq(staff.userId, users.id))
    .where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)));
  const staffUserMap = new Map(staffList.map((s) => [s.staff.id, s.users]));

  const stats = [
    { label: "Today's Revenue", value: `$${todayRevenue.toFixed(2)}`, icon: DollarSign, change: `${paidInvoices.length} paid` },
    { label: "Appointments", value: apptsToday.length, icon: Calendar, change: `${apptsToday.filter(a => a.status === "completed").length} completed` },
    { label: "Active Customers", value: customerCount?.count ?? 0, icon: UserCheck, change: `${draftInvoices.length} new today` },
    { label: "Loyalty Points", value: totalLoyaltyPoints, icon: PiggyBank, change: `${pendingInvoices.length} pending` },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-playfair text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground/80 mt-1">Monitor performance, schedules, and revenue at a glance</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs text-primary/70">
          <Sparkles className="w-3 h-3" />
          <span>Live</span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="relative overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-primary/[0.03] group-hover:bg-primary/[0.06] transition-all duration-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <div className="p-2 rounded-xl bg-primary/5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-muted-foreground/70">{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Appointments</CardTitle>
            <Link href="/appointments" className="text-xs text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Stylist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAppts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground/60">
                      No appointments booked yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentAppts.map((appt) => {
                    const customerName = appt.customerId ? customerMap.get(appt.customerId) : "Unknown";
                    const user = appt.staffId ? staffUserMap.get(appt.staffId) : null;
                    return (
                      <TableRow key={appt.id}>
                        <TableCell className="font-medium">{customerName ?? "Unknown"}</TableCell>
                        <TableCell className="text-muted-foreground">{user?.name ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <Badge variant={appt.status === "completed" ? "success" : appt.status === "cancelled" ? "destructive" : "default"}>
                            {appt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">
                          {new Date(appt.startTime).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Today's Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesToday.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground/60">No invoices created today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{draftInvoices.length}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Draft</div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{pendingInvoices.length}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Partial</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{paidInvoices.length}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Paid</div>
                  </div>
                </div>
                <Link href="/billing" className="block text-center text-xs text-primary hover:underline pt-2">
                  Go to Billing
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
