import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { subDays } from "date-fns";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "ANALYTICS_ADV");
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate") || subDays(new Date(), 30).toISOString().split("T")[0];
    const endDate = url.searchParams.get("endDate") || new Date().toISOString().split("T")[0];

    const start = new Date(startDate);
    const end = new Date(endDate);

    const results = await db.select({
      hour: sql<number>`EXTRACT(HOUR FROM ${appointments.startTime})::int`,
      dayOfWeek: sql<number>`EXTRACT(DOW FROM ${appointments.startTime})::int`,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(appointments)
      .where(and(
        eq(appointments.tenantId, tenantId),
        gte(appointments.startTime, start),
        lte(appointments.startTime, end),
      ))
      .groupBy(
        sql`EXTRACT(HOUR FROM ${appointments.startTime})`,
        sql`EXTRACT(DOW FROM ${appointments.startTime})`,
      )
      .orderBy(sql`dayOfWeek ASC, hour ASC`);

    // Fill all 168 cells (24h × 7 days)
    const heatmap: { hour: number; dayOfWeek: number; count: number }[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const found = results.find(r => r.hour === hour && r.dayOfWeek === day);
        heatmap.push({ hour, dayOfWeek: day, count: found?.count || 0 });
      }
    }

    return apiSuccess({ heatmap });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
