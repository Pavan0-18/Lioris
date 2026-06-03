import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const body = await req.json();
    const { ids } = body;

    if (!ids?.length) {
      return apiError("ids are required", "VALIDATION_ERROR", 400);
    }

    const result = await db.update(customers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(customers.tenantId, tenantId), inArray(customers.id, ids)))
      .returning({ id: customers.id });

    return apiSuccess({ deleted: result.length });
  } catch {
    return apiError("Bulk delete failed", "INTERNAL_ERROR", 500);
  }
}
