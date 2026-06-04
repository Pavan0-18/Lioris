import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers, appointments, invoices } from "@/lib/db/schema";
import { and, eq, gte, lte, sql, count, lt } from "drizzle-orm";
import { analyticsQuerySchema } from "@/lib/validators/analytics";
import { subDays } from "date-fns";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "ANALYTICS_ADV");
    const url = new URL(req.url);
    const query = Object.fromEntries(url.searchParams);
    if (!query.startDate) query.startDate = subDays(new Date(), 30).toISOString().split("T")[0];
    if (!query.endDate) query.endDate = new Date().toISOString().split("T")[0];
    const parsed = analyticsQuerySchema.safeParse(query);
    if (!parsed.success) return apiError("Invalid query params", "VALIDATION_ERROR", 400);

    const { startDate, endDate } = parsed.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const [newCustomers] = await db.select({ count: count() })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), gte(customers.createdAt, start), lte(customers.createdAt, end)));

    const activeBefore = await db.select({ count: count() })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), lt(customers.createdAt, start)))
      .then(r => r[0]?.count || 0);

    const [returningResult] = await db.select({
      count: sql<number>`COUNT(DISTINCT ${appointments.customerId})::int`,
    })
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.status, "completed"),
        gte(appointments.startTime, start),
        lte(appointments.startTime, end),
      ));

    const returningCustomers = returningResult?.count || 0;
    const totalActive = activeBefore + (newCustomers?.count || 0);
    const retentionRate = totalActive > 0 ? (returningCustomers / totalActive) * 100 : 0;

    const freqRows = await db.execute(
      sql`SELECT COALESCE(
        COUNT(*)::real / NULLIF(COUNT(DISTINCT ${appointments.customerId}), 0), 0
      ) as avg_freq
      FROM ${appointments}
      WHERE ${appointments.tenantId} = ${tenantId}
      AND ${appointments.status} = 'completed'
      AND ${appointments.startTime} >= ${start}
      AND ${appointments.startTime} <= ${end}`,
    );
    const avgFreq = Number((freqRows as any).rows?.[0]?.avg_freq ?? 0);

    // Top 5 customers by revenue
    const topCustomers = await db.select({
      name: customers.name,
      visits: sql<number>`COUNT(DISTINCT ${appointments.id})::int`,
      revenue: sql<number>`COALESCE(SUM(${invoices.total})::real, 0)`,
    })
      .from(customers)
      .innerJoin(appointments, eq(appointments.customerId, customers.id))
      .innerJoin(invoices, eq(invoices.appointmentId, appointments.id))
      .where(and(
        eq(customers.tenantId, tenantId),
        eq(appointments.status, "completed"),
        gte(appointments.startTime, start),
        lte(appointments.startTime, end),
        sql`${invoices.status} IN ('paid', 'partial')`,
      ))
      .groupBy(customers.name)
      .orderBy(sql`revenue DESC`)
      .limit(5);

    return apiSuccess({
      newCustomers: newCustomers?.count || 0,
      returningCustomers,
      retentionRate: Math.round(retentionRate * 100) / 100,
      averageVisitFrequency: avgFreq,
      topCustomers,
    });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
