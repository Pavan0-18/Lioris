import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { customers, appointments, invoices } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const [customer] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
    if (!customer) return apiError("Customer not found", "NOT_FOUND", 404);
    const history = await db.select().from(appointments).where(and(eq(appointments.customerId, id), eq(appointments.tenantId, tenantId))).orderBy(desc(appointments.startTime)).limit(20);
    const bills = await db.select().from(invoices).where(and(eq(invoices.customerId, id), eq(invoices.tenantId, tenantId))).orderBy(desc(invoices.createdAt)).limit(20);
    return apiSuccess({ ...customer, appointments: history, invoices: bills });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, gender, dob, address, notes } = body;
    const [updated] = await db.update(customers).set({ name, phone, email, gender, dob, address, notes, updatedAt: new Date() }).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId))).returning();
    if (!updated) return apiError("Customer not found", "NOT_FOUND", 404);
    return apiSuccess(updated);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const [deleted] = await db.update(customers).set({ isActive: false, updatedAt: new Date() }).where(and(eq(customers.id, id), eq(customers.tenantId, tenantId))).returning();
    if (!deleted) return apiError("Customer not found", "NOT_FOUND", 404);
    return apiSuccess({ deleted: true });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
