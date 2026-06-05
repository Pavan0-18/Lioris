import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess, getPaginationParams } from "@/lib/utils";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    const conditions = sql`p.tenant_id = ${tenantId}`;

    if (categoryId) {
      conditions.append(sql` AND p.category_id = ${categoryId}`);
    }

    const stockSubquery = sql`(
      COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
      + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0)
    )`;

    const [{ total }] = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.tenant_id = p.tenant_id
        WHERE ${conditions}
        GROUP BY p.id, p.reorder_level
        HAVING ${stockSubquery} <= p.reorder_level
      ) sub
    `);

    const list = await db.execute<{
      id: string; name: string; sku: string; categoryId: string | null;
      categoryName: string | null; stock: number; reorderLevel: number;
      sellingPrice: number; costPrice: number; unitId: string | null;
    }>(sql`
      SELECT
        p.id, p.name, p.sku, p.category_id AS "categoryId",
        pc.name AS "categoryName",
        ${stockSubquery} AS stock,
        p.reorder_level AS "reorderLevel",
        p.selling_price AS "sellingPrice",
        p.cost_price AS "costPrice",
        p.unit_id AS "unitId"
      FROM products p
      LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.tenant_id = p.tenant_id
      LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE ${conditions}
      GROUP BY p.id, p.name, p.sku, p.category_id, pc.name, p.reorder_level, p.selling_price, p.cost_price, p.unit_id
      HAVING ${stockSubquery} <= p.reorder_level
      ORDER BY stock ASC, p.name ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    return apiSuccess({
      data: list.rows.map((r) => ({ ...r, stock: Number(r.stock) })),
      total: Number(total),
      page,
      pageSize,
    });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
