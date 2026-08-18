import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { db } from "@/lib/db";
import { reports, entityRecords, entities, entityFields } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { runReport, validateReportConfig } from "@/lib/reports/engine";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const [report] = await db.select()
      .from(reports)
      .where(and(eq(reports.tenantId, tenantId), eq(reports.id, id)))
      .limit(1);
    if (!report) {
      const error = new Error("Report not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    if (!report.isActive) {
      const error = new Error("Report is not active") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const [entity] = await db.select()
      .from(entities)
      .where(and(eq(entities.tenantId, tenantId), eq(entities.id, report.entityId)))
      .limit(1);
    if (!entity) {
      const error = new Error("Report entity not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const fields = await db.select()
      .from(entityFields)
      .where(eq(entityFields.entityId, entity.id))
      .orderBy(asc(entityFields.position));

    const rows = await db.select()
      .from(entityRecords)
      .where(and(eq(entityRecords.tenantId, tenantId), eq(entityRecords.entityId, entity.id)))
      .orderBy(asc(entityRecords.createdAt));

    const records = rows.map((r) => ({
      id: r.id,
      ...(r.fieldValues as Record<string, any>),
      _createdAt: r.createdAt,
      _updatedAt: r.updatedAt,
    }));

    const config = validateReportConfig(report.config);
    const result = runReport(records, config);

    return apiSuccess({
      report: { id: report.id, name: report.name, description: report.description, entityKey: entity.key, config },
      fields: fields.map((f) => ({ key: f.key, label: f.label, type: f.type })),
      result,
    });
  },
  { method: "GET", requiredPermission: "reports:manage" }
);