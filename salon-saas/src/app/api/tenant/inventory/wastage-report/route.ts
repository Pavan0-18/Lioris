import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { inventoryWastage, products } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const totalWastage = await db
      .select({
        total: sql<number>`COALESCE(SUM(quantity), 0)`,
        totalCost: sql<number>`COALESCE(SUM(w.quantity * p.cost_price), 0)`,
      })
      .from(inventoryWastage as any)
      .leftJoin(products, eq(inventoryWastage.productId, products.id))
      .where(eq(inventoryWastage.tenantId, tenantId))
      .then((r) => r[0]);

    const topWasted = await db
      .select({
        productId: inventoryWastage.productId,
        productName: products.name,
        totalWasted: sql<number>`COALESCE(SUM(${inventoryWastage.quantity}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${inventoryWastage.quantity} * ${products.costPrice}), 0)`,
      })
      .from(inventoryWastage)
      .leftJoin(products, eq(inventoryWastage.productId, products.id))
      .where(eq(inventoryWastage.tenantId, tenantId))
      .groupBy(inventoryWastage.productId, products.name)
      .orderBy(desc(sql`COALESCE(SUM(${inventoryWastage.quantity}), 0)`))
      .limit(10);

    const monthlyTrend = await db
      .select({
        month: sql<string>`to_char(${inventoryWastage.createdAt}, 'YYYY-MM')`,
        total: sql<number>`COALESCE(SUM(${inventoryWastage.quantity}), 0)`,
      })
      .from(inventoryWastage)
      .where(eq(inventoryWastage.tenantId, tenantId))
      .groupBy(sql`to_char(${inventoryWastage.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${inventoryWastage.createdAt}, 'YYYY-MM')`)
      .limit(12);

    return apiSuccess({
      totalWastage: Number(totalWastage?.total) || 0,
      totalWastageCost: Number(totalWastage?.totalCost) || 0,
      topWasted: topWasted || [],
      monthlyTrend: monthlyTrend || [],
    });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
