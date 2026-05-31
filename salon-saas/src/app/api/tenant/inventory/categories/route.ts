import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createProductCategorySchema } from "@/lib/validators/inventory";

export async function GET() {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const list = await db
      .select()
      .from(productCategories)
      .where(and(eq(productCategories.tenantId, tenantId), eq(productCategories.isActive, true)))
      .orderBy(productCategories.name);

    return apiSuccess(list);
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
