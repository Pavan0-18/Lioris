import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { inventoryTransactions, products } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");

    const conditions = [eq(inventoryTransactions.tenantId, tenantId)];
    if (productId) conditions.push(eq(inventoryTransactions.productId, productId));
    if (type) conditions.push(eq(inventoryTransactions.type, type as "purchase" | "usage" | "wastage" | "adjustment"));

    const list = await db
      .select({
        id: inventoryTransactions.id,
        productId: inventoryTransactions.productId,
        productName: products.name,
        productSku: products.sku,
        type: inventoryTransactions.type,
        quantity: inventoryTransactions.quantity,
        unitCost: inventoryTransactions.unitCost,
        reference: inventoryTransactions.reference,
        note: inventoryTransactions.note,
        createdAt: inventoryTransactions.createdAt,
      })
      .from(inventoryTransactions)
      .leftJoin(products, eq(inventoryTransactions.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryTransactions.createdAt));

    return apiSuccess(list);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
