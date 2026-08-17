import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { stockTransfers, stockTransferItems, inventoryTransactions, branches, products } from "@/lib/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const startTime = performance.now();
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const transfers = await db
      .select({
        id: stockTransfers.id,
        fromBranchId: stockTransfers.fromBranchId,
        toBranchId: stockTransfers.toBranchId,
        status: stockTransfers.status,
        notes: stockTransfers.notes,
        createdAt: stockTransfers.createdAt,
        updatedAt: stockTransfers.updatedAt,
      })
      .from(stockTransfers)
      .where(eq(stockTransfers.tenantId, tenantId))
      .orderBy(desc(stockTransfers.createdAt));

    if (transfers.length === 0) {
      return apiSuccess([]);
    }

    const branchIds = [...new Set(transfers.flatMap((t) => [t.fromBranchId, t.toBranchId]))];
    const branchList = await db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), inArray(branches.id, branchIds)));
    const branchMap = new Map(branchList.map((b) => [b.id, b.name]));

    const transferIds = transfers.map((t) => t.id);
    const transferItemsList = await db
      .select({
        transferId: stockTransferItems.transferId,
        productId: stockTransferItems.productId,
        productName: products.name,
        quantity: stockTransferItems.quantity,
        receivedQuantity: stockTransferItems.receivedQuantity,
      })
      .from(stockTransferItems)
      .innerJoin(products, eq(stockTransferItems.productId, products.id))
      .where(inArray(stockTransferItems.transferId, transferIds));

    const itemsGroupMap = new Map<string, typeof transferItemsList>();
    for (const item of transferItemsList) {
      const list = itemsGroupMap.get(item.transferId) || [];
      list.push(item);
      itemsGroupMap.set(item.transferId, list);
    }

    const result = transfers.map((t) => ({
      ...t,
      fromBranchName: branchMap.get(t.fromBranchId) || "Unknown",
      toBranchName: branchMap.get(t.toBranchId) || "Unknown",
      items: itemsGroupMap.get(t.id) || [],
    }));

    const queryTime = Math.round(performance.now() - startTime);
    console.log(`[STOCK TRANSFERS API] Complete. queryTime=${queryTime}ms, results=${result.length}`);

    return apiSuccess(result);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();
    const { fromBranchId, toBranchId, items, notes } = body;

    if (!fromBranchId || !toBranchId || !Array.isArray(items) || items.length === 0) {
      return apiError("fromBranchId, toBranchId, and non-empty items array are required", "VALIDATION_ERROR", 400);
    }

    if (fromBranchId === toBranchId) {
      return apiError("Source and destination branches cannot be the same", "VALIDATION_ERROR", 400);
    }

    // Verify branches exist and belong to tenant
    const branchCheck = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), inArray(branches.id, [fromBranchId, toBranchId])));

    if (branchCheck.length < 2) {
      return apiError("One or both branches not found", "NOT_FOUND", 404);
    }

    // Insert Transfer Header
    const [transfer] = await db
      .insert(stockTransfers)
      .values({
        tenantId,
        fromBranchId,
        toBranchId,
        status: "completed",
        notes: notes || null,
        createdBy: userId,
      })
      .returning();

    // Insert Transfer Items
    await db.insert(stockTransferItems).values(
      items.map((item: any) => ({
        transferId: transfer.id,
        productId: item.productId,
        quantity: Number(item.quantity),
        receivedQuantity: Number(item.quantity),
      }))
    );

    // Create dual Inventory Transactions (Deduct from source, add to destination)
    const transactions = [];
    for (const item of items) {
      const qty = Number(item.quantity);
      // Source branch deduction
      transactions.push({
        tenantId,
        productId: item.productId,
        type: "adjustment" as const,
        quantity: -qty,
        reference: `TRANSFER-OUT-${transfer.id.slice(0, 8)}`,
        note: `Transferred to branch ${toBranchId}`,
      });
      // Destination branch addition
      transactions.push({
        tenantId,
        productId: item.productId,
        type: "adjustment" as const,
        quantity: qty,
        reference: `TRANSFER-IN-${transfer.id.slice(0, 8)}`,
        note: `Transferred from branch ${fromBranchId}`,
      });
    }

    await db.insert(inventoryTransactions).values(transactions);

    return apiSuccess({ transferId: transfer.id, success: true });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
