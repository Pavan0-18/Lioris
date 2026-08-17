import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const body = await req.json();
    const { ids, tag } = body;

    if (!ids?.length || !tag) {
      return apiError("ids and tag are required", "VALIDATION_ERROR", 400);
    }

    // Atomic single SQL update replacing N update calls in loop
    const result = await db.update(customers)
      .set({
        tags: sql`CASE 
          WHEN ${customers.tags} IS NULL THEN ARRAY[${tag}]::text[] 
          WHEN NOT (${tag} = ANY(${customers.tags})) THEN array_append(${customers.tags}, ${tag}) 
          ELSE ${customers.tags} 
        END`,
        updatedAt: new Date()
      })
      .where(and(eq(customers.tenantId, tenantId), inArray(customers.id, ids)))
      .returning({ id: customers.id });

    return apiSuccess({ updated: result.length });
  } catch {
    return apiError("Bulk tag failed", "INTERNAL_ERROR", 500);
  }
}
