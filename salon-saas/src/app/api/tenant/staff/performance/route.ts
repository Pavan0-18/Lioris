import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { staff, users, appointments, appointmentServices, services } from "@/lib/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const url = new URL(req.url);

    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const staffId = url.searchParams.get("staffId");

    const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const dateTo = to ? new Date(to) : new Date();

    const conditions = [
      eq(appointments.tenantId, tenantId),
      gte(appointments.startTime, dateFrom),
      lte(appointments.startTime, dateTo),
      eq(appointments.status, "completed"),
    ];

    if (staffId) conditions.push(eq(appointments.staffId, staffId));

    const isStylist = context.auth.role === "STYLIST";
    if (isStylist) {
      const [staffRecord] = await db.select()
        .from(staff)
        .where(eq(staff.userId, userId));
      if (staffRecord) {
        conditions.push(eq(appointments.staffId, staffRecord.id));
      }
    }

    const results = await db.select({
      staffId: appointments.staffId,
      staffName: users.name,
      appointmentCount: sql<number>`count(${appointments.id})`,
      totalRevenue: sql<number>`coalesce(sum(${services.price}), 0)`,
      serviceCount: sql<number>`count(${appointmentServices.id})`,
    })
      .from(appointments)
      .innerJoin(staff, eq(appointments.staffId, staff.id))
      .innerJoin(users, eq(staff.userId, users.id))
      .leftJoin(appointmentServices, eq(appointments.id, appointmentServices.appointmentId))
      .leftJoin(services, eq(appointmentServices.serviceId, services.id))
      .where(and(...conditions))
      .groupBy(appointments.staffId, users.name)
      .orderBy(sql`count(${appointments.id}) desc`);

    return apiSuccess(results);
  },
  { method: "GET", requiredPermission: "performance:read" }
);
