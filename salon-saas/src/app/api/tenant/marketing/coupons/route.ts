import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const url = new URL(req.url);
  const isActive = url.searchParams.get("isActive");

  const where = eq(coupons.tenantId, tenantId);
  const conditions = [where];
  if (isActive !== null) conditions.push(eq(coupons.isActive, isActive === "true"));

  const list = await db.select()
    .from(coupons)
    .where(and(...conditions))
    .orderBy(desc(coupons.createdAt));

  return apiSuccess(list);
}, { method: "GET", requiredPermission: "marketing:read" });

export const POST = createApiHandler(async (req, context) => {
  const { tenantId, userId } = context.auth;
  const body = await req.json();

  const [inserted] = await db.insert(coupons).values({
    tenantId,
    code: body.code.toUpperCase(),
    type: body.type || "percentage",
    value: body.value,
    minPurchase: body.minPurchase || 0,
    maxDiscount: body.maxDiscount,
    usageLimit: body.usageLimit || 0,
    appliesTo: body.appliesTo,
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    isActive: true,
  }).returning();

  return apiSuccess({ id: inserted.id });
}, { method: "POST", requiredPermission: "marketing:create" });
