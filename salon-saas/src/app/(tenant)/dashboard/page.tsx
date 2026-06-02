import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { appointments, customers, invoices, staff, users } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { Calendar, DollarSign, UserCheck, Users, AlertTriangle, Package, TrendingUp, Sparkles } from "lucide-react";
import Link from "next/link";
import { getAllStock } from "@/lib/inventory";

export default async function TenantDashboardPage() {
  const session = await auth();
  if (!session || !session.user) redirect("/login");
  const tenantId = session.user.tenantId || "";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const apptsList = await db.select()
    .from(appointments)
    .where(and(eq(appointments.tenantId, tenantId), gte(appointments.startTime, todayStart), lte(appointments.startTime, todayEnd)));

  const paidInvoices = await db.select({ total: invoices.total }).from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, "paid")));
  const customersList = await db.select().from(customers).where(eq(customers.tenantId, tenantId));
  const [staffCount] = await db.select({ count: sql<number>`count(*)` }).from(staff).where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)));

  const recentAppts = await db.select()
    .from(appointments)
    .where(eq(appointments.tenantId, tenantId))
    .orderBy(sql`${appointments.startTime} desc`)
    .limit(10);

  const customerMap = new Map(customersList.map((c) => [c.id, c]));

  const staffList = await db.select()
    .from(staff)
    .leftJoin(users, eq(staff.userId, users.id))
    .where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)));

  const staffUserMap = new Map(staffList.map((s) => [s.staff.id, s.users]));

  const totalRevenue = paidInvoices.reduce((sum, item) => sum + item.total, 0);

  let allStock: any[] = [];
  try { allStock = await getAllStock(tenantId); } catch {}
  const lowStockItems = allStock.filter((p: any) => p.reorderLevel > 0 && p.stock <= p.reorderLevel);

  const stats = [
    { label: "Today's Appointments", value: apptsList.length, icon: Calendar, change: "+12%", trend: "up" },
    { label: "Total Paid Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, change: "+8%", trend: "up" },
    { label: "Active Customers", value: customersList.length, icon: UserCheck, change: "+5%", trend: "up" },
    { label: "Active Staff", value: staffCount?.count ?? 0, icon: Users, change: "0%", trend: "neutral" },
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
                  <TrendingUp className={`h-3 w-3 ${stat.trend === "up" ? "text-emerald-500" : "text-muted-foreground"}`} />
                  <span className="text-xs text-muted-foreground/70">{stat.change} vs last week</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Stylist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Schedule</TableHead>
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
                    const customer = customerMap.get(appt.customerId);
                    const user = appt.staffId ? staffUserMap.get(appt.staffId) : null;
                    return (
                      <TableRow key={appt.id}>
                        <TableCell className="font-medium">{customer?.name ?? "Unknown"}</TableCell>
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
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground/60">All products are well stocked.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.slice(0, 8).map((item: any) => {
                  const isOut = item.stock <= 0;
                  const isCritical = item.stock <= (item.reorderLevel / 2);
                  return (
                    <div key={item.productId} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        <Link href="/inventory/products" className="text-sm truncate hover:text-primary transition-colors">
                          {item.productName}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-semibold ${
                          isOut ? "text-destructive" : isCritical ? "text-amber-500" : "text-muted-foreground"
                        }`}>
                          {item.stock}
                        </span>
                        <Badge variant={isOut ? "destructive" : isCritical ? "warning" : "secondary"} className="text-[10px]">
                          {isOut ? "Out" : isCritical ? "Critical" : "Low"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {lowStockItems.length > 8 && (
                  <Link href="/inventory/products" className="text-xs text-primary hover:underline block text-center pt-2">
                    View all {lowStockItems.length} items
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
