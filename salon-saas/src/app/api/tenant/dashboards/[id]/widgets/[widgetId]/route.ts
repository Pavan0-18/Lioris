import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { dashboardWidgets } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { validateWidgetConfig } from "@/lib/dashboards/engine";

const updateWidgetSchema = z.object({
  title: z.string().min(1).max(120),
  type: z.string().min(1),
  entityId: z.string().optional().nullable(),
  config: z.any(),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1).max(12),
    h: z.number().int().min(1).max(12),
  }).optional(),
});

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id, widgetId } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(updateWidgetSchema.partial(), body);

    const [existing] = await db.select()
      .from(dashboardWidgets)
      .where(and(
        eq(dashboardWidgets.tenantId, tenantId),
        eq(dashboardWidgets.dashboardId, id),
        eq(dashboardWidgets.id, widgetId)
      ))
      .limit(1);
    if (!existing) {
      const error = new Error("Widget not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const config = validated.config !== undefined ? validateWidgetConfig(validated.config) : existing.config;

    const [updated] = await db.update(dashboardWidgets)
      .set({
        title: validated.title ?? existing.title,
        type: validated.type ?? existing.type,
        entityId: validated.entityId !== undefined ? validated.entityId : existing.entityId,
        config: config as any,
        position: validated.position as any ?? existing.position,
        updatedAt: new Date(),
      })
      .where(eq(dashboardWidgets.id, existing.id))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "DASHBOARD_WIDGET", updated.id, { dashboardId: id });

    return apiSuccess(updated);
  },
  { method: "PUT", requiredPermission: "dashboards:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id, widgetId } = await (req as any).params;

    const [existing] = await db.select()
      .from(dashboardWidgets)
      .where(and(
        eq(dashboardWidgets.tenantId, tenantId),
        eq(dashboardWidgets.dashboardId, id),
        eq(dashboardWidgets.id, widgetId)
      ))
      .limit(1);
    if (!existing) {
      const error = new Error("Widget not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, existing.id));
    await logAudit(tenantId, userId, "DELETE", "DASHBOARD_WIDGET", existing.id, { dashboardId: id });

    return apiSuccess({ deleted: true });
  },
  { method: "DELETE", requiredPermission: "dashboards:manage" }
);