import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const startTime = performance.now();
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const list = await db
      .select({
        id: services.id,
        categoryId: services.categoryId,
        name: services.name,
        description: services.description,
        duration: services.duration,
        price: services.price,
        taxable: services.taxable,
        isActive: services.isActive,
      })
      .from(services)
      .where(and(eq(services.tenantId, tenantId), eq(services.isActive, true)))
      .orderBy(services.name);

    const queryTime = Math.round(performance.now() - startTime);
    console.log(`[SERVICES API] Complete. queryTime=${queryTime}ms, results=${list.length}`);

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
    const [inserted] = await db.insert(services).values({
      tenantId,
      categoryId: body.categoryId,
      name: body.name,
      duration: body.duration,
      price: body.price,
      taxable: body.taxable,
      isActive: true
    }).returning();

    return apiSuccess(inserted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
