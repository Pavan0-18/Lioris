import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { purchaseOrders, inventoryTransactions, vendors } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const list = await db
      .select({
        id: purchaseOrders.id,
        vendorName: vendors.name,
        invoiceNumber: purchaseOrders.invoiceNumber,
        purchaseDate: purchaseOrders.purchaseDate,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(and(eq(purchaseOrders.tenantId, tenantId)))
      .orderBy(desc(purchaseOrders.purchaseDate))
      .limit(50);

    return apiSuccess({ data: list });
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
    const { purchaseOrderId, items } = body;

    if (!purchaseOrderId || !items?.length) {
      return apiError("purchaseOrderId and items are required", "VALIDATION_ERROR", 400);
    }

    const [order] = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, purchaseOrderId), eq(purchaseOrders.tenantId, tenantId)));

    if (!order) return apiError("Purchase order not found", "NOT_FOUND", 404);

    const transactions = items.map((item: any) => ({
      tenantId,
      productId: item.productId,
      type: "purchase" as const,
      quantity: item.quantityReceived,
      unitCost: item.unitCost || 0,
      reference: `GR-${purchaseOrderId.slice(0, 8)}`,
      note: `Goods receipt for PO ${order.invoiceNumber || purchaseOrderId.slice(0, 8)}`,
    }));

    await db.insert(inventoryTransactions).values(transactions);

    return apiSuccess({ success: true, transactionCount: transactions.length });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
