import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants, users, staff, branches, services, customers, appointments, invoices, payments, coupons, giftCards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createApiHandler, getRouteId } from "@/lib/api-handler";

export const POST = createApiHandler(async (req) => {
  const tenantId = getRouteId(req);

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) { const e = new Error("Tenant not found") as any; e.code = "NOT_FOUND"; throw e; }

  const [usersData, staffData, branchesData, servicesData, customersData, appointmentsData, invoicesData, paymentsData, couponsData, giftCardsData] = await Promise.all([
    db.select().from(users).where(eq(users.tenantId, tenantId)),
    db.select().from(staff).where(eq(staff.tenantId, tenantId)),
    db.select().from(branches).where(eq(branches.tenantId, tenantId)),
    db.select().from(services).where(eq(services.tenantId, tenantId)),
    db.select().from(customers).where(eq(customers.tenantId, tenantId)),
    db.select().from(appointments).where(eq(appointments.tenantId, tenantId)),
    db.select().from(invoices).where(eq(invoices.tenantId, tenantId)),
    db.select().from(payments).where(eq(payments.tenantId, tenantId)),
    db.select().from(coupons).where(eq(coupons.tenantId, tenantId)),
    db.select().from(giftCards).where(eq(giftCards.tenantId, tenantId)),
  ]);

  return apiSuccess({
    exportedAt: new Date().toISOString(),
    tenant: { ...tenant, passwordHash: undefined },
    users: usersData.map((u: any) => ({ ...u, passwordHash: undefined })),
    staff: staffData,
    branches: branchesData,
    services: servicesData,
    customers: customersData,
    appointments: appointmentsData,
    invoices: invoicesData,
    payments: paymentsData,
    coupons: couponsData,
    giftCards: giftCardsData,
  });
}, { method: "POST" });
