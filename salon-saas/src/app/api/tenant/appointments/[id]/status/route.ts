import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const { status, cancelReason } = await req.json();
    const validStatuses = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"];
    if (!validStatuses.includes(status)) return apiError("Invalid status", "VALIDATION_ERROR", 400);

    const [updated] = await db.update(appointments).set({ status, cancelReason: status === "cancelled" ? cancelReason : null, updatedAt: new Date() }).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId))).returning();
    if (!updated) return apiError("Appointment not found", "NOT_FOUND", 404);
    return apiSuccess(updated);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
