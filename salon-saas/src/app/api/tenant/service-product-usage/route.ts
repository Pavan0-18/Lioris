import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { serviceProductUsage, products, productUnits } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createServiceProductUsageSchema } from "@/lib/validators/inventory";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get("serviceId");

    const conditions = [eq(serviceProductUsage.tenantId, tenantId)];
    if (serviceId) conditions.push(eq(serviceProductUsage.serviceId, serviceId));

    const list = await db
      .select({
        id: serviceProductUsage.id,
        serviceId: serviceProductUsage.serviceId,
        productId: serviceProductUsage.productId,
        productName: products.name,
        productSku: products.sku,
        quantityUsed: serviceProductUsage.quantityUsed,
        unitId: serviceProductUsage.unitId,
        unitName: productUnits.abbreviation,
        createdAt: serviceProductUsage.createdAt,
      })
      .from(serviceProductUsage)
      .leftJoin(products, eq(serviceProductUsage.productId, products.id))
      .leftJoin(productUnits, eq(serviceProductUsage.unitId, productUnits.id))
      .where(and(...conditions))
      .orderBy(desc(serviceProductUsage.createdAt));

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
    const parsed = createServiceProductUsageSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", "VALIDATION_ERROR", 400);

    const [inserted] = await db.insert(serviceProductUsage).values({ tenantId, ...parsed.data }).returning();
    return apiSuccess(inserted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
