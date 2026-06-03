import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { giftCards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createApiHandler, getRouteId } from "@/lib/api-handler";

export const GET = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);

  const [gc] = await db.select()
    .from(giftCards)
    .where(and(eq(giftCards.id, id), eq(giftCards.tenantId, tenantId)))
    .limit(1);

  if (!gc) { const e = new Error("Gift card not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(gc);
}, { method: "GET", requiredPermission: "marketing:read" });

export const PUT = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);
  const body = await req.json();

  const [updated] = await db.update(giftCards)
    .set({ isActive: body.isActive })
    .where(and(eq(giftCards.id, id), eq(giftCards.tenantId, tenantId)))
    .returning();

  if (!updated) { const e = new Error("Gift card not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(updated);
}, { method: "PUT", requiredPermission: "marketing:update" });
