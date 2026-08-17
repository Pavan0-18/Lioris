import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants, users, notifications } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendEmail, bulkNotifyHtml } from "@/lib/emails";

export async function POST(req: Request) {
  const startTime = performance.now();
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const { title, message, tenantFilter, viaEmail } = body;

    if (!title?.trim() || !message?.trim()) {
      return apiError("title and message are required", "VALIDATION_ERROR", 400);
    }

    let targetTenants: { id: string }[];

    if (tenantFilter === "active") {
      targetTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.isActive, true));
    } else if (tenantFilter === "trialing") {
      targetTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.planStatus, "trialing"));
    } else if (tenantFilter === "paying") {
      targetTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.planStatus, "active"));
    } else {
      targetTenants = await db.select({ id: tenants.id }).from(tenants);
    }

    const tenantIds = targetTenants.map((t) => t.id);
    if (tenantIds.length === 0) {
      return apiSuccess({ notified: 0, emailsSent: 0, skippedEmails: 0 });
    }

    const owners = await db.select({
      userId: users.id,
      email: users.email,
      tenantId: users.tenantId,
    })
      .from(users)
      .where(and(eq(users.role, "OWNER"), inArray(users.tenantId, tenantIds)));

    const notifyRows = owners.map((o) => ({
      tenantId: o.tenantId,
      userId: o.userId,
      type: "info" as const,
      title: title.trim(),
      message: message.trim(),
      link: "/dashboard",
      metadata: JSON.stringify({ source: "superadmin-bulk-notify" }),
    }));

    if (notifyRows.length > 0) {
      await db.insert(notifications).values(notifyRows);
    }

    let emailsSent = 0;
    let skippedEmails = 0;

    if (viaEmail) {
      for (const owner of owners) {
        const result = await sendEmail({
          to: owner.email,
          subject: title.trim(),
          html: bulkNotifyHtml({ title: title.trim(), message: message.trim() }),
        });
        if (result.sent) emailsSent++;
        else skippedEmails++;
      }
    }

    console.log(
      `[BULK NOTIFY] Complete. tenants=${tenantIds.length}, owners=${owners.length}, emailsSent=${emailsSent}, totalTime=${Math.round(performance.now() - startTime)}ms`
    );

    return apiSuccess({
      notified: notifyRows.length,
      emailsSent,
      skippedEmails,
      tenantsAffected: tenantIds.length,
    });
  } catch (err: any) {
    console.error("[bulk-notify]", err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}