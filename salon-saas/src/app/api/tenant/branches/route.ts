import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const startTime = performance.now();
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const list = await db
      .select({
        id: branches.id,
        name: branches.name,
        address: branches.address,
        city: branches.city,
        state: branches.state,
        country: branches.country,
        phone: branches.phone,
        email: branches.email,
        isHQ: branches.isHQ,
        isActive: branches.isActive,
      })
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true)))
      .orderBy(branches.name);

    const queryTime = Math.round(performance.now() - startTime);
    console.log(`[BRANCHES API] Complete. queryTime=${queryTime}ms, results=${list.length}`);

    return apiSuccess(list, 200, { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();
    const [inserted] = await db.insert(branches).values({
      tenantId,
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country,
      isHQ: body.isHQ || false,
      isActive: true
    }).returning();

    return apiSuccess(inserted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
