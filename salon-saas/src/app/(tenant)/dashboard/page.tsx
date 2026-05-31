import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { appointments, customers, invoices, staff, users } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { Calendar, DollarSign, UserCheck, Users, AlertTriangle, Package } from "lucide-react";
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

  const customerMap = new Map(
    customersList.map((c) => [c.id, c])
  );

  const staffList = await db.select()
    .from(staff)
    .leftJoin(users, eq(staff.userId, users.id))
    .where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)));

  const staffUserMap = new Map(
    staffList.map((s) => [s.staff.id, s.users])
  );

  const totalRevenue = paidInvoices.reduce((sum, item) => sum + item.total, 0);

  let allStock: any[] = [];
  try {
    allStock = await getAllStock(tenantId);
  } catch {}
  const lowStockItems = allStock.filter((p: any) => p.reorderLevel > 0 && p.stock <= p.reorderLevel);

  const stats = [
    { label: "Today's Appointments", value: apptsList.length, icon: Calendar },
    { label: "Total Paid Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign },
    { label: "Active Customers", value: customersList.length, icon: UserCheck },
    { label: "Active Staff", value: staffCount?.count ?? 0, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">Monitor performance, stylist schedules, and revenue.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Stylist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Schedule</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAppts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                      No appointments booked yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentAppts.map((appt) => {
                    const customer = customerMap.get(appt.customerId);
                    const user = appt.staffId ? staffUserMap.get(appt.staffId) : null;
                    return (
                      <TableRow key={appt.id}>
                        <TableCell className="font-semibold text-sm">{customer?.name ?? "Unknown"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{user?.name ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{appt.status.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">
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
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                All products are well stocked.
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.slice(0, 8).map((item: any) => {
                  const isOut = item.stock <= 0;
                  const isCritical = item.stock <= (item.reorderLevel / 2);
                  return (
                    <div key={item.productId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <Link href="/inventory/products" className="truncate hover:underline">
                          {item.productName}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-medium ${
                          isOut ? "text-red-500" : isCritical ? "text-amber-500" : "text-yellow-500"
                        }`}>
                          {item.stock}
                        </span>
                        <Badge variant={isOut ? "destructive" : isCritical ? "secondary" : "outline"} className="text-[10px]">
                          {isOut ? "Out" : isCritical ? "Critical" : "Low"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {lowStockItems.length > 8 && (
                  <Link href="/inventory/products" className="text-xs text-blue-500 hover:underline block text-center pt-2">
                    View all {lowStockItems.length} low stock items
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
