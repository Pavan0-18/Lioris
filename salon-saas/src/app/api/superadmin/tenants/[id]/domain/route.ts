import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createApiHandler, getRouteId } from "@/lib/api-handler";

export const GET = createApiHandler(async (req) => {
  const id = getRouteId(req);
  const [tenant] = await db.select({
    customDomain: tenants.customDomain,
    customDomainVerified: tenants.customDomainVerified,
  }).from(tenants).where(eq(tenants.id, id)).limit(1);

  if (!tenant) { const e = new Error("Tenant not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(tenant);
}, { method: "GET" });

export const PUT = createApiHandler(async (req) => {
  const id = getRouteId(req);
  const body = await req.json();

  const [updated] = await db.update(tenants)
    .set({
      customDomain: body.domain || null,
      customDomainVerified: body.verified || false,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, id))
    .returning({ customDomain: tenants.customDomain, customDomainVerified: tenants.customDomainVerified });

  if (!updated) { const e = new Error("Tenant not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(updated);
}, { method: "PUT" });
