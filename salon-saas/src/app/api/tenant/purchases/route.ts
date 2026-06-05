import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess, getPaginationParams } from "@/lib/utils";
import { db } from "@/lib/db";
import { purchaseOrders, purchaseOrderItems, inventoryTransactions, vendors, products } from "@/lib/db/schema";
import { eq, desc, and, or, ilike, inArray, count, sql } from "drizzle-orm";
import { createPurchaseOrderSchema } from "@/lib/validators/purchase";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId");
    const search = searchParams.get("search");
    const statusFilter = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    const conditions: any[] = [eq(purchaseOrders.tenantId, tenantId)];
    if (vendorId) conditions.push(eq(purchaseOrders.vendorId, vendorId));
    if (startDate) conditions.push(sql`${purchaseOrders.purchaseDate} >= ${startDate}::date`);
    if (endDate) conditions.push(sql`${purchaseOrders.purchaseDate} <= ${endDate}::date`);
    if (search) {
      const productOrderIds = db
        .select({ id: purchaseOrderItems.purchaseOrderId })
        .from(purchaseOrderItems)
        .innerJoin(products, eq(purchaseOrderItems.productId, products.id))
        .where(ilike(products.name, `%${search}%`));

      const searchFilter = or(
        ilike(vendors.name, `%${search}%`),
        ilike(purchaseOrders.invoiceNumber, `%${search}%`),
        inArray(purchaseOrders.id, productOrderIds),
      );
      if (searchFilter) conditions.push(searchFilter);
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(and(...conditions));

    const itemCountSubquery = db
      .select({ count: count() })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id));

    const list = await db
      .select({
        id: purchaseOrders.id,
        vendorId: purchaseOrders.vendorId,
        vendorName: vendors.name,
        invoiceNumber: purchaseOrders.invoiceNumber,
        purchaseDate: purchaseOrders.purchaseDate,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        invoiceUrl: purchaseOrders.invoiceUrl,
        createdAt: purchaseOrders.createdAt,
        itemCount: sql<number>`(${itemCountSubquery})`.as("itemCount"),
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(pageSize)
      .offset(offset);

    const itemsWithStatus = list.map((item) => ({
      ...item,
      status: statusFilter
        ? statusFilter
        : item.itemCount > 0
        ? "received"
        : "pending",
    }));

    return apiSuccess({ data: itemsWithStatus, total, page, pageSize });
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
    const parsed = createPurchaseOrderSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", "VALIDATION_ERROR", 400);

    const { items, ...orderData } = parsed.data;
    const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

    const [order] = await db.insert(purchaseOrders).values({
      tenantId,
      ...orderData,
      purchaseDate: orderData.purchaseDate ? new Date(orderData.purchaseDate) : new Date(),
      totalAmount,
    }).returning();

    const orderItems = items.map((item) => ({
      purchaseOrderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
    }));

    await db.insert(purchaseOrderItems).values(orderItems);

    const transactions = items.map((item) => ({
      tenantId,
      productId: item.productId,
      type: "purchase" as const,
      quantity: item.quantity,
      unitCost: item.unitCost,
      reference: order.invoiceNumber || `PO-${order.id.slice(0, 8)}`,
      note: `Purchase order ${order.id.slice(0, 8)}`,
    }));

    await db.insert(inventoryTransactions).values(transactions);

    return apiSuccess(order);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
