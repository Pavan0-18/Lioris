import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { purchaseOrders, purchaseOrderItems, vendors, products, productUnits } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { id } = await params;
    const [order] = await db
      .select({
        id: purchaseOrders.id,
        vendorId: purchaseOrders.vendorId,
        vendorName: vendors.name,
        vendorContact: vendors.contactPerson,
        vendorPhone: vendors.phone,
        vendorEmail: vendors.email,
        invoiceNumber: purchaseOrders.invoiceNumber,
        purchaseDate: purchaseOrders.purchaseDate,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        invoiceUrl: purchaseOrders.invoiceUrl,
        createdAt: purchaseOrders.createdAt,
      })
      .from(purchaseOrders)
      .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .limit(1);

    if (!order) return apiError("Purchase order not found", "NOT_FOUND", 404);

    const items = await db
      .select({
        id: purchaseOrderItems.id,
        productId: purchaseOrderItems.productId,
        productName: products.name,
        productSku: products.sku,
        unitName: productUnits.abbreviation,
        quantity: purchaseOrderItems.quantity,
        unitCost: purchaseOrderItems.unitCost,
        totalCost: purchaseOrderItems.totalCost,
      })
      .from(purchaseOrderItems)
      .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
      .leftJoin(productUnits, eq(products.unitId, productUnits.id))
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    return apiSuccess({ ...order, items });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { id } = await params;
    const [deleted] = await db
      .delete(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
      .returning();

    if (!deleted) return apiError("Purchase order not found", "NOT_FOUND", 404);
    return apiSuccess(deleted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
