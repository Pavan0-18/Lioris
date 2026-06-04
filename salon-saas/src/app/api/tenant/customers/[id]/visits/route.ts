import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers, appointments, appointmentServices, services, invoices, invoiceItems } from "@/lib/db/schema";
import { and, eq, desc, count, sql } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "CRM");
    const { id } = await params;

    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!customer) return apiError("Customer not found", "NOT_FOUND", 404);

    const url = new URL(_req.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;

    const visits = await db.select({
      id: appointments.id,
      startTime: appointments.startTime,
      status: appointments.status,
      staffName: sql<string>`COALESCE(
        (SELECT ${sql.identifier("users")}.${sql.identifier("name")} FROM ${sql.identifier("staff")}
         INNER JOIN ${sql.identifier("users")} ON ${sql.identifier("users")}.${sql.identifier("id")} = ${sql.identifier("staff")}.${sql.identifier("user_id")}
         WHERE ${sql.identifier("staff")}.${sql.identifier("id")} = ${appointments.staffId}), ''
      )`,
      services: sql<string>`COALESCE(
        (SELECT string_agg(${services.name}, ', ') FROM ${appointmentServices}
         INNER JOIN ${services} ON ${services.id} = ${appointmentServices.serviceId}
         WHERE ${appointmentServices.appointmentId} = ${appointments.id}), ''
      )`,
      totalPaid: sql<number>`COALESCE((
        SELECT SUM(${invoiceItems.lineTotal})::real FROM ${invoices}
        INNER JOIN ${invoiceItems} ON ${invoiceItems.invoiceId} = ${invoices.id}
        WHERE ${invoices.appointmentId} = ${appointments.id}
      ), 0)`,
      invoiceStatus: sql<string | null>`(
        SELECT ${invoices.status} FROM ${invoices}
        WHERE ${invoices.appointmentId} = ${appointments.id}
        LIMIT 1
      )`,
      invoiceId: sql<string | null>`(
        SELECT ${invoices.id} FROM ${invoices}
        WHERE ${invoices.appointmentId} = ${appointments.id}
        LIMIT 1
      )`,
    })
      .from(appointments)
      .where(and(
        eq(appointments.customerId, id),
        eq(appointments.tenantId, tenantId),
        eq(appointments.status, "completed"),
      ))
      .orderBy(desc(appointments.startTime))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db.select({ total: count() })
      .from(appointments)
      .where(and(eq(appointments.customerId, id), eq(appointments.tenantId, tenantId), eq(appointments.status, "completed")));

    return apiSuccess({ visits, total: totalResult?.total || 0, page, limit });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
