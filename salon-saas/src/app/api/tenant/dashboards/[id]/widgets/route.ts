import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { dashboards, dashboardWidgets } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { validateWidgetConfig, WIDGET_TYPES } from "@/lib/dashboards/engine";

const createWidgetSchema = z.object({
  title: z.string().min(1).max(120),
  type: z.enum(WIDGET_TYPES),
  entityId: z.string().optional().nullable(),
  config: z.any(),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1).max(12),
    h: z.number().int().min(1).max(12),
  }).optional(),
});

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(createWidgetSchema, body);

    const [dashboard] = await db.select()
      .from(dashboards)
      .where(and(eq(dashboards.tenantId, tenantId), eq(dashboards.id, id)))
      .limit(1);
    if (!dashboard) {
      const error = new Error("Dashboard not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const config = validateWidgetConfig(validated.config);

    const [widget] = await db.insert(dashboardWidgets).values({
      tenantId,
      dashboardId: id,
      title: validated.title,
      type: validated.type,
      entityId: validated.entityId ?? null,
      config: config as any,
      position: validated.position as any ?? { x: 0, y: 0, w: 4, h: 3 },
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "DASHBOARD_WIDGET", widget.id, { dashboardId: id });

    return apiSuccess(widget);
  },
  { method: "POST", requiredPermission: "dashboards:manage" }
);