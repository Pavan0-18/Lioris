import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants, users, auditLogs, appointments, invoices } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!tenant) return apiError("Tenant not found", "NOT_FOUND", 404);

    // Get tenant users count
    const tenantUsers = await db.select().from(users).where(eq(users.tenantId, id));
    const activeUsers = tenantUsers.filter(u => u.isActive).length;
    const totalUsers = tenantUsers.length;

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAuditLogs = await db.select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.tenantId, id),
        gte(auditLogs.createdAt, thirtyDaysAgo)
      ))
      .limit(100);

    // Get appointments (estimate of business activity)
    const tenantAppointments = await db.select()
      .from(appointments)
      .where(eq(appointments.tenantId, id));

    const recentAppointments = tenantAppointments.filter(a => {
      const appointmentDate = new Date(a.date as any);
      return appointmentDate >= thirtyDaysAgo;
    }).length;

    // Get invoices for revenue estimation
    const tenantInvoices = await db.select()
      .from(invoices)
      .where(eq(invoices.tenantId, id));

    const totalRevenue = tenantInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const recentRevenue = tenantInvoices
      .filter(inv => {
        const invDate = new Date(inv.createdAt as any);
        return invDate >= thirtyDaysAgo;
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Trial status
    const trialEndsAt = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
    const isTrialing = trialEndsAt && trialEndsAt > new Date();
    const daysLeftInTrial = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return apiSuccess({
      tenantId: id,
      tenantName: tenant.name,
      status: tenant.planStatus,
      isActive: tenant.isActive,
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      activity: {
        recentActions: recentAuditLogs.length,
        recentAppointments,
        lastActivity: recentAuditLogs[0]?.createdAt || null
      },
      revenue: {
        total: parseFloat(totalRevenue.toFixed(2)),
        last30Days: parseFloat(recentRevenue.toFixed(2)),
        invoiceCount: tenantInvoices.length,
        recentInvoices: tenantInvoices.length
      },
      trial: {
        isTrialing,
        endsAt: trialEndsAt,
        daysRemaining: isTrialing ? daysLeftInTrial : 0
      },
      plan: {
        id: tenant.planId,
        status: tenant.planStatus,
        createdAt: tenant.createdAt,
        onboardingDone: tenant.onboardingDone
      }
    });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
