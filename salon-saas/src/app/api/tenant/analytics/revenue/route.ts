import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
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

    const { startDate, endDate, groupBy, branchId } = parsed.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const conditions = and(
      eq(payments.tenantId, tenantId),
      gte(payments.paidAt, start),
      lte(payments.paidAt, end),
    );

    let groupExpr: any;
    let selectExpr: any;

    if (groupBy === "day") {
      groupExpr = sql<string>`DATE(${payments.paidAt})`;
      selectExpr = sql<string>`DATE(${payments.paidAt})`;
    } else if (groupBy === "week") {
      groupExpr = sql<string>`DATE_TRUNC('week', ${payments.paidAt})`;
      selectExpr = sql<string>`DATE_TRUNC('week', ${payments.paidAt})`;
    } else {
      groupExpr = sql<string>`DATE_TRUNC('month', ${payments.paidAt})`;
      selectExpr = sql<string>`DATE_TRUNC('month', ${payments.paidAt})`;
    }

    const series = await db.select({
      date: selectExpr,
      revenue: sql<number>`COALESCE(SUM(${payments.amount})::real, 0)`,
    })
      .from(payments)
      .where(conditions)
      .groupBy(groupExpr)
      .orderBy(sql`date ASC`);

    const [currentTotal] = await db.select({
      total: sql<number>`COALESCE(SUM(${payments.amount})::real, 0)`,
    })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), gte(payments.paidAt, start), lte(payments.paidAt, end)));

    const periodDuration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodDuration);
    const [prevTotal] = await db.select({
      total: sql<number>`COALESCE(SUM(${payments.amount})::real, 0)`,
    })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), gte(payments.paidAt, prevStart), lte(payments.paidAt, start)));

    const current = currentTotal?.total || 0;
    const previous = prevTotal?.total || 0;
    const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return apiSuccess({
      series,
      total: current,
      previousTotal: previous,
      changePercent: Math.round(changePercent * 100) / 100,
      changeDirection: changePercent >= 0 ? "up" : "down",
    });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
