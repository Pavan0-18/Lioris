import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { appointments, customers, staff, users, services, appointmentServices } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    const view = url.searchParams.get("view");

    let whereClause = eq(appointments.tenantId, tenantId) as any;

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      whereClause = and(whereClause, gte(appointments.startTime, dayStart), lte(appointments.startTime, dayEnd));
    }

    const list = await db.select()
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(staff, eq(appointments.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id))
      .where(whereClause)
      .orderBy(appointments.startTime);

    const mapped = await Promise.all(list.map(async (item) => {
      let apptServices: any[] = [];
      try {
        const svcRows = await db.select({ name: services.name })
          .from(appointmentServices)
          .innerJoin(services, eq(appointmentServices.serviceId, services.id))
          .where(eq(appointmentServices.appointmentId, item.appointments.id));
        apptServices = svcRows;
      } catch {}

      return {
        id: item.appointments.id,
        startTime: item.appointments.startTime,
        endTime: item.appointments.endTime,
        status: item.appointments.status,
        customer: item.customers,
        staff: item.staff ? { id: item.staff.id, user: item.users } : null,
        services: apptServices,
      };
    }));

    return apiSuccess(mapped);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();

    const [inserted] = await db.insert(appointments).values({
      tenantId,
      branchId: body.branchId,
      customerId: body.customerId,
      staffId: body.staffId || null,
      startTime: new Date(body.startTime),
      endTime: new Date(new Date(body.startTime).getTime() + 30 * 60000), // Default 30 mins
      status: "scheduled",
      type: body.type || "booking",
      createdBy: userId
    }).returning();

    return apiSuccess(inserted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
