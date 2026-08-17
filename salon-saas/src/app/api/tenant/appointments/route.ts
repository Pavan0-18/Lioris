import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { appointments, customers, staff, users, services, appointmentServices, branches, appointmentReminders, tenants } from "@/lib/db/schema";
import { and, eq, gte, lte, between, inArray } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { validateBody, appointmentCreateSchema } from "@/lib/validation";
import { assertTenantOwnership, logAudit } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/feature-gate";
import { findAvailableStaff } from "@/lib/availability";
import { inngest } from "@/inngest/client";
import { addMinutes } from "date-fns";
import { generateCheckInCode } from "@/lib/check-in";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    await requireFeature(tenantId, "APPOINTMENTS");
    const url = new URL(req.url);

    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const date = url.searchParams.get("date");
    const branchId = url.searchParams.get("branchId");
    const staffIdParam = url.searchParams.get("staffId");
    const status = url.searchParams.get("status");
    const view = url.searchParams.get("view") || "day";
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const conditions = [eq(appointments.tenantId, tenantId)];

    if (role === "STYLIST") {
      const [staffRecord] = await db
        .select({ id: staff.id })
        .from(staff)
        .where(and(eq(staff.userId, userId), eq(staff.tenantId, tenantId)))
        .limit(1);
      if (staffRecord) {
        conditions.push(eq(appointments.staffId, staffRecord.id));
      }
    } else if (staffIdParam) {
      conditions.push(eq(appointments.staffId, staffIdParam));
    }

    if (branchId) conditions.push(eq(appointments.branchId, branchId));
    if (status) conditions.push(eq(appointments.status, status));

    if (view === "day" && date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      conditions.push(gte(appointments.startTime, dayStart), lte(appointments.startTime, dayEnd));
    } else if (view === "week" && startDate && endDate) {
      conditions.push(between(appointments.startTime, new Date(startDate), new Date(endDate)));
    }

    const whereClause = and(...conditions);

    const offset = (page - 1) * limit;

    const rows = await db.select({
      id: appointments.id,
      status: appointments.status,
      type: appointments.type,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      notes: appointments.notes,
      createdAt: appointments.createdAt,
      staffId: appointments.staffId,
      customerId: appointments.customerId,
      checkInCode: appointments.checkInCode,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .where(whereClause)
      .orderBy(appointments.startTime)
      .limit(limit)
      .offset(offset);

    if (rows.length === 0) {
      return apiSuccess([]);
    }

    const apptIds = rows.map(r => r.id);
    const staffIds = [...new Set(rows.map(r => r.staffId).filter(Boolean))] as string[];

    // Pre-fetch staff names in single query
    let staffMap = new Map<string, string>();
    if (staffIds.length > 0) {
      const staffList = await db.select({ id: staff.id, name: users.name })
        .from(staff)
        .innerJoin(users, eq(staff.userId, users.id))
        .where(inArray(staff.id, staffIds));
      for (const s of staffList) {
        staffMap.set(s.id, s.name);
      }
    }

    // Pre-fetch all appointment services in single query
    const allServices = await db.select({
      appointmentId: appointmentServices.appointmentId,
      serviceId: appointmentServices.serviceId,
      name: services.name,
      price: appointmentServices.price,
      duration: appointmentServices.duration,
    })
      .from(appointmentServices)
      .innerJoin(services, eq(appointmentServices.serviceId, services.id))
      .where(inArray(appointmentServices.appointmentId, apptIds));

    const servicesGroupMap = new Map<string, typeof allServices>();
    for (const s of allServices) {
      const list = servicesGroupMap.get(s.appointmentId) || [];
      list.push(s);
      servicesGroupMap.set(s.appointmentId, list);
    }

    const mapped = rows.map((row) => {
      const staffName = row.staffId ? staffMap.get(row.staffId) || null : null;
      const svcs = servicesGroupMap.get(row.id) || [];

      const totalDuration = svcs.reduce((sum, s) => sum + s.duration, 0);
      const totalPrice = svcs.reduce((sum, s) => sum + s.price, 0);

      return {
        id: row.id,
        status: row.status,
        type: row.type,
        startTime: row.startTime,
        endTime: row.endTime,
        notes: row.notes,
        createdAt: row.createdAt,
        checkInCode: row.checkInCode,
        customer: { id: row.customerId, name: row.customerName, phone: row.customerPhone },
        staffId: row.staffId,
        staff: staffName ? { name: staffName } : null,
        services: svcs.map(s => ({
          serviceId: s.serviceId,
          name: s.name,
          price: s.price,
          duration: s.duration,
        })),
        totalDuration,
        totalPrice,
      };
    });

    return apiSuccess(mapped);
  },
  {
    method: "GET",
    requiredPermission: "appointments:read",
  }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    await requireFeature(tenantId, "APPOINTMENTS");
    const body = await req.json();
    const validated = validateBody(appointmentCreateSchema, body);

    const [branch] = await db.select().from(branches).where(eq(branches.id, validated.branchId));
    if (!branch) { const e = new Error("Branch not found") as any; e.code = "NOT_FOUND"; throw e; }
    assertTenantOwnership(tenantId, branch.tenantId);

    const [customer] = await db.select().from(customers).where(eq(customers.id, validated.customerId));
    if (!customer) { const e = new Error("Customer not found") as any; e.code = "NOT_FOUND"; throw e; }
    assertTenantOwnership(tenantId, customer.tenantId);

    // Single pre-fetch query for all requested services
    const fetchedServices = await db.select()
      .from(services)
      .where(and(eq(services.tenantId, tenantId), inArray(services.id, validated.serviceIds)));

    if (fetchedServices.length !== validated.serviceIds.length) {
      const e = new Error("One or more requested services were not found") as any;
      e.code = "NOT_FOUND";
      throw e;
    }

    const serviceMap = new Map(fetchedServices.map(s => [s.id, s]));
    const totalDuration = fetchedServices.reduce((sum, s) => sum + (s.duration || 30), 0);

    const startTime = new Date(validated.startTime);
    const endTime = new Date(startTime.getTime() + totalDuration * 60000);

    let assignedStaffId = validated.staffId || null;

    if (!assignedStaffId) {
      assignedStaffId = await findAvailableStaff({
        tenantId,
        branchId: validated.branchId,
        serviceIds: validated.serviceIds,
        startTime,
        durationMins: totalDuration,
      });
    }

    if (assignedStaffId) {
      const [sr] = await db.select().from(staff).where(eq(staff.id, assignedStaffId));
      if (sr) assertTenantOwnership(tenantId, sr.tenantId);
    }

    const [inserted] = await db.insert(appointments).values({
      tenantId,
      branchId: validated.branchId,
      customerId: validated.customerId,
      staffId: assignedStaffId,
      startTime,
      endTime,
      status: "scheduled",
      type: validated.type || "booking",
      notes: validated.notes || null,
      createdBy: userId,
      recurrenceRule: validated.recurrenceRule || null,
      recurrenceEndDate: validated.recurrenceEndDate ? new Date(validated.recurrenceEndDate) : null,
      checkInCode: generateCheckInCode(),
    }).returning();

    // Single bulk insert for all appointment services
    if (validated.serviceIds.length > 0) {
      await db.insert(appointmentServices).values(
        validated.serviceIds.map(serviceId => {
          const s = serviceMap.get(serviceId)!;
          return {
            appointmentId: inserted.id,
            serviceId,
            price: s.price,
            duration: s.duration,
          };
        })
      );
    }

    await logAudit(tenantId, userId, "CREATE", "APPOINTMENT", inserted.id, {
      customerId: customer.id,
      staffId: assignedStaffId,
      branchId: branch.id,
    });

    if (validated.recurrenceRule) {
      try {
        await inngest.send({
          name: "appointment/recurring.generate",
          data: {
            appointmentId: inserted.id,
            tenantId,
          },
        });
      } catch {}
    }

    if (validated.type !== "walk-in") {
      try {
        const scheduleReminder = async (hoursBefore: number) => {
          const reminderTime = new Date(startTime.getTime() - hoursBefore * 3600000);
          if (reminderTime > new Date()) {
            await db.insert(appointmentReminders).values({
              appointmentId: inserted.id,
              type: "email",
              scheduledAt: reminderTime,
              status: "pending",
            });

            await inngest.send({
              name: "appointment/reminder.scheduled",
              data: {
                appointmentId: inserted.id,
                reminderType: "email",
                scheduledAt: reminderTime.toISOString(),
              } as any,
            });
          }
        };

        await scheduleReminder(24);
        await scheduleReminder(1);
      } catch {}
    }

    return apiSuccess({ id: inserted.id, checkInCode: inserted.checkInCode });
  },
  {
    method: "POST",
    requiredPermission: "appointments:create",
  }
);
