import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const [branch] = await db.select().from(branches).where(and(eq(branches.id, id), eq(branches.tenantId, tenantId)));
    if (!branch) return apiError("Branch not found", "NOT_FOUND", 404);
    return apiSuccess(branch);
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
    const { name, address, city, state, country, phone, email, isHQ, isActive } = body;
    const [updated] = await db.update(branches).set({ name, address, city, state, country, phone, email, isHQ, isActive }).where(and(eq(branches.id, id), eq(branches.tenantId, tenantId))).returning();
    if (!updated) return apiError("Branch not found", "NOT_FOUND", 404);
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
    const [deleted] = await db.delete(branches).where(and(eq(branches.id, id), eq(branches.tenantId, tenantId))).returning();
    if (!deleted) return apiError("Branch not found", "NOT_FOUND", 404);
    return apiSuccess({ deleted: true });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
