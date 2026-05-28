import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { serviceCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { orderedIds } = await req.json();
    if (!Array.isArray(orderedIds)) return apiError("orderedIds must be an array", "VALIDATION_ERROR", 400);

    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(serviceCategories).set({ order: i }).where(and(eq(serviceCategories.id, orderedIds[i]), eq(serviceCategories.tenantId, tenantId)));
    }
    return apiSuccess({ ok: true });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
