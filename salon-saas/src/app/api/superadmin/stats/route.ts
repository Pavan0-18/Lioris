import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants, users, auditLogs } from "@/lib/db/schema";
import { sql, eq, gte } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const allTenants = await db.select().from(tenants);

    const totalTenants = allTenants.length;
    const activeTenants = allTenants.filter((t) => t.isActive && t.planStatus === "active").length;
    const trialingTenants = allTenants.filter((t) => t.planStatus === "trialing").length;
    const suspendedTenants = allTenants.filter((t) => t.planStatus === "suspended" || !t.isActive).length;
    const onboardedTenants = allTenants.filter((t) => t.onboardingDone).length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentSignups] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(gte(tenants.createdAt, thirtyDaysAgo));

    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [recentActions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, thirtyDaysAgo));

    const totalMRR = allTenants.reduce((sum, t) => sum + (t.planStatus === "active" ? 49 : 0), 0);

    const signupsByMonth = await db
      .select({
        month: sql<string>`to_char(${tenants.createdAt}, 'YYYY-MM')`,
        count: sql<number>`count(*)`,
      })
      .from(tenants)
      .groupBy(sql`to_char(${tenants.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${tenants.createdAt}, 'YYYY-MM')`);

    return apiSuccess({
      totalTenants,
      activeTenants,
      trialingTenants,
      suspendedTenants,
      onboardedTenants,
      recentSignups: Number(recentSignups?.count || 0),
      totalUsers: Number(totalUsers?.count || 0),
      recentActions: Number(recentActions?.count || 0),
      totalMRR,
      signupsByMonth,
    });
  } catch (err: any) {
    console.error("[superadmin-stats]", err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
