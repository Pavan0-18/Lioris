import { createPublicApiHandler } from "@/lib/public-api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const updateSchema = z.object({
  status: z.enum(["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"]).optional(),
  staffId: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  cancelReason: z.string().max(300).optional(),
});

async function findOwnAppointment(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, id)))
    .limit(1);
  return row ?? null;
}

export const GET = createPublicApiHandler(
  async (req, context) => {
    const { id } = await context.params;
    const appointment = await findOwnAppointment(context.tenantId, id);
    if (!appointment) {
      const error = new Error("Appointment not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    return { appointment };
  },
  { requiredScope: "appointments:read" }
);

export const PUT = createPublicApiHandler(
  async (req, context) => {
    const { id } = await context.params;
    const body = context.body;
    const validated = validateBody(updateSchema, body);

    const existing = await findOwnAppointment(context.tenantId, id);
    if (!existing) {
      const error = new Error("Appointment not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const [appointment] = await db
      .update(appointments)
      .set({
        status: validated.status ?? existing.status,
        staffId: validated.staffId ?? existing.staffId,
        startTime: validated.startTime ? new Date(validated.startTime) : existing.startTime,
        endTime: validated.endTime ? new Date(validated.endTime) : existing.endTime,
        notes: validated.notes ?? existing.notes,
        cancelReason: validated.cancelReason ?? existing.cancelReason,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.tenantId, context.tenantId), eq(appointments.id, id)))
      .returning();

    await logAudit(context.tenantId, `api:${context.keyId}`, "UPDATE", "APPOINTMENT", appointment.id, {
      via: "api",
      status: validated.status,
    });

    return { appointment };
  },
  { requiredScope: "appointments:write", idempotent: true }
);