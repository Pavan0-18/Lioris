import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createProductCategorySchema } from "@/lib/validators/inventory";

export async function GET() {
  try {
    const startTime = performance.now();
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const list = await db
      .select({
        id: productCategories.id,
        name: productCategories.name,
        description: productCategories.description,
        isActive: productCategories.isActive,
      })
      .from(productCategories)
      .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.isActive, true)))
      .orderBy(productCategories.name);

    const queryTime = Math.round(performance.now() - startTime);
    console.log(`[CATEGORIES API] Complete. queryTime=${queryTime}ms, results=${list.length}`);

    return apiSuccess(list, 200, { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();
    const parsed = createProductCategorySchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", "VALIDATION_ERROR", 400);

    const [inserted] = await db.insert(productCategories).values({
      tenantId,
      ...parsed.data,
    }).returning();

    return apiSuccess(inserted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
