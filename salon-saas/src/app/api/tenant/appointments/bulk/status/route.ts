import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiSuccess, apiError, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { inArray, eq, and } from "drizzle-orm";
import { bulkUpdateStatusSchema } from "@/lib/validators/appointment";
import { isValidTransition } from "@/lib/validators/appointment";
import { logAudit } from "@/lib/auth-utils";
import { notifyAppointmentChange } from "@/lib/appointment-events";

export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");

    const body = await req.json();
    const parsed = bulkUpdateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0].message, "INVALID_INPUT", 400);
    }

    const { ids, status } = parsed.data;

    const existing = await db.select({ id: appointments.id, status: appointments.status })
      .from(appointments)
      .where(and(inArray(appointments.id, ids), eq(appointments.tenantId, tenantId)));

    if (existing.length !== ids.length) {
      return apiError("One or more appointments not found", "NOT_FOUND", 404);
    }

    const invalid = existing.filter((a) => !isValidTransition(a.status as any, status));
    if (invalid.length > 0) {
      return apiError(
        `Cannot transition ${invalid.length} appointment(s) to "${status}" from their current state`,
        "INVALID_STATE",
        400,
      );
    }

    const [updated] = await db.update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(and(inArray(appointments.id, ids), eq(appointments.tenantId, tenantId)))
      .returning({ count: appointments.id });

    const count = updated ? ids.length : 0;

    await logAudit(tenantId, userId, "BULK_UPDATE_STATUS", "APPOINTMENT", ids.join(","), {
      fromStatus: existing.map((a) => a.status).join(","),
      toStatus: status,
      count,
    });

    for (const id of ids) {
      notifyAppointmentChange({ tenantId, action: "status_changed", appointmentId: id, timestamp: new Date().toISOString() });
    }

    return apiSuccess({ updated: count });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
