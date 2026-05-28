import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, eq, ilike, or } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";

    const list = await db.select().from(customers).where(
      and(
        eq(customers.tenantId, tenantId),
        or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.phone, `%${search}%`)
        )
      )
    );

    return apiSuccess(list);
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
    const [inserted] = await db.insert(customers).values({
      tenantId,
      name: body.name,
      phone: body.phone,
      isActive: true
    }).returning();

    return apiSuccess(inserted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
