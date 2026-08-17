import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { eq, desc, ilike, and, or } from "drizzle-orm";
import { createVendorSchema } from "@/lib/validators/vendor";

export async function GET(req: Request) {
  try {
    const startTime = performance.now();
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const filters: any[] = [eq(vendors.tenantId, tenantId)];
    if (search) {
      filters.push(
        or(
          ilike(vendors.name, `%${search}%`),
          ilike(vendors.contactPerson, `%${search}%`),
          ilike(vendors.email, `%${search}%`),
          ilike(vendors.phone, `%${search}%`)
        )
      );
    }

    const list = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        contactPerson: vendors.contactPerson,
        email: vendors.email,
        phone: vendors.phone,
        address: vendors.address,
        notes: vendors.notes,
        isActive: vendors.isActive,
        createdAt: vendors.createdAt,
      })
      .from(vendors)
      .where(and(...filters))
      .orderBy(desc(vendors.createdAt));

    const queryTime = Math.round(performance.now() - startTime);
    console.log(`[VENDORS API] Complete. queryTime=${queryTime}ms, results=${list.length}`);

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
    const parsed = createVendorSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", "VALIDATION_ERROR", 400);

    const [inserted] = await db.insert(vendors).values({ tenantId, ...parsed.data }).returning();
    return apiSuccess(inserted);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
