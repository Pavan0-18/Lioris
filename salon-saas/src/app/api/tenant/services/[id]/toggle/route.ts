import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const [svc] = await db.select({ isActive: services.isActive }).from(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
    if (!svc) return apiError("Service not found", "NOT_FOUND", 404);
    const [updated] = await db.update(services).set({ isActive: !svc.isActive }).where(and(eq(services.id, id), eq(services.tenantId, tenantId))).returning();
    return apiSuccess(updated);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
