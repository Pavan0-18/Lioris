import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createApiHandler, getRouteId } from "@/lib/api-handler";

export const GET = createApiHandler(async (req) => {
  const id = getRouteId(req);
  const [tenant] = await db.select({ ipWhitelist: tenants.ipWhitelist }).from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) { const e = new Error("Tenant not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(JSON.parse(tenant.ipWhitelist || "[]"));
}, { method: "GET" });

export const PUT = createApiHandler(async (req) => {
  const id = getRouteId(req);
  const body = await req.json();

  const [updated] = await db.update(tenants)
    .set({ ipWhitelist: JSON.stringify(body.ips || []), updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning({ ipWhitelist: tenants.ipWhitelist });

  if (!updated) { const e = new Error("Tenant not found") as any; e.code = "NOT_FOUND"; throw e; }
  return apiSuccess(JSON.parse(updated.ipWhitelist || "[]"));
}, { method: "PUT" });
