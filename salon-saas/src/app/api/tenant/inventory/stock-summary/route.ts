import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { getLowStockProducts, getInventoryValue, getRecentTransactions } from "@/lib/inventory";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const [totalProductsResult, lowStockProducts, inventoryValue, recentTransactions] = await Promise.all([
      db.select({ count: products.id }).from(products).where(eq(products.tenantId, tenantId)),
      getLowStockProducts(tenantId),
      getInventoryValue(tenantId),
      getRecentTransactions(tenantId, 5),
    ]);

    return apiSuccess({
      totalProducts: totalProductsResult.length,
      inventoryValue,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      recentTransactions,
    });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
