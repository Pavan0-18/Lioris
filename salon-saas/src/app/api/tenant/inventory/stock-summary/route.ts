import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { getLowStockProducts, getInventoryValue, getRecentTransactions } from "@/lib/inventory";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const startTime = performance.now();
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const [countResult, lowStockProducts, inventoryValue, recentTransactions] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.tenantId, tenantId)),
      getLowStockProducts(tenantId),
      getInventoryValue(tenantId),
      getRecentTransactions(tenantId, 5),
    ]);

    const totalTime = Math.round(performance.now() - startTime);
    console.log(`[STOCK SUMMARY API] Complete. totalTime=${totalTime}ms`);

    return apiSuccess({
      totalProducts: countResult[0]?.count || 0,
      inventoryValue,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      recentTransactions,
    });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
