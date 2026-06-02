import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiSuccess, apiError, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { appointments, appointmentServices, services, invoices, invoiceItems, tenants } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { generateInvoiceNo } from "@/lib/utils";
import { isValidTransition, updateStatusSchema } from "@/lib/validators/appointment";
import { inngest } from "@/inngest/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");
    const { id } = await params;
    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) return apiError("Invalid status update", "VALIDATION_ERROR", 400);

    const { status, cancelReason } = parsed.data;

    const [existing] = await db.select()
      .from(appointments).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .limit(1);
    if (!existing) return apiError("Appointment not found", "NOT_FOUND", 404);

    if (!isValidTransition(existing.status as any, status as any)) {
      return apiError(`Invalid transition from ${existing.status} to ${status}`, "INVALID_TRANSITION", 400);
    }

    const [updated] = await db.update(appointments)
      .set({
        status,
        cancelReason: status === "cancelled" ? cancelReason : null,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
      .returning();

    if (!updated) return apiError("Appointment not found", "NOT_FOUND", 404);

    let invoiceId: string | undefined;

    if (status === "completed") {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      if (!tenant) return apiError("Tenant not found", "NOT_FOUND", 404);

      const apptServices = await db.select({
        serviceId: appointmentServices.serviceId,
        price: appointmentServices.price,
        duration: appointmentServices.duration,
        serviceName: services.name,
      })
        .from(appointmentServices)
        .innerJoin(services, eq(appointmentServices.serviceId, services.id))
        .where(eq(appointmentServices.appointmentId, id));

      const subtotal = apptServices.reduce((sum, s) => sum + s.price, 0);
      const taxAmount = subtotal * ((tenant.taxRate || 0) / 100);
      const total = subtotal + taxAmount;

      const year = new Date().getFullYear();
      const seqResult = await db.select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(and(eq(invoices.tenantId, tenantId), sql`extract(year from ${invoices.createdAt}) = ${year}`));
      const seq = (seqResult[0]?.count || 0) + 1;

      const [tenantSlug] = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);

      const [inv] = await db.insert(invoices).values({
        tenantId,
        branchId: existing.branchId,
        customerId: existing.customerId,
        appointmentId: id,
        invoiceNo: generateInvoiceNo(tenantSlug?.slug || "SALON", year, seq),
        subtotal,
        taxAmount,
        discountAmount: 0,
        total,
        currency: tenant.currency || "INR",
        status: "draft",
        createdBy: userId,
      }).returning();

      invoiceId = inv.id;

      for (const as of apptServices) {
        await db.insert(invoiceItems).values({
          invoiceId: inv.id,
          serviceId: as.serviceId,
          name: as.serviceName,
          price: as.price,
          qty: 1,
          taxRate: tenant.taxRate || 0,
          lineTotal: as.price * (1 + (tenant.taxRate || 0) / 100),
        });
      }

      try {
        await inngest.send({ name: "invoice/created", data: { invoiceId: inv.id, tenantId } as any });
      } catch {}
    }

    await logAudit(tenantId, userId, "UPDATE_STATUS", "APPOINTMENT", id, {
      from: existing.status,
      to: status,
    });

    return apiSuccess({ updated: true, invoiceId });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
