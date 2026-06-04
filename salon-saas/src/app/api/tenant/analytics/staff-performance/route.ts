import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { appointments, staff, users } from "@/lib/db/schema";
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

    const { startDate, endDate } = parsed.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const results = await db.select({
      staffId: staff.id,
      name: users.name,
      appointmentsCompleted: sql<number>`COUNT(*)::int`,
      servicesCount: sql<number>`COUNT(*)::int`,
    })
      .from(appointments)
      .innerJoin(staff, eq(appointments.staffId, staff.id))
      .innerJoin(users, eq(staff.userId, users.id))
      .where(and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.status, "completed"),
        gte(appointments.startTime, start),
        lte(appointments.startTime, end),
      ))
      .groupBy(staff.id, users.name);

    return apiSuccess({
      staff: results.map(r => ({
        staffId: r.staffId,
        name: r.name,
        appointmentsCompleted: r.appointmentsCompleted,
        servicesCount: r.servicesCount,
      })),
    });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
