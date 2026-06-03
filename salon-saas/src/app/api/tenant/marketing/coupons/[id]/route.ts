import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createApiHandler, getRouteId } from "@/lib/api-handler";

export const GET = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);

  const [coupon] = await db.select()
    .from(coupons)
    .where(and(eq(coupons.id, id), eq(coupons.tenantId, tenantId)))
    .limit(1);

  if (!coupon) { const e = new Error("Coupon not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(coupon);
}, { method: "GET", requiredPermission: "marketing:read" });

export const PUT = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);
  const body = await req.json();

  const [updated] = await db.update(coupons)
    .set({
      code: body.code?.toUpperCase(),
      type: body.type,
      value: body.value,
      minPurchase: body.minPurchase,
      maxDiscount: body.maxDiscount,
      usageLimit: body.usageLimit,
      appliesTo: body.appliesTo,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      isActive: body.isActive,
    })
    .where(and(eq(coupons.id, id), eq(coupons.tenantId, tenantId)))
    .returning();

  if (!updated) { const e = new Error("Coupon not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(updated);
}, { method: "PUT", requiredPermission: "marketing:update" });

export const DELETE = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);

  await db.delete(coupons)
    .where(and(eq(coupons.id, id), eq(coupons.tenantId, tenantId)));

  return apiSuccess({ success: true });
}, { method: "DELETE", requiredPermission: "marketing:delete" });
