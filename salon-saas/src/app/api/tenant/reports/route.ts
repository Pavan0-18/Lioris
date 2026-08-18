import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { getEntityWithFields } from "@/lib/entities/load";
import { validateReportConfig } from "@/lib/reports/engine";

const createReportSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  entityKey: z.string().min(1).max(60),
  config: z.any(),
});

export const GET = createApiHandler(
  async (_req, context) => {
    const { tenantId } = context.auth;
    const rows = await db.select()
      .from(reports)
      .where(eq(reports.tenantId, tenantId))
      .orderBy(asc(reports.name));
    return apiSuccess(rows);
  },
  { method: "GET", requiredPermission: "reports:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const body = await req.json();
    const validated = validateBody(createReportSchema, body);

    const { entity } = await getEntityWithFields(tenantId, validated.entityKey);
    const config = validateReportConfig(validated.config);

    const [inserted] = await db.insert(reports).values({
      tenantId,
      name: validated.name,
      description: validated.description ?? null,
      entityId: entity.id,
      config: config as any,
      isActive: true,
      createdById: userId,
      updatedById: userId,
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "REPORT", inserted.id, { entityKey: entity.key });

    return apiSuccess(inserted);
  },
  { method: "POST", requiredPermission: "reports:manage" }
);