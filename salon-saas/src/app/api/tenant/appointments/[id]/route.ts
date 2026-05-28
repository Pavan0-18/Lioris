import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const [appt] = await db.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
    if (!appt) return apiError("Appointment not found", "NOT_FOUND", 404);
    return apiSuccess(appt);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const body = await req.json();
    const { startTime, endTime, notes, staffId, branchId } = body;
    const [updated] = await db.update(appointments).set({ startTime, endTime, notes, staffId, branchId, updatedAt: new Date() }).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId))).returning();
    if (!updated) return apiError("Appointment not found", "NOT_FOUND", 404);
    return apiSuccess(updated);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const [deleted] = await db.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId))).returning();
    if (!deleted) return apiError("Appointment not found", "NOT_FOUND", 404);
    return apiSuccess({ deleted: true });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
