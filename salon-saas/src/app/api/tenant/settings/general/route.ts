import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { tenantId } = await getTenantFromSession();
    const [tenant] = await db.select({ name: tenants.name, phone: tenants.phone }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) return apiError("Tenant not found", "NOT_FOUND", 404);
    return apiSuccess(tenant);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();
    await db.update(tenants)
      .set({
        name: body.name,
        phone: body.phone,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId));

    return apiSuccess({ success: true });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
