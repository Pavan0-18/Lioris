import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { tips } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const url = new URL(req.url);
  const staffId = url.searchParams.get("staffId");

  const conditions = [eq(tips.tenantId, tenantId)];
  if (staffId) conditions.push(eq(tips.staffId, staffId));

  const list = await db.select()
    .from(tips)
    .where(and(...conditions))
    .orderBy(desc(tips.createdAt));

  return apiSuccess(list);
}, { method: "GET", requiredPermission: "billing:read" });

export const POST = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const body = await req.json();

  const [inserted] = await db.insert(tips).values({
    tenantId,
    invoiceId: body.invoiceId,
    staffId: body.staffId,
    amount: body.amount,
    method: body.method || "cash",
    isPooled: body.isPooled || false,
  }).returning();

  return apiSuccess(inserted);
}, { method: "POST", requiredPermission: "billing:create" });
