import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { id } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(notifications)
      .set({ isRead: body.isRead })
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId), eq(notifications.userId, userId)))
      .returning();

    if (!updated) return apiError("Notification not found", "NOT_FOUND", 404);
    return apiSuccess(updated);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { id } = await params;
    const [deleted] = await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId), eq(notifications.userId, userId)))
      .returning();

    if (!deleted) return apiError("Notification not found", "NOT_FOUND", 404);
    return apiSuccess(deleted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
