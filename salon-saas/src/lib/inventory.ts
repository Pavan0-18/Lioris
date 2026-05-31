import { db } from "@/lib/db";
import { inventoryTransactions, products } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export interface ProductStock {
  productId: string;
  productName: string;
  sku: string;
  stock: number;
  reorderLevel: number;
  unitId: string | null;
}

export async function getProductStock(tenantId: string, productId: string): Promise<number> {
  const result = await db
    .select({
      stock: sql<number>`COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN type IN ('usage', 'wastage') THEN quantity ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN type = 'adjustment' THEN quantity ELSE 0 END), 0)`,
    })
    .from(inventoryTransactions)
    .where(
      and(
        eq(inventoryTransactions.tenantId, tenantId),
        eq(inventoryTransactions.productId, productId)
      )
    );

  return Number(result[0]?.stock) || 0;
}

export async function getAllStock(tenantId: string): Promise<ProductStock[]> {
  const result = await db.execute<{
    productId: string;
    productName: string;
    sku: string;
    stock: number;
    reorderLevel: number;
    unitId: string | null;
  }>(sql`
    SELECT
      p.id AS "productId",
      p.name AS "productName",
      p.sku,
      COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
        + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0) AS stock,
      p.reorder_level AS "reorderLevel",
      p.unit_id AS "unitId"
    FROM products p
    LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.tenant_id = p.tenant_id
    WHERE p.tenant_id = ${tenantId}
    GROUP BY p.id, p.name, p.sku, p.reorder_level, p.unit_id
  `);

  return result.rows.map((r) => ({
    productId: r.productId,
    productName: r.productName,
    sku: r.sku,
    stock: Number(r.stock) || 0,
    reorderLevel: r.reorderLevel,
    unitId: r.unitId,
  }));
}

export async function getLowStockProducts(tenantId: string): Promise<ProductStock[]> {
  const allStock = await getAllStock(tenantId);
  return allStock.filter((p) => p.stock <= p.reorderLevel);
}

export async function getInventoryValue(tenantId: string): Promise<number> {
  const allStock = await getAllStock(tenantId);

  const productsWithCost = await db
    .select({
      id: products.id,
      costPrice: products.costPrice,
    })
    .from(products)
    .where(eq(products.tenantId, tenantId));

  const costMap = new Map(productsWithCost.map((p) => [p.id, p.costPrice]));

  return allStock.reduce((total, p) => {
    const cost = costMap.get(p.productId) || 0;
    return total + p.stock * cost;
  }, 0);
}

export async function getRecentTransactions(tenantId: string, limit = 10) {
  return db
    .select()
    .from(inventoryTransactions)
    .where(eq(inventoryTransactions.tenantId, tenantId))
    .orderBy(inventoryTransactions.createdAt)
    .limit(limit);
}
