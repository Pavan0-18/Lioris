import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature, hasFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers, appointments, appointmentServices, services, invoices, invoiceItems, payments } from "@/lib/db/schema";
import { staff, users } from "@/lib/db/schema";
import { and, eq, ne, desc, count, sql } from "drizzle-orm";
import { updateCustomerSchema } from "@/lib/validators/crm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "CRM");
    const { id } = await params;

    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!customer) return apiError("Customer not found", "NOT_FOUND", 404);

    const [stats] = await db.select({
      visitCount: count(),
      totalSpent: sql<number>`COALESCE(SUM(${invoices.total})::real, 0)`,
      lastVisit: sql<string | null>`MAX(${appointments.startTime})`,
    })
      .from(appointments)
      .fullJoin(invoices, eq(invoices.appointmentId, appointments.id))
      .where(and(
        eq(appointments.customerId, id),
        eq(appointments.tenantId, tenantId),
        eq(appointments.status, "completed"),
      ));

    const recentAppts = await db.select({
      id: appointments.id,
      startTime: appointments.startTime,
      status: appointments.status,
      staffName: users.name,
      services: sql<string>`COALESCE(
        (SELECT string_agg(${services.name}, ', ') FROM ${appointmentServices}
         INNER JOIN ${services} ON ${services.id} = ${appointmentServices.serviceId}
         WHERE ${appointmentServices.appointmentId} = ${appointments.id}), ''
      )`,
    })
      .from(appointments)
      .leftJoin(staff, eq(appointments.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id))
      .where(and(eq(appointments.customerId, id), eq(appointments.tenantId, tenantId)))
      .orderBy(desc(appointments.startTime))
      .limit(5);

    const recentInvoices = await db.select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      total: invoices.total,
      status: invoices.status,
      createdAt: invoices.createdAt,
    })
      .from(invoices)
      .where(and(eq(invoices.customerId, id), eq(invoices.tenantId, tenantId)))
      .orderBy(desc(invoices.createdAt))
      .limit(5);

    return apiSuccess({
      ...customer,
      visitCount: stats?.visitCount || 0,
      totalSpent: stats?.totalSpent || 0,
      lastVisit: stats?.lastVisit || null,
      recentAppointments: recentAppts,
      recentInvoices,
    });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "CRM");
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);

    const [existing] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!existing) return apiError("Customer not found", "NOT_FOUND", 404);

    if (parsed.data.phone && parsed.data.phone !== existing.phone) {
      const [dup] = await db.select().from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.phone, parsed.data.phone), ne(customers.id, id)))
        .limit(1);
      if (dup) return apiError("Phone already in use by another customer", "CONFLICT", 409);
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email || null;
    if (parsed.data.gender !== undefined) updateData.gender = parsed.data.gender || null;
    if (parsed.data.dob !== undefined) updateData.dob = parsed.data.dob ? new Date(parsed.data.dob) : null;
    if (parsed.data.address !== undefined) updateData.address = parsed.data.address || null;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes || null;
    if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;
    if (parsed.data.preferredContactMethod !== undefined) updateData.preferredContactMethod = parsed.data.preferredContactMethod;

    const [updated] = await db.update(customers)
      .set(updateData)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();

    return apiSuccess(updated);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "CRM");
    const { id } = await params;

    const [existing] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!existing) return apiError("Customer not found", "NOT_FOUND", 404);

    await db.update(customers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));

    return apiSuccess({ deleted: true });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
