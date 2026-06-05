import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { searchParams } = new URL(req.url);
    const report = searchParams.get("report") || "summary";

    if (report === "valuation") {
      const valuation = await db.execute<{
        categoryName: string | null;
        totalProducts: number;
        totalStock: number;
        totalValue: number;
      }>(sql`
        SELECT
          pc.name AS "categoryName",
          COUNT(DISTINCT p.id)::int AS "totalProducts",
          COALESCE(SUM(
            COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
            + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0)
          ), 0)::int AS "totalStock",
          COALESCE(SUM(
            (COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
            + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0))
            * p.cost_price
          ), 0) AS "totalValue"
        FROM products p
        LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.tenant_id = p.tenant_id
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        WHERE p.tenant_id = ${tenantId}
        GROUP BY pc.name
        ORDER BY "totalValue" DESC
      `);

      return apiSuccess({ data: valuation.rows });
    }

    if (report === "movement") {
      const days = parseInt(searchParams.get("days") || "30", 10);
      const movement = await db.execute<{
        type: string;
        totalQuantity: number;
        transactionCount: number;
      }>(sql`
        SELECT
          t.type,
          COALESCE(SUM(t.quantity), 0)::int AS "totalQuantity",
          COUNT(*)::int AS "transactionCount"
        FROM inventory_transactions t
        WHERE t.tenant_id = ${tenantId}
          AND t.created_at >= NOW() - ${sql`INTERVAL '${sql.raw(String(days))} days'`}
        GROUP BY t.type
        ORDER BY t.type
      `);

      return apiSuccess({ data: movement.rows });
    }

    if (report === "usage") {
      const usage = await db.execute<{
        productName: string;
        productSku: string;
        totalUsed: number;
        usageCount: number;
      }>(sql`
        SELECT
          p.name AS "productName",
          p.sku AS "productSku",
          COALESCE(SUM(u.quantity_used), 0)::int AS "totalUsed",
          COUNT(*)::int AS "usageCount"
        FROM service_product_usage u
        JOIN products p ON p.id = u.product_id
        WHERE u.tenant_id = ${tenantId}
        GROUP BY p.name, p.sku
        ORDER BY "totalUsed" DESC
        LIMIT 20
      `);

      return apiSuccess({ data: usage.rows });
    }

    if (report === "wastage-summary") {
      const wastage = await db.execute<{
        reason: string;
        totalQuantity: number;
        totalCost: number;
      }>(sql`
        SELECT
          w.reason,
          COALESCE(SUM(w.quantity), 0)::int AS "totalQuantity",
          COALESCE(SUM(w.quantity * p.cost_price), 0) AS "totalCost"
        FROM inventory_wastage w
        JOIN products p ON p.id = w.product_id
        WHERE w.tenant_id = ${tenantId}
        GROUP BY w.reason
        ORDER BY "totalQuantity" DESC
      `);

      return apiSuccess({ data: wastage.rows });
    }

    const stockValue = await db.execute<{ total: number }>(sql`
      SELECT COALESCE(SUM(
        (COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
        + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0))
        * p.cost_price
      ), 0) AS total
      FROM products p
      LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.tenant_id = p.tenant_id
      WHERE p.tenant_id = ${tenantId}
    `);

    const lowStockCount = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int AS count FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.tenant_id = p.tenant_id
        WHERE p.tenant_id = ${tenantId}
        GROUP BY p.id, p.reorder_level
        HAVING (
          COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
          + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0)
        ) <= p.reorder_level
      ) sub
    `);

    const topProducts = await db.execute<{
      id: string; name: string; sku: string; stock: number; value: number;
    }>(sql`
      SELECT
        p.id, p.name, p.sku,
        (COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
        + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0))::int AS stock,
        (COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
        + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0))
        * p.cost_price AS value
      FROM products p
      LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.tenant_id = p.tenant_id
      WHERE p.tenant_id = ${tenantId}
      GROUP BY p.id, p.name, p.sku, p.cost_price
      ORDER BY value DESC
      LIMIT 10
    `);

    const movementData = await db.execute<{
      type: string; totalQty: number; count: number;
    }>(sql`
      SELECT
        t.type,
        COALESCE(SUM(t.quantity), 0)::int AS "totalQty",
        COUNT(*)::int AS count
      FROM inventory_transactions t
      WHERE t.tenant_id = ${tenantId}
        AND t.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY t.type
      ORDER BY t.type
    `);

    return apiSuccess({
      data: {
        inventoryValue: Number(stockValue.rows[0]?.total || 0),
        lowStockCount: Number(lowStockCount.rows[0]?.count || 0),
        totalProducts: await db.select({ count: sql<number>`COUNT(*)::int` }).from(products).where(eq(products.tenantId, tenantId)).then(r => Number(r[0]?.count || 0)),
        topProducts: topProducts.rows.map(r => ({ ...r, stock: Number(r.stock), value: Number(r.value) })),
        movement: movementData.rows.map(r => ({ ...r, totalQty: Number(r.totalQty) })),
      },
    });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
