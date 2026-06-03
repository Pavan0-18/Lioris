import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { packages, customerPackages, customers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createApiHandler, getRouteId } from "@/lib/api-handler";

export const POST = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);
  const body = await req.json();

  const [pkg] = await db.select()
    .from(packages)
    .where(and(eq(packages.id, id), eq(packages.tenantId, tenantId), eq(packages.isActive, true)))
    .limit(1);

  if (!pkg) { const e = new Error("Package not found or inactive") as any; e.code = "NOT_FOUND"; throw e; }

  const [customer] = await db.select()
    .from(customers)
    .where(and(eq(customers.id, body.customerId), eq(customers.tenantId, tenantId)))
    .limit(1);

  if (!customer) { const e = new Error("Customer not found") as any; e.code = "NOT_FOUND"; throw e; }

  const expiresAt = pkg.validityDays
    ? new Date(Date.now() + pkg.validityDays * 86400000)
    : null;

  const [inserted] = await db.insert(customerPackages).values({
    tenantId,
    customerId: body.customerId,
    packageId: id,
    visitsRemaining: pkg.totalVisits,
    expiresAt,
  }).returning();

  return apiSuccess(inserted);
}, { method: "POST", requiredPermission: "marketing:create" });
