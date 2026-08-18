import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const createDashboardSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export const GET = createApiHandler(
  async (_req, context) => {
    const { tenantId } = context.auth;
    const rows = await db.select()
      .from(dashboards)
      .where(eq(dashboards.tenantId, tenantId))
      .orderBy(asc(dashboards.name));
    return apiSuccess(rows);
  },
  { method: "GET", requiredPermission: "dashboards:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const body = await req.json();
    const validated = validateBody(createDashboardSchema, body);

    const [inserted] = await db.insert(dashboards).values({
      tenantId,
      name: validated.name,
      description: validated.description ?? null,
      isDefault: validated.isDefault ?? false,
      createdById: userId,
      updatedById: userId,
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "DASHBOARD", inserted.id, { name: inserted.name });

    return apiSuccess(inserted);
  },
  { method: "POST", requiredPermission: "dashboards:manage" }
);
