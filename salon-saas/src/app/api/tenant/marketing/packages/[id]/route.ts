import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { packages, packageServices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createApiHandler, getRouteId } from "@/lib/api-handler";

export const GET = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);

  const [pkg] = await db.select()
    .from(packages)
    .where(and(eq(packages.id, id), eq(packages.tenantId, tenantId)))
    .limit(1);

  if (!pkg) { const e = new Error("Package not found") as any; e.code = "NOT_FOUND"; throw e; }

  const services = await db.select()
    .from(packageServices)
    .where(eq(packageServices.packageId, id));

  return apiSuccess({ ...pkg, services });
}, { method: "GET", requiredPermission: "marketing:read" });

export const PUT = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);
  const body = await req.json();

  const [updated] = await db.update(packages)
    .set({
      name: body.name,
      description: body.description,
      price: body.price,
      totalVisits: body.totalVisits,
      validityDays: body.validityDays,
      isRecurring: body.isRecurring,
      recurringPrice: body.recurringPrice,
      recurringInterval: body.recurringInterval,
      isActive: body.isActive,
    })
    .where(and(eq(packages.id, id), eq(packages.tenantId, tenantId)))
    .returning();

  if (!updated) { const e = new Error("Package not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(updated);
}, { method: "PUT", requiredPermission: "marketing:update" });

export const DELETE = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);

  await db.delete(packages)
    .where(and(eq(packages.id, id), eq(packages.tenantId, tenantId)));

  return apiSuccess({ success: true });
}, { method: "DELETE", requiredPermission: "marketing:delete" });
