import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiSuccess, apiError, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { appointments, customers, staff, users, services, appointmentServices, branches, appointmentReminders, invoices, invoiceItems } from "@/lib/db/schema";
import { and, eq, gte, lte, inArray, sql } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { isValidTransition } from "@/lib/validators/appointment";
import { inngest } from "@/inngest/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");
    const { id } = await params;

    const appt = await db.query.appointments.findFirst({
      where: and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)),
      with: {
        customer: { columns: { id: true, name: true, phone: true } },
        appointmentServices: {
          with: { service: { columns: { name: true, price: true, duration: true } } },
        },
      },
    });

    if (!appt) return apiError("Appointment not found", "NOT_FOUND", 404);

    const [invoice] = await db.select()
      .from(invoices)
      .where(eq(invoices.appointmentId, id)).limit(1);

    const reminders = await db.select().from(appointmentReminders)
      .where(eq(appointmentReminders.appointmentId, id));

    let staffRecord = null as any;
    if (appt.staffId) {
      const [s] = await db.select({ name: users.name })
        .from(staff).innerJoin(users, eq(staff.userId, users.id))
        .where(eq(staff.id, appt.staffId)).limit(1);
      staffRecord = s;
    }

    return apiSuccess({
      ...appt,
      staff: staffRecord,
      invoice: invoice || null,
      reminders,
    });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");
    const { id } = await params;
    const body = await req.json();
    const { startTime, endTime, notes, staffId, branchId } = body;

    const [existing] = await db.select()
      .from(appointments).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .limit(1);
    if (!existing) return apiError("Appointment not found", "NOT_FOUND", 404);
    if (["completed", "cancelled", "no_show"].includes(existing.status)) {
      return apiError("Cannot modify appointment in terminal state", "INVALID_STATE", 400);
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (startTime) {
      const totalDuration = existing.endTime.getTime() - existing.startTime.getTime();
      const newStart = new Date(startTime);
      updateData.startTime = newStart;
      updateData.endTime = new Date(newStart.getTime() + totalDuration);
    }
    if (endTime) updateData.endTime = new Date(endTime);
    if (notes !== undefined) updateData.notes = notes;
    if (staffId !== undefined) updateData.staffId = staffId || null;
    if (branchId !== undefined) updateData.branchId = branchId;

    const [updated] = await db.update(appointments)
      .set(updateData)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .returning();

    if (!updated) return apiError("Appointment not found", "NOT_FOUND", 404);

    await logAudit(tenantId, userId, "UPDATE", "APPOINTMENT", id, { changes: body });

    if (startTime) {
      await db.update(appointmentReminders)
        .set({ status: "cancelled" })
        .where(and(eq(appointmentReminders.appointmentId, id), eq(appointmentReminders.status, "pending")));
    }

    return apiSuccess(updated);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");
    const { id } = await params;
    const [deleted] = await db.delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .returning();
    if (!deleted) return apiError("Appointment not found", "NOT_FOUND", 404);
    return apiSuccess({ deleted: true });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
