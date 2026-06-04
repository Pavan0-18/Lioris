import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { cashDrawer } from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId");

  const conditions = [eq(cashDrawer.tenantId, tenantId)];
  if (branchId) conditions.push(eq(cashDrawer.branchId, branchId));

  const list = await db.select()
    .from(cashDrawer)
    .where(and(...conditions))
    .orderBy(desc(cashDrawer.openedAt));

  return apiSuccess(list);
}, { method: "GET", requiredPermission: "operations:read" });

export const POST = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const body = await req.json();

  const [existing] = await db.select()
    .from(cashDrawer)
    .where(and(
      eq(cashDrawer.tenantId, tenantId),
      eq(cashDrawer.branchId, body.branchId),
      isNull(cashDrawer.closedAt),
    ))
    .limit(1);

  if (existing) { const e = new Error("Drawer already open for this branch") as any; e.code = "INVALID_INPUT"; throw e; }

  const [inserted] = await db.insert(cashDrawer).values({
    tenantId,
    branchId: body.branchId,
    openedBy: body.openedBy,
    openingBalance: Number(body.openingBalance),
  }).returning();

  return apiSuccess(inserted);
}, { method: "POST", requiredPermission: "operations:create" });

export const PUT = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const body = await req.json();

  const diff = Number(body.closingBalance || 0) - Number(body.expectedBalance || 0);

  const [updated] = await db.update(cashDrawer)
    .set({
      closedBy: body.closedBy,
      closingBalance: Number(body.closingBalance),
      expectedBalance: Number(body.expectedBalance),
      difference: diff,
      cashSales: Number(body.cashSales || 0),
      cardSales: Number(body.cardSales || 0),
      tipsCollected: Number(body.tipsCollected || 0),
      notes: body.notes,
      closedAt: new Date(),
    })
    .where(and(eq(cashDrawer.id, body.id), eq(cashDrawer.tenantId, tenantId)))
    .returning();

  if (!updated) { const e = new Error("Drawer not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(updated);
}, { method: "PUT", requiredPermission: "operations:update" });
