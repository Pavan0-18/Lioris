import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { refunds, invoices, payments } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const list = await db.select()
    .from(refunds)
    .where(eq(refunds.tenantId, tenantId))
    .orderBy(desc(refunds.createdAt));
  return apiSuccess(list);
}, { method: "GET", requiredPermission: "billing:read" });

export const POST = createApiHandler(async (req, context) => {
  const { tenantId, userId } = context.auth;
  const body = await req.json();

  const [inv] = await db.select()
    .from(invoices)
    .where(and(eq(invoices.id, body.invoiceId), eq(invoices.tenantId, tenantId)))
    .limit(1);
  if (!inv) { const e = new Error("Invoice not found") as any; e.code = "NOT_FOUND"; throw e; }

  const [inserted] = await db.insert(refunds).values({
    tenantId,
    invoiceId: body.invoiceId,
    paymentId: body.paymentId,
    amount: body.amount,
    reason: body.reason,
    status: "completed",
    processedBy: userId,
    processedAt: new Date(),
    notes: body.notes,
  }).returning();

  return apiSuccess(inserted);
}, { method: "POST", requiredPermission: "billing:create" });
