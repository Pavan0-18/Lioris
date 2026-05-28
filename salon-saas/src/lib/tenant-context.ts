import { headers } from "next/headers";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
  tenant: typeof tenants.$inferSelect;
}

export async function getTenantFromSession(): Promise<TenantContext> {
  const headersList = await headers();
  const tenantId = headersList.get("x-tenant-id");
  const userId = headersList.get("x-user-id");
  const role = headersList.get("x-user-role");

  if (!tenantId || !userId || !role) {
    const err = new Error("Unauthorized") as any;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  if (!tenant) {
    const err = new Error("Tenant not found") as any;
    err.code = "NOT_FOUND";
    throw err;
  }

  if (!tenant.isActive || tenant.planStatus === "suspended") {
    const err = new Error("Tenant account is suspended") as any;
    err.code = "FORBIDDEN";
    throw err;
  }

  return { tenantId, userId, role, tenant };
}
