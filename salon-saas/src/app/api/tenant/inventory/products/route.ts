import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { and, eq, ilike, or } from "drizzle-orm";
import { createProductSchema } from "@/lib/validators/inventory";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const startTime = performance.now();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");
    const brandId = searchParams.get("brandId");
    const status = searchParams.get("status");

    const conditions = [eq(products.tenantId, tenantId)];

    if (search) {
      const searchCondition = or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (brandId) conditions.push(eq(products.brandId, brandId));
    if (status === "active") conditions.push(eq(products.isActive, true));
    if (status === "inactive") conditions.push(eq(products.isActive, false));

    const queryStartTime = performance.now();
    const list = await db
      .select({
        // Only fetch needed fields
        id: products.id,
        name: products.name,
        sku: products.sku,
        categoryId: products.categoryId,
        brandId: products.brandId,
        sellingPrice: products.sellingPrice,
        costPrice: products.costPrice,
        reorderLevel: products.reorderLevel,
        isActive: products.isActive,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(products.createdAt);

    const queryTime = performance.now() - queryStartTime;
    const totalTime = performance.now() - startTime;
    console.log(`[PRODUCTS API] Complete. queryTime=${Math.round(queryTime)}ms, totalTime=${Math.round(totalTime)}ms, results=${list.length}`);

    return apiSuccess(list);
  } catch (err: any) {
    console.error(`[PRODUCTS API] Error:`, err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", "VALIDATION_ERROR", 400);

    const data = {
      ...parsed.data,
      expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
    };

    const [inserted] = await db.insert(products).values({
      tenantId,
      ...data,
    }).returning();

    return apiSuccess(inserted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
