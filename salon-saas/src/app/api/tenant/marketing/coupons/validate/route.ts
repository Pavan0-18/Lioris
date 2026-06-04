import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const POST = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const body = await req.json();

  const [coupon] = await db.select()
    .from(coupons)
    .where(and(
      eq(coupons.tenantId, tenantId),
      eq(coupons.code, body.code.toUpperCase()),
      eq(coupons.isActive, true),
      lte(coupons.startsAt || new Date(0), new Date()),
      gte(coupons.expiresAt || new Date(8640000000000000), new Date()),
    ))
    .limit(1);

  if (!coupon) { const e = new Error("Invalid or expired coupon") as any; e.code = "INVALID_INPUT"; throw e; }
  if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    const e = new Error("Coupon usage limit reached") as any; e.code = "INVALID_INPUT"; throw e;
  }

  return apiSuccess(coupon);
}, { method: "POST", requiredPermission: "marketing:read" });
