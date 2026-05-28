import { db } from "@/lib/db";
import { auditLogs, superAdmins } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function createAuditLog(params: {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
}) {
  await db.insert(auditLogs).values({
    tenantId: params.tenantId,
    userId: params.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    changes: params.changes ? JSON.stringify(params.changes) : null,
  });
}

export async function getAuditLogs(limit = 100) {
  const rows = await db
    .select({
      id: auditLogs.id,
      tenantId: auditLogs.tenantId,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      changes: auditLogs.changes,
      createdAt: auditLogs.createdAt,
      adminName: superAdmins.name,
    })
    .from(auditLogs)
    .leftJoin(superAdmins, eq(superAdmins.id, auditLogs.userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    changes: r.changes ? JSON.parse(r.changes) : null,
  }));
}
