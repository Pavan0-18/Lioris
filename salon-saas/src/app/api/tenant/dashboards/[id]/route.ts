import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { dashboards, dashboardWidgets } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const updateDashboardSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const [dashboard] = await db.select()
      .from(dashboards)
      .where(and(eq(dashboards.tenantId, tenantId), eq(dashboards.id, id)))
      .limit(1);
    if (!dashboard) {
      const error = new Error("Dashboard not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const widgets = await db.select()
      .from(dashboardWidgets)
      .where(and(eq(dashboardWidgets.tenantId, tenantId), eq(dashboardWidgets.dashboardId, id)))
      .orderBy(asc(dashboardWidgets.createdAt));

    return apiSuccess({ dashboard, widgets });
  },
  { method: "GET", requiredPermission: "dashboards:manage" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(updateDashboardSchema, body);

    const [existing] = await db.select()
      .from(dashboards)
      .where(and(eq(dashboards.tenantId, tenantId), eq(dashboards.id, id)))
      .limit(1);
    if (!existing) {
      const error = new Error("Dashboard not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const [updated] = await db.update(dashboards)
      .set({
        name: validated.name ?? existing.name,
        description: validated.description !== undefined ? validated.description : existing.description,
        isDefault: validated.isDefault ?? existing.isDefault,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(dashboards.id, existing.id))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "DASHBOARD", updated.id, {});

    return apiSuccess(updated);
  },
  { method: "PUT", requiredPermission: "dashboards:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const { id } = await (req as any).params;

    if (role !== "OWNER") {
      const error = new Error("Only the workspace owner can delete dashboards") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const [existing] = await db.select()
      .from(dashboards)
      .where(and(eq(dashboards.tenantId, tenantId), eq(dashboards.id, id)))
      .limit(1);
    if (!existing) {
      const error = new Error("Dashboard not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db.delete(dashboards).where(eq(dashboards.id, existing.id));
    await logAudit(tenantId, userId, "DELETE", "DASHBOARD", existing.id, {});

    return apiSuccess({ deleted: true });
  },
  { method: "DELETE", requiredPermission: "dashboards:manage" }
);