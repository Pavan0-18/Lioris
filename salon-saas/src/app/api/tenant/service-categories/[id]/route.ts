import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { serviceCategories, services } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const body = await req.json();
    const { name, icon, order, isActive } = body;

    const [updated] = await db.update(serviceCategories)
      .set({ name, icon, order, isActive })
      .where(and(eq(serviceCategories.id, id), eq(serviceCategories.tenantId, tenantId)))
      .returning();

    if (!updated) return apiError("Category not found", "NOT_FOUND", 404);
    return apiSuccess(updated);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;

    const existing = await db.select({ id: services.id })
      .from(services)
      .where(and(eq(services.categoryId, id), eq(services.isActive, true)))
      .limit(1);

    if (existing.length > 0) {
      return apiError("Cannot delete category with active services. Reassign them first.", "CONFLICT", 409);
    }

    const [deleted] = await db.delete(serviceCategories)
      .where(and(eq(serviceCategories.id, id), eq(serviceCategories.tenantId, tenantId)))
      .returning();

    if (!deleted) return apiError("Category not found", "NOT_FOUND", 404);
    return apiSuccess({ deleted: true });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
