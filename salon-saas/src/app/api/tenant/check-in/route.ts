import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import {
  appointments,
  customers,
  appointmentServices,
  services,
  staff,
  users,
  notifications,
  branches,
} from "@/lib/db/schema";
import { and, eq, inArray, gte, lt } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/auth-utils";
import { requireFeature } from "@/lib/feature-gate";

const CHECK_IN_WINDOW_MINUTES = 120;

export const POST = createApiHandler(
  async (req, context) => {
    const startTime = performance.now();
    const { tenantId, userId } = context.auth;
    await requireFeature(tenantId, "APPOINTMENTS");

    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();

    if (!code) {
      const error = new Error("Check-in code is required") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const queryStartTime = performance.now();
    const [appt] = await db.select({
      id: appointments.id,
      status: appointments.status,
      type: appointments.type,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      staffId: appointments.staffId,
      customerId: appointments.customerId,
      branchId: appointments.branchId,
      checkedInAt: appointments.checkedInAt,
      notes: appointments.notes,
    })
      .from(appointments)
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.checkInCode, code)))
      .limit(1);
    const queryTime = performance.now() - queryStartTime;

    if (!appt) {
      const error = new Error("No appointment found for this code. Please check the code and try again.") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    if (appt.status === "cancelled") {
      const error = new Error("This appointment was cancelled.") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }
    if (appt.status === "no_show") {
      const error = new Error("This appointment was marked as no-show.") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }
    if (appt.status === "completed") {
      const error = new Error("This appointment is already completed.") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }
    if (appt.checkedInAt) {
      const error = new Error("This appointment is already checked in.") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const now = Date.now();
    const start = appt.startTime.getTime();
    const windowMs = CHECK_IN_WINDOW_MINUTES * 60 * 1000;
    if (now < start - windowMs || now > start + windowMs) {
      const error = new Error(
        `Check-in is only allowed ${CHECK_IN_WINDOW_MINUTES} minutes before or after the appointment time.`
      ) as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const [customer] = await db.select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
    })
      .from(customers)
      .where(and(eq(customers.id, appt.customerId), eq(customers.tenantId, tenantId)))
      .limit(1);

    if (!customer) {
      const error = new Error("Customer record not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const [branch] = await db.select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(and(eq(branches.id, appt.branchId), eq(branches.tenantId, tenantId)))
      .limit(1);

    const svcRows = await db.select({
      appointmentId: appointmentServices.appointmentId,
      name: services.name,
      price: appointmentServices.price,
      duration: appointmentServices.duration,
    })
      .from(appointmentServices)
      .innerJoin(services, eq(appointmentServices.serviceId, services.id))
      .where(eq(appointmentServices.appointmentId, appt.id));

    let staffName: string | null = null;
    if (appt.staffId) {
      const [staffRow] = await db.select({ name: users.name })
        .from(staff)
        .innerJoin(users, eq(staff.userId, users.id))
        .where(eq(staff.id, appt.staffId))
        .limit(1);
      staffName = staffRow?.name || null;
    }

    await db.update(appointments).set({
      status: "checked_in",
      checkedInAt: new Date(),
      checkedInBy: userId,
    }).where(eq(appointments.id, appt.id));

    if (appt.staffId) {
      const [staffRow] = await db.select({ userId: staff.userId })
        .from(staff)
        .where(eq(staff.id, appt.staffId))
        .limit(1);
      if (staffRow) {
        await db.insert(notifications).values({
          tenantId,
          userId: staffRow.userId,
          type: "info",
          title: "Customer checked in",
          message: `${customer.name} has arrived for their appointment.`,
          link: "/appointments",
          metadata: JSON.stringify({ appointmentId: appt.id }),
        });
      }
    }

    await logAudit(tenantId, userId, "CHECK_IN", "APPOINTMENT", appt.id, {
      customerId: customer.id,
      code,
    });

    console.log(
      `[CHECK-IN] Complete. code=${code}, queryTime=${Math.round(queryTime)}ms, totalTime=${Math.round(performance.now() - startTime)}ms`
    );

    return apiSuccess({
      appointment: {
        id: appt.id,
        status: "checked_in",
        type: appt.type,
        startTime: appt.startTime,
        endTime: appt.endTime,
        notes: appt.notes,
        staff: staffName,
        services: svcRows.map((s) => ({ name: s.name, price: s.price, duration: s.duration })),
        totalDuration: svcRows.reduce((sum, s) => sum + s.duration, 0),
        totalPrice: svcRows.reduce((sum, s) => sum + s.price, 0),
      },
      customer,
      branch: branch?.name || null,
    });
  },
  {
    method: "POST",
    requiredPermission: "appointments:status",
  }
);

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    await requireFeature(tenantId, "APPOINTMENTS");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const checkedInToday = await db.select({
      id: appointments.id,
      startTime: appointments.startTime,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .where(and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.status, "checked_in"),
        eq(appointments.checkedInBy, context.auth.userId),
        gte(appointments.checkedInAt, todayStart),
        lt(appointments.checkedInAt, todayEnd),
      ))
      .orderBy(appointments.checkedInAt)
      .limit(20);

    return apiSuccess({ checkedInToday });
  },
  {
    method: "GET",
    requiredPermission: "appointments:read",
  }
);