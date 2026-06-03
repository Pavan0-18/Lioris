import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { shiftHandovers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId");
  const shiftDate = url.searchParams.get("shiftDate");

  const conditions = [eq(shiftHandovers.tenantId, tenantId)];
  if (branchId) conditions.push(eq(shiftHandovers.branchId, branchId));
  if (shiftDate) conditions.push(eq(shiftHandovers.shiftDate, new Date(shiftDate)));

  const list = await db.select()
    .from(shiftHandovers)
    .where(and(...conditions))
    .orderBy(desc(shiftHandovers.createdAt));

  return apiSuccess(list);
}, { method: "GET", requiredPermission: "operations:read" });

export const POST = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const body = await req.json();

  const [inserted] = await db.insert(shiftHandovers).values({
    tenantId,
    branchId: body.branchId,
    fromStaffId: body.fromStaffId,
    toStaffId: body.toStaffId,
    notes: body.notes || "",
    priority: body.priority || "normal",
    shiftDate: body.shiftDate ? new Date(body.shiftDate) : new Date(),
  }).returning();

  return apiSuccess(inserted);
}, { method: "POST", requiredPermission: "operations:create" });

export const PUT = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const body = await req.json();

  const [updated] = await db.update(shiftHandovers)
    .set({ isCompleted: body.isCompleted, toStaffId: body.toStaffId, notes: body.notes || "" })
    .where(and(eq(shiftHandovers.id, body.id), eq(shiftHandovers.tenantId, tenantId)))
    .returning();

  if (!updated) { const e = new Error("Handover not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(updated);
}, { method: "PUT", requiredPermission: "operations:update" });
