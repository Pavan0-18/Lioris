import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "CRM");
    const { id } = await params;

    const logs = await db.select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.tenantId, tenantId),
        eq(auditLogs.entityType, "CUSTOMER"),
        eq(auditLogs.entityId, id),
      ))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    return apiSuccess(logs);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
