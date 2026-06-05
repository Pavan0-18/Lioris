import { NextRequest } from "next/server";
import { getTenantFromSession } from "@/lib/tenant-context";
import { db } from "@/lib/db";
import { products, inventoryTransactions, inventoryWastage, purchaseOrders, vendors } from "@/lib/db/schema";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  let tenantId: string;
  try {
    const ctx = await getTenantFromSession();
    tenantId = ctx.tenantId;
  } catch {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const vendorId = searchParams.get("vendorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateFrom = startDate ? new Date(startDate) : monthStart;
  const dateTo = endDate ? new Date(endDate + "T23:59:59.999Z") : now;

  const productWhere = categoryId
    ? and(eq(products.tenantId, tenantId), eq(products.isActive, true), eq(products.categoryId, categoryId))
    : and(eq(products.tenantId, tenantId), eq(products.isActive, true));

  const vendorWhere = vendorId
    ? and(eq(vendors.tenantId, tenantId), eq(vendors.id, vendorId))
    : eq(vendors.tenantId, tenantId);

  const txDateFilter = and(
    eq(inventoryTransactions.tenantId, tenantId),
    gte(inventoryTransactions.createdAt, dateFrom),
    lte(inventoryTransactions.createdAt, dateTo)
  );
  const wastageDateFilter = and(
    eq(inventoryWastage.tenantId, tenantId),
    gte(inventoryWastage.createdAt, dateFrom),
    lte(inventoryWastage.createdAt, dateTo)
  );
  const poDateFilter = and(
    eq(purchaseOrders.tenantId, tenantId),
    gte(purchaseOrders.purchaseDate, dateFrom),
    lte(purchaseOrders.purchaseDate, dateTo)
  );

  async function getAllStockWithFilters() {
    const catJoin = categoryId ? sql` AND p.category_id = ${categoryId} ` : sql``;
    const result = await db.execute(sql`
      SELECT
        p.id AS "productId", p.name AS "productName", p.sku,
        COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
          + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0) AS stock,
        p.reorder_level AS "reorderLevel", p.cost_price AS "costPrice", p.unit_id AS "unitId"
      FROM products p
      LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.tenant_id = p.tenant_id
      WHERE p.tenant_id = ${tenantId} AND p.is_active = true${catJoin}
      GROUP BY p.id, p.name, p.sku, p.reorder_level, p.cost_price, p.unit_id
    `);
    return result.rows.map((r: any) => ({
      productId: r.productId, productName: r.productName, sku: r.sku,
      stock: Number(r.stock) || 0, reorderLevel: r.reorderLevel,
      costPrice: Number(r.costPrice) || 0, unitId: r.unitId,
    }));
  }

  function getMonthlyLabels() {
    const months: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      months.push({ label: d.toISOString().slice(0, 7), start: d, end });
    }
    return months;
  }

  async function getMonthlyTrends() {
    const months = getMonthlyLabels();
    const catJoin = categoryId ? sql` AND p.category_id = ${categoryId} ` : sql``;
    const valueTrend: { date: string; value: number }[] = [];
    const stockTrend: { date: string; stock: number }[] = [];
    for (const m of months) {
      const result = await db.execute(sql`
        SELECT
          COALESCE(SUM((COALESCE(SUM(CASE WHEN t.type = 'purchase' AND t.created_at <= ${m.end} THEN t.quantity ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') AND t.created_at <= ${m.end} THEN t.quantity ELSE 0 END), 0)
            + COALESCE(SUM(CASE WHEN t.type = 'adjustment' AND t.created_at <= ${m.end} THEN t.quantity ELSE 0 END), 0)) * p.cost_price), 0) AS value,
          COALESCE(SUM(COALESCE(SUM(CASE WHEN t.type = 'purchase' AND t.created_at <= ${m.end} THEN t.quantity ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') AND t.created_at <= ${m.end} THEN t.quantity ELSE 0 END), 0)
            + COALESCE(SUM(CASE WHEN t.type = 'adjustment' AND t.created_at <= ${m.end} THEN t.quantity ELSE 0 END), 0)), 0) AS stock
        FROM products p
        LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.tenant_id = p.tenant_id
        WHERE p.tenant_id = ${tenantId} AND p.is_active = true${catJoin}
        GROUP BY p.id
      `);
      const rows = result.rows as any[];
      valueTrend.push({ date: m.label, value: rows.reduce((s, r) => s + Number(r.value || 0), 0) });
      stockTrend.push({ date: m.label, stock: rows.reduce((s, r) => s + Number(r.stock || 0), 0) });
    }
    return { valueTrend, stockTrend };
  }

  async function getDailyTrend(type: "usage" | "wastage") {
    const days: { label: string; d: Date }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({ label: d.toISOString().slice(0, 10), d });
    }
    const trend: { date: string; value: number }[] = [];
    const table = type === "usage" ? inventoryTransactions : inventoryWastage;
    for (const day of days) {
      const dayStart = new Date(day.d.getFullYear(), day.d.getMonth(), day.d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
      const conditions = [eq(table.tenantId, tenantId), gte(table.createdAt, dayStart), lte(table.createdAt, dayEnd)] as any;
      if (type === "usage") conditions.push(eq(inventoryTransactions.type, "usage"));
      const [result] = await db.select({ qty: sql<number>`COALESCE(SUM(quantity), 0)` })
        .from(table).where(and(...conditions));
      trend.push({ date: day.label, value: Number(result?.qty) || 0 });
    }
    return trend;
  }

  async function getMonthlyPurchaseTrend() {
    const months = getMonthlyLabels();
    const trend: { month: string; amount: number; count: number }[] = [];
    for (const m of months) {
      const conditions = [eq(purchaseOrders.tenantId, tenantId), gte(purchaseOrders.purchaseDate, m.start), lte(purchaseOrders.purchaseDate, m.end)];
      if (vendorId) conditions.push(eq(purchaseOrders.vendorId, vendorId));
      const [result] = await db.select({
        amount: sql<number>`COALESCE(SUM(total_amount), 0)`,
        count: sql<number>`count(*)`,
      }).from(purchaseOrders).where(and(...conditions));
      trend.push({ month: m.label, amount: Number(result.amount) || 0, count: Number(result.count) || 0 });
    }
    return trend;
  }

  const results = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(products).where(productWhere),
    db.select({ count: sql<number>`count(*)` }).from(vendors).where(vendorWhere),
    db.select({ qty: sql<number>`COALESCE(SUM(quantity), 0)` }).from(inventoryTransactions).where(and(txDateFilter, eq(inventoryTransactions.type, "usage"))),
    db.select({ qty: sql<number>`COALESCE(SUM(quantity), 0)` }).from(inventoryWastage).where(wastageDateFilter),
    db.select({ count: sql<number>`count(*)` }).from(purchaseOrders).where(poDateFilter),
    db.select({ amount: sql<number>`COALESCE(SUM(total_amount), 0)` }).from(purchaseOrders).where(poDateFilter),
    db.execute(sql`
      SELECT p.name, COALESCE(SUM(t.quantity), 0) AS "totalUsed"
      FROM inventory_transactions t JOIN products p ON p.id = t.product_id
      WHERE t.tenant_id = ${tenantId} AND t.type = 'usage' AND t.created_at >= ${dateFrom} AND t.created_at <= ${dateTo}
      GROUP BY p.id, p.name ORDER BY "totalUsed" DESC LIMIT 10
    `),
    getAllStockWithFilters(),
    db.select({ id: purchaseOrders.id, vendorId: purchaseOrders.vendorId, invoiceNumber: purchaseOrders.invoiceNumber, totalAmount: purchaseOrders.totalAmount, purchaseDate: purchaseOrders.purchaseDate, vendorName: vendors.name })
      .from(purchaseOrders).leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.tenantId, tenantId)).orderBy(desc(purchaseOrders.purchaseDate)).limit(5),
    db.select({ id: inventoryTransactions.id, productId: inventoryTransactions.productId, quantity: inventoryTransactions.quantity, createdAt: inventoryTransactions.createdAt, note: inventoryTransactions.note })
      .from(inventoryTransactions).where(and(eq(inventoryTransactions.tenantId, tenantId), eq(inventoryTransactions.type, "usage")))
      .orderBy(desc(inventoryTransactions.createdAt)).limit(5),
    db.select({ id: inventoryWastage.id, productId: inventoryWastage.productId, quantity: inventoryWastage.quantity, reason: inventoryWastage.reason, createdAt: inventoryWastage.createdAt })
      .from(inventoryWastage).where(eq(inventoryWastage.tenantId, tenantId)).orderBy(desc(inventoryWastage.createdAt)).limit(5),
    db.execute(sql`
      SELECT pc.name AS "categoryName", COUNT(p.id) AS "totalProducts",
        COALESCE(SUM(COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
          + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0)), 0) AS "totalStock",
        COALESCE(SUM((COALESCE(SUM(CASE WHEN t.type = 'purchase' THEN t.quantity ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN t.type IN ('usage', 'wastage') THEN t.quantity ELSE 0 END), 0)
          + COALESCE(SUM(CASE WHEN t.type = 'adjustment' THEN t.quantity ELSE 0 END), 0)) * p.cost_price), 0) AS "totalValue"
      FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id
      LEFT JOIN inventory_transactions t ON t.product_id = p.id AND t.tenant_id = p.tenant_id
      WHERE p.tenant_id = ${tenantId} AND p.is_active = true${categoryId ? sql` AND p.category_id = ${categoryId}` : sql``}
      GROUP BY pc.id, pc.name ORDER BY "totalValue" DESC
    `),
    getMonthlyTrends(),
    getDailyTrend("usage"),
    getDailyTrend("wastage"),
    getMonthlyPurchaseTrend(),
  ]);

  const [totalProductsResult, totalVendorsResult, usageResult, wastageResult, purchasesCountResult, purchasesAmountResult, topUsedResult, stockData, recentPurchasesResult, recentUsageResultRaw, recentWastageResultRaw, valuationResult, monthlyTrends, usageTrendData, wastageTrendData, purchaseTrendData] = results;
  const { valueTrend, stockTrend } = monthlyTrends as any;
  const stockList = Array.isArray(stockData) ? stockData : [];
  const totalStockQty = stockList.reduce((s: number, p: any) => s + p.stock, 0);
  const totalValue = stockList.reduce((s: number, p: any) => s + p.stock * p.costPrice, 0);
  const lowStockCount = stockList.filter((p: any) => p.stock <= p.reorderLevel).length;
  const lowStockList = stockList.filter((p: any) => p.stock <= p.reorderLevel).sort((a: any, b: any) => a.stock - b.stock);

  const recentUsage = await Promise.all(
    (recentUsageResultRaw as any[]).map(async (t: any) => {
      const [prod] = await db.select({ name: products.name, sku: products.sku }).from(products).where(eq(products.id, t.productId));
      return { ...t, productName: prod?.name || "Unknown", productSku: prod?.sku || "" };
    })
  );
  const recentWastage = await Promise.all(
    (recentWastageResultRaw as any[]).map(async (w: any) => {
      const [prod] = await db.select({ name: products.name, sku: products.sku, costPrice: products.costPrice }).from(products).where(eq(products.id, w.productId));
      return { ...w, productName: prod?.name || "Unknown", productSku: prod?.sku || "", costPrice: prod?.costPrice || 0 };
    })
  );

  const topUsedProducts = ((topUsedResult as any).rows || []).map((r: any) => ({ name: r.name, totalUsed: Number(r.totalUsed) || 0 }));
  const valuationByCategory = ((valuationResult as any).rows || []).map((r: any) => ({
    categoryName: r.categoryName || "Uncategorized", totalProducts: Number(r.totalProducts) || 0,
    totalStock: Number(r.totalStock) || 0, totalValue: Number(r.totalValue) || 0,
  }));

  return apiSuccess({
    kpi: {
      totalProducts: Number(totalProductsResult[0]?.count) || 0,
      totalInventoryValue: totalValue,
      availableStockQuantity: totalStockQty,
      lowStockItems: lowStockCount,
      productsUsedThisMonth: Number(usageResult[0]?.qty) || 0,
      wastageThisMonth: Number(wastageResult[0]?.qty) || 0,
      totalVendors: Number(totalVendorsResult[0]?.count) || 0,
      purchasesThisMonth: Number(purchasesCountResult[0]?.count) || 0,
      purchasesAmountThisMonth: Number(purchasesAmountResult[0]?.amount) || 0,
    },
    charts: {
      inventoryValueTrend: valueTrend,
      stockLevelTrend: stockTrend,
      usageTrend: usageTrendData,
      wastageTrend: wastageTrendData,
      monthlyPurchaseTrend: purchaseTrendData,
      topUsedProducts,
      topLowStockProducts: lowStockList.slice(0, 10).map((p: any) => ({
        name: p.productName, sku: p.sku, stock: p.stock, reorderLevel: p.reorderLevel,
      })),
    },
    recentActivity: {
      recentPurchases: (recentPurchasesResult as any[]).map((p: any) => ({
        ...p, purchaseDate: p.purchaseDate?.toISOString?.() || p.purchaseDate, vendorName: p.vendorName || "Unknown",
      })),
      recentGoodsReceipts: (recentPurchasesResult as any[]).slice(0, 5).map((p: any) => ({
        ...p, purchaseDate: p.purchaseDate?.toISOString?.() || p.purchaseDate, vendorName: p.vendorName || "Unknown",
      })),
      recentProductUsage: recentUsage,
      recentWastage,
    },
    summary: {
      lowStockSummary: lowStockList.map((p: any) => ({
        name: p.productName, sku: p.sku, stock: p.stock, reorderLevel: p.reorderLevel, value: p.stock * p.costPrice,
      })),
      inventoryValuationSummary: valuationByCategory,
      monthlyUsageSummary: { total: Number(usageResult[0]?.qty) || 0 },
      monthlyWastageSummary: { total: Number(wastageResult[0]?.qty) || 0 },
      monthlyProcurementSummary: {
        count: Number(purchasesCountResult[0]?.count) || 0,
        amount: Number(purchasesAmountResult[0]?.amount) || 0,
      },
    },
  });
  } catch (err: any) {
    console.error("Dashboard API error:", err);
    return apiError(err?.message || "Internal server error", "INTERNAL_ERROR", 500);
  }
}
