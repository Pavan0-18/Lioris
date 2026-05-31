import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { serviceProductUsage } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { id } = await params;
    const [deleted] = await db
      .delete(serviceProductUsage)
      .where(and(eq(serviceProductUsage.id, id), eq(serviceProductUsage.tenantId, tenantId)))
      .returning();

    if (!deleted) return apiError("Usage record not found", "NOT_FOUND", 404);
    return apiSuccess(deleted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
