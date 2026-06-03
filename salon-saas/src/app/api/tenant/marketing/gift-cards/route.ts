import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { giftCards } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { createId } from "@paralleldrive/cuid2";

export const GET = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const list = await db.select()
    .from(giftCards)
    .where(eq(giftCards.tenantId, tenantId))
    .orderBy(desc(giftCards.createdAt));
  return apiSuccess(list);
}, { method: "GET", requiredPermission: "marketing:read" });

export const POST = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const body = await req.json();
  const code = "GC-" + createId().slice(0, 8).toUpperCase();

  const [inserted] = await db.insert(giftCards).values({
    tenantId,
    code,
    initialBalance: body.initialBalance,
    balance: body.initialBalance,
    senderName: body.senderName,
    recipientName: body.recipientName,
    recipientEmail: body.recipientEmail,
    message: body.message,
    purchasedById: body.purchasedById,
  }).returning();

  return apiSuccess(inserted);
}, { method: "POST", requiredPermission: "marketing:create" });
