import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { inventoryWastage, inventoryTransactions, products, productUnits, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createWastageSchema } from "@/lib/validators/inventory";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { searchParams } = new URL(req.url);
    const reason = searchParams.get("reason");
    const productId = searchParams.get("productId");

    const conditions = [eq(inventoryWastage.tenantId, tenantId)];
    if (reason) conditions.push(eq(inventoryWastage.reason, reason as any));
    if (productId) conditions.push(eq(inventoryWastage.productId, productId));

    const list = await db
      .select({
        id: inventoryWastage.id,
        productId: inventoryWastage.productId,
        productName: products.name,
        productSku: products.sku,
        unitName: productUnits.abbreviation,
        quantity: inventoryWastage.quantity,
        reason: inventoryWastage.reason,
        notes: inventoryWastage.notes,
        createdBy: inventoryWastage.createdBy,
        createdByName: users.name,
        createdAt: inventoryWastage.createdAt,
      })
      .from(inventoryWastage)
      .leftJoin(products, eq(inventoryWastage.productId, products.id))
      .leftJoin(productUnits, eq(products.unitId, productUnits.id))
      .leftJoin(users, eq(inventoryWastage.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(inventoryWastage.createdAt));

    return apiSuccess(list);
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
    const parsed = createWastageSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", "VALIDATION_ERROR", 400);

    const [wastageRecord] = await db.insert(inventoryWastage).values({
      tenantId,
      createdBy: userId,
      ...parsed.data,
    }).returning();

    await db.insert(inventoryTransactions).values({
      tenantId,
      productId: parsed.data.productId,
      type: "wastage",
      quantity: -parsed.data.quantity,
      reference: `WST-${wastageRecord.id.slice(0, 8)}`,
      note: parsed.data.notes || `Wastage: ${parsed.data.reason}`,
    });

    return apiSuccess(wastageRecord);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
