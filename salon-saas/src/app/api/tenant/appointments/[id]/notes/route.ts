import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiSuccess, apiError, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");
    const { id } = await params;
    const body = await req.json();
    const { notes } = body;
    if (typeof notes !== "string" || notes.length > 500) {
      return apiError("Notes must be a string of max 500 characters", "VALIDATION_ERROR", 400);
    }

    const [updated] = await db.update(appointments)
      .set({ notes, updatedAt: new Date() })
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .returning();

    if (!updated) return apiError("Appointment not found", "NOT_FOUND", 404);
    return apiSuccess({ updated: true });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
