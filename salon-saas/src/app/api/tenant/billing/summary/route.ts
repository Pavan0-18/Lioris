import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { payments, invoices, invoiceItems, appointments, services } from "@/lib/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { reportPeriodSchema } from "@/lib/validators/analytics";
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const url = new URL(req.url);
    const parsed = reportPeriodSchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return apiError("Invalid period", "VALIDATION_ERROR", 400);

    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let label: string;

    switch (parsed.data.period) {
      case "today":
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        label = "Today";
        break;
      case "yesterday":
        startDate = startOfDay(subDays(now, 1));
        endDate = endOfDay(subDays(now, 1));
        label = "Yesterday";
        break;
      case "week":
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfDay(now);
        label = "This Week";
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfDay(now);
        label = "This Month";
        break;
      case "custom":
        if (!parsed.data.startDate || !parsed.data.endDate) {
          return apiError("Custom period requires startDate and endDate", "VALIDATION_ERROR", 400);
        }
        startDate = new Date(parsed.data.startDate);
        endDate = new Date(parsed.data.endDate);
        label = `${parsed.data.startDate} – ${parsed.data.endDate}`;
        break;
    }

    // Revenue
    const [revenueResult] = await db.select({
      total: sql<number>`COALESCE(SUM(${payments.amount})::real, 0)`,
    })
      .from(payments)
      .where(and(
        eq(payments.tenantId, tenantId),
        gte(payments.paidAt, startDate),
        lte(payments.paidAt, endDate),
      ));

    // Revenue by method
    const byMethod = await db.select({
      method: payments.method,
      total: sql<number>`COALESCE(SUM(${payments.amount})::real, 0)`,
    })
      .from(payments)
      .where(and(
        eq(payments.tenantId, tenantId),
        gte(payments.paidAt, startDate),
        lte(payments.paidAt, endDate),
      ))
      .groupBy(payments.method);

    // Invoice count + avg
    const [invStats] = await db.select({
      count: sql<number>`count(*)::int`,
      averageValue: sql<number>`COALESCE(AVG(${invoices.total})::real, 0)`,
    })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        gte(invoices.createdAt, startDate),
        lte(invoices.createdAt, endDate),
        sql`${invoices.status} IN ('paid', 'partial')`,
      ));

    // Completed appointments
    const [apptResult] = await db.select({
      count: sql<number>`count(*)::int`,
    })
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.status, "completed"),
        gte(appointments.startTime, startDate),
        lte(appointments.startTime, endDate),
      ));

    // Top services
    const topServices = await db.select({
      name: services.name,
      revenue: sql<number>`COALESCE(SUM(${invoiceItems.lineTotal})::real, 0)`,
      count: sql<number>`count(*)::int`,
    })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .innerJoin(services, eq(invoiceItems.serviceId, services.id))
      .where(and(
        eq(invoices.tenantId, tenantId),
        gte(invoices.createdAt, startDate),
        lte(invoices.createdAt, endDate),
      ))
      .groupBy(services.name)
      .orderBy(sql`revenue DESC`)
      .limit(5);

    const revenueByMethod: Record<string, number> = {};
    byMethod.forEach(r => { revenueByMethod[r.method] = r.total; });

    return apiSuccess({
      period: { startDate, endDate, label },
      revenue: {
        total: revenueResult?.total || 0,
        byMethod: revenueByMethod,
      },
      invoices: {
        count: invStats?.count || 0,
        averageValue: invStats?.averageValue || 0,
      },
      appointments: {
        completed: apptResult?.count || 0,
      },
      topServices,
    });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
