import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature, hasFeature } from "@/lib/feature-gate";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers, appointments, appointmentServices, services } from "@/lib/db/schema";
import { staff, users } from "@/lib/db/schema";
import { invoices } from "@/lib/db/schema";
import { and, eq, ilike, or, gte, lte, desc, count, sql, ne, inArray } from "drizzle-orm";
import { createCustomerSchema, customerFilterSchema } from "@/lib/validators/crm";
import { subDays } from "date-fns";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim();
    const segment = url.searchParams.get("segment");
    const sortBy = url.searchParams.get("sortBy") || "name";
    const sortDir = url.searchParams.get("sortDir") || "asc";
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 20;

    // Full CRM query when segment or sort params present
    if (segment || url.searchParams.has("sortBy") || url.searchParams.has("page")) {
      const crmEnabled = await hasFeature(tenantId, "CRM");
      if (!crmEnabled) return apiError("CRM feature not enabled", "FEATURE_NOT_ENABLED", 403);

      let whereClauses = and(eq(customers.tenantId, tenantId), eq(customers.isActive, true));

      if (search) {
        whereClauses = and(whereClauses, or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.phone, `%${search}%`),
        ));
      }

      const now = new Date();
      if (segment === "new") {
        whereClauses = and(whereClauses, gte(customers.createdAt, subDays(now, 30)));
      }

      const offset = (page - 1) * limit;

      const list = await db.select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        gender: customers.gender,
        tags: customers.tags,
        loyaltyPoints: customers.loyaltyPoints,
        notes: customers.notes,
        preferredContactMethod: customers.preferredContactMethod,
        createdAt: customers.createdAt,
        visitCount: sql<number>`COALESCE((
          SELECT COUNT(*)::int FROM ${appointments}
          WHERE ${appointments.customerId} = ${customers.id}
          AND ${appointments.tenantId} = ${tenantId}
          AND ${appointments.status} = 'completed'
        ), 0)`,
        lastVisit: sql<string | null>`(
          SELECT MAX(${appointments.startTime}) FROM ${appointments}
          WHERE ${appointments.customerId} = ${customers.id}
          AND ${appointments.tenantId} = ${tenantId}
          AND ${appointments.status} = 'completed'
        )`,
        totalSpent: sql<number>`COALESCE((
          SELECT SUM(${invoices.total})::real FROM ${invoices}
          WHERE ${invoices.customerId} = ${customers.id}
          AND ${invoices.tenantId} = ${tenantId}
          AND ${invoices.status} IN ('paid', 'partial')
        ), 0)`,
      })
        .from(customers)
        .where(whereClauses)
        .orderBy(sortBy === "name" ? (sortDir === "desc" ? desc(customers.name) : customers.name)
          : sortBy === "createdAt" ? (sortDir === "desc" ? desc(customers.createdAt) : customers.createdAt)
          : sortBy === "visits" ? sql`visit_count ${sortDir === "desc" ? sql`DESC NULLS LAST` : sql`ASC NULLS LAST`}`
          : sortBy === "spending" ? sql`total_spent ${sortDir === "desc" ? sql`DESC NULLS LAST` : sql`ASC NULLS LAST`}`
          : sortBy === "lastVisit" ? sql`last_visit ${sortDir === "desc" ? sql`DESC NULLS LAST` : sql`ASC NULLS LAST`}`
          : customers.name)
        .limit(limit)
        .offset(offset);

      // Application-level segment filtering for "inactive" and "repeat"
      let filtered = list;
      if (segment === "inactive") {
        filtered = list.filter(c => {
          if (!c.lastVisit) return true;
          return new Date(c.lastVisit) < subDays(now, 60);
        });
      } else if (segment === "repeat") {
        filtered = list.filter(c => c.visitCount >= 3);
      } else if (segment === "new") {
        filtered = list.filter(c => c.visitCount <= 1);
      }

      const [totalResult] = await db.select({ total: count() }).from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.isActive, true)));
      const total = totalResult?.total || 0;

      return apiSuccess({ customers: filtered, total, page, limit });
    }

    // Simple search mode (for booking modal)
    const list = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        loyaltyPoints: customers.loyaltyPoints,
        tags: customers.tags,
        preferredContactMethod: customers.preferredContactMethod,
      })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          eq(customers.isActive, true),
          search ? or(
            ilike(customers.name, `%${search}%`),
            ilike(customers.phone, `%${search}%`)
          ) : undefined,
        )
      )
      .limit(10);

    return apiSuccess(list);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);

    const { name, phone, email, gender, dob, address, notes, tags } = parsed.data;

    const [existing] = await db.select().from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.phone, phone)))
      .limit(1);
    if (existing) return apiError("Customer with this phone already exists", "CONFLICT", 409);

    const [inserted] = await db.insert(customers).values({
      tenantId,
      name,
      phone,
      email: email || null,
      gender: gender || null,
      dob: dob ? new Date(dob) : null,
      address: address || null,
      notes: notes || null,
      tags: tags || null,
      isActive: true,
    }).returning();

    return apiSuccess(inserted);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
