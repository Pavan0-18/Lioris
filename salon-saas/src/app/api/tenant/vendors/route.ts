import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess, getPaginationParams } from "@/lib/utils";
import { db } from "@/lib/db";
import { vendors, purchaseOrderItems, purchaseOrders } from "@/lib/db/schema";
import { eq, desc, ilike, and, or, count, sql } from "drizzle-orm";
import { createVendorSchema } from "@/lib/validators/vendor";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const { page, pageSize, offset } = getPaginationParams(searchParams);

    const all = searchParams.get("all") === "true";

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
    if (status === "active") filters.push(eq(vendors.isActive, "true"));
    if (status === "inactive") filters.push(eq(vendors.isActive, "false"));

    const productsSuppliedSubquery = db
      .select({ count: count(sql`DISTINCT ${purchaseOrderItems.productId}`) })
      .from(purchaseOrderItems)
      .innerJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .where(
        and(
          eq(purchaseOrders.vendorId, vendors.id),
          eq(purchaseOrders.tenantId, tenantId)
        )
      );

    if (all) {
      const list = await db
        .select({
          id: vendors.id,
          name: vendors.name,
          contactPerson: vendors.contactPerson,
          phone: vendors.phone,
          email: vendors.email,
          address: vendors.address,
          notes: vendors.notes,
          isActive: vendors.isActive,
          createdAt: vendors.createdAt,
          updatedAt: vendors.updatedAt,
          productsSupplied: sql<number>`(${productsSuppliedSubquery})`.as("productsSupplied"),
        })
        .from(vendors)
        .where(and(...filters))
        .orderBy(desc(vendors.createdAt));
      return apiSuccess(list);
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(vendors)
      .where(and(...filters));

    const list = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        contactPerson: vendors.contactPerson,
        phone: vendors.phone,
        email: vendors.email,
        address: vendors.address,
        notes: vendors.notes,
        isActive: vendors.isActive,
        createdAt: vendors.createdAt,
        updatedAt: vendors.updatedAt,
        productsSupplied: sql<number>`(${productsSuppliedSubquery})`.as("productsSupplied"),
      })
      .from(vendors)
      .where(and(...filters))
      .orderBy(desc(vendors.createdAt))
      .limit(pageSize)
      .offset(offset);

    return apiSuccess({ data: list, total, page, pageSize });
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
