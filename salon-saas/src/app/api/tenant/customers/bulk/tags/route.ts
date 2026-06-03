import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const body = await req.json();
    const { ids, tag } = body;

    if (!ids?.length || !tag) {
      return apiError("ids and tag are required", "VALIDATION_ERROR", 400);
    }

    const list = await db.select({ id: customers.id, tags: customers.tags })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), inArray(customers.id, ids)));

    for (const c of list) {
      const currentTags = (c.tags || []) as string[];
      if (!currentTags.includes(tag)) {
        await db.update(customers)
          .set({ tags: [...currentTags, tag], updatedAt: new Date() })
          .where(and(eq(customers.id, c.id), eq(customers.tenantId, tenantId)));
      }
    }

    return apiSuccess({ updated: list.length });
  } catch {
    return apiError("Bulk tag failed", "INTERNAL_ERROR", 500);
  }
}
