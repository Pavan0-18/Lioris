import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { db } from "@/lib/db";
import { dashboards, dashboardWidgets, entityRecords, entities, entityFields } from "@/lib/db/schema";
import { and, eq, asc, inArray } from "drizzle-orm";
import { resolveWidgetData } from "@/lib/dashboards/engine";

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

    const entityIds = [...new Set(widgets.map((w) => w.entityId).filter(Boolean))] as string[];
    const entityCache = new Map<string, { entity: any; fields: any[]; records: Record<string, any>[] }>();

    if (entityIds.length > 0) {
      const entityRows = await db.select()
        .from(entities)
        .where(and(eq(entities.tenantId, tenantId), inArray(entities.id, entityIds)));
      for (const entity of entityRows) {
        const fields = await db.select()
          .from(entityFields)
          .where(eq(entityFields.entityId, entity.id))
          .orderBy(asc(entityFields.position));
        const rows = await db.select()
          .from(entityRecords)
          .where(and(eq(entityRecords.tenantId, tenantId), eq(entityRecords.entityId, entity.id)))
          .orderBy(asc(entityRecords.createdAt));
        entityCache.set(entity.id, {
          entity,
          fields,
          records: rows.map((r) => ({ id: r.id, ...(r.fieldValues as Record<string, any>), _createdAt: r.createdAt, _updatedAt: r.updatedAt })),
        });
      }
    }

    const data = widgets.map((widget) => {
      const cache = widget.entityId ? entityCache.get(widget.entityId) : undefined;
      const widgetData = resolveWidgetData(
        widget.type as any,
        (widget.config ?? {}) as any,
        cache?.records ?? []
      );
      return {
        widgetId: widget.id,
        title: widget.title,
        type: widget.type,
        position: widget.position,
        entityName: cache?.entity.name ?? null,
        data: widgetData,
      };
    });

    return apiSuccess({ dashboard, data });
  },
  { method: "GET", requiredPermission: "dashboards:manage" }
);