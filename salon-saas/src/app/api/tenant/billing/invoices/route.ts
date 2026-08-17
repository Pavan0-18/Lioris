import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { invoices, invoiceItems, customers, branches, services, tenants } from "@/lib/db/schema";
import { and, eq, sql, inArray } from "drizzle-orm";
import { createManualInvoiceSchema } from "@/lib/validators/billing";

export async function GET(req: Request) {
  try {
    const startTime = performance.now();
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const customerId = url.searchParams.get("customerId");
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(invoices.tenantId, tenantId)];
    if (status) conditions.push(eq(invoices.status, status));
    if (customerId) conditions.push(eq(invoices.customerId, customerId));

    const list = await db.select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      subtotal: invoices.subtotal,
      taxAmount: invoices.taxAmount,
      discountAmount: invoices.discountAmount,
      total: invoices.total,
      status: invoices.status,
      currency: invoices.currency,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
      customerId: invoices.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
      .from(invoices)
      .innerJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(sql`${invoices.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db.select({ total: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(...conditions));

    const mapped = list.map(item => ({
      id: item.id,
      invoiceNo: item.invoiceNo,
      subtotal: item.subtotal,
      taxAmount: item.taxAmount,
      discountAmount: item.discountAmount,
      total: item.total,
      status: item.status,
      currency: item.currency,
      notes: item.notes,
      createdAt: item.createdAt,
      customer: { id: item.customerId, name: item.customerName, phone: item.customerPhone },
    }));

    const queryTime = Math.round(performance.now() - startTime);
    console.log(`[INVOICES API] Complete. queryTime=${queryTime}ms, results=${mapped.length}`);

    return apiSuccess({ invoices: mapped, total: totalResult?.total || 0, page, limit });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();
    const parsed = createManualInvoiceSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);

    const { customerId, branchId, items, notes, discount } = parsed.data;

    const [customer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId))).limit(1);
    if (!customer) return apiError("Customer not found", "NOT_FOUND", 404);

    const [branch] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, branchId), eq(branches.tenantId, tenantId))).limit(1);
    if (!branch) return apiError("Branch not found", "NOT_FOUND", 404);

    const [tenant] = await db.select({ slug: tenants.slug, currency: tenants.currency, taxRate: tenants.taxRate }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) return apiError("Tenant not found", "NOT_FOUND", 404);

    // Pre-fetch services to avoid N+1 query loop
    const serviceIds = items.map(i => i.serviceId).filter(Boolean) as string[];
    let serviceMap = new Map<string, { id: string; taxable: boolean }>();
    if (serviceIds.length > 0) {
      const fetchedServices = await db.select({ id: services.id, taxable: services.taxable })
        .from(services)
        .where(and(eq(services.tenantId, tenantId), inArray(services.id, serviceIds)));
      
      for (const s of fetchedServices) {
        serviceMap.set(s.id, s);
      }
    }

    let subtotal = 0;
    const invoiceItemsData: any[] = [];

    for (const item of items) {
      let taxRate = 0;
      if (item.serviceId) {
        const svc = serviceMap.get(item.serviceId);
        if (!svc) return apiError(`Service ${item.serviceId} not found`, "NOT_FOUND", 404);
        if (svc.taxable) taxRate = tenant.taxRate || 0;
      }

      const lineTotal = item.price * item.qty * (1 - item.discount / 100);
      subtotal += lineTotal;

      invoiceItemsData.push({
        serviceId: item.serviceId || null,
        name: item.name,
        price: item.price,
        qty: item.qty,
        discount: item.discount,
        taxRate,
        lineTotal,
      });
    }

    const taxAmount = invoiceItemsData.reduce((sum, i) => sum + i.lineTotal * (i.taxRate / 100), 0);
    const discountAmount = Number(discount) || 0;
    const total = Math.max(0, subtotal + taxAmount - discountAmount);

    const year = new Date().getFullYear();
    const [seqResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), sql`EXTRACT(YEAR FROM ${invoices.createdAt}) = ${year}`));
    const seq = (seqResult?.count || 0) + 1;
    const invoiceNo = `${tenant.slug.toUpperCase()}-${year}-${String(seq).padStart(4, "0")}`;

    const [inv] = await db.insert(invoices).values({
      tenantId,
      branchId,
      customerId,
      invoiceNo,
      subtotal,
      taxAmount,
      discountAmount,
      total,
      currency: tenant.currency || "INR",
      status: "draft",
      notes: notes || null,
      createdBy: userId,
    }).returning();

    // Bulk insert invoice items in a single query
    if (invoiceItemsData.length > 0) {
      await db.insert(invoiceItems).values(
        invoiceItemsData.map(item => ({
          invoiceId: inv.id,
          ...item,
        }))
      );
    }

    return apiSuccess({ invoiceId: inv.id, invoiceNo });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
