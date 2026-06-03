import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { giftCards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createApiHandler, getRouteId } from "@/lib/api-handler";

export const POST = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);
  const body = await req.json();

  const [gc] = await db.select()
    .from(giftCards)
    .where(and(eq(giftCards.id, id), eq(giftCards.tenantId, tenantId), eq(giftCards.isActive, true)))
    .limit(1);

  if (!gc) { const e = new Error("Gift card not found or inactive") as any; e.code = "NOT_FOUND"; throw e; }
  if (gc.balance < body.amount) { const e = new Error("Insufficient balance") as any; e.code = "INVALID_INPUT"; throw e; }

  const [updated] = await db.update(giftCards)
    .set({ balance: gc.balance - body.amount })
    .where(eq(giftCards.id, id))
    .returning();

  return apiSuccess(updated);
}, { method: "POST", requiredPermission: "marketing:update" });
