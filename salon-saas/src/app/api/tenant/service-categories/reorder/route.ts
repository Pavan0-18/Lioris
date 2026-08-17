import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { serviceCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const startTime = performance.now();
    const { tenantId } = await getTenantFromSession();
    const { orderedIds } = await req.json();
    if (!Array.isArray(orderedIds)) return apiError("orderedIds must be an array", "VALIDATION_ERROR", 400);

    if (orderedIds.length > 0) {
      await Promise.all(
        orderedIds.map((id: string, i: number) =>
          db.update(serviceCategories)
            .set({ order: i })
            .where(and(eq(serviceCategories.id, id), eq(serviceCategories.tenantId, tenantId)))
        )
      );
    }

    const processTime = Math.round(performance.now() - startTime);
    console.log(`[SERVICE CATEGORIES REORDER API] Complete. processTime=${processTime}ms, count=${orderedIds.length}`);

    return apiSuccess({ ok: true });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
