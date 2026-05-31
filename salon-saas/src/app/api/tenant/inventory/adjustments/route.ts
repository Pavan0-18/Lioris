import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { inventoryTransactions } from "@/lib/db/schema";
import { createAdjustmentSchema } from "@/lib/validators/inventory";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();
    const parsed = createAdjustmentSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", "VALIDATION_ERROR", 400);

    const { type, quantity, ...rest } = parsed.data;
    const signedQuantity = type === "purchase" ? quantity : -quantity;

    const [inserted] = await db.insert(inventoryTransactions).values({
      tenantId,
      type,
      quantity: signedQuantity,
      ...rest,
    }).returning();

    return apiSuccess(inserted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
