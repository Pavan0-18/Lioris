import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const body = await req.json();
    const { name, description, duration, price, categoryId, taxable, isActive } = body;
    const [updated] = await db.update(services).set({ name, description, duration, price, categoryId, taxable, isActive }).where(and(eq(services.id, id), eq(services.tenantId, tenantId))).returning();
    if (!updated) return apiError("Service not found", "NOT_FOUND", 404);
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
    const [deleted] = await db.delete(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId))).returning();
    if (!deleted) return apiError("Service not found", "NOT_FOUND", 404);
    return apiSuccess({ deleted: true });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
