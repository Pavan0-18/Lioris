import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { entityRecords } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { getEntityWithFields } from "@/lib/entities/load";
import { validateRecord, recordTitle, type EntityField } from "@/lib/entities/engine";
import { emitDomainEvent } from "@/lib/workflows/engine";

const updateRecordSchema = z.object({
  values: z.record(z.any()),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { key, id } = await (req as any).params;

    const [row] = await db.select()
      .from(entityRecords)
      .where(and(eq(entityRecords.tenantId, tenantId), eq(entityRecords.id, id)))
      .limit(1);
    if (!row) {
      const error = new Error("Record not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const { entity, fields } = await getEntityWithFields(tenantId, key);

    return apiSuccess({
      id: row.id,
      ...(row.fieldValues as Record<string, any>),
      _title: recordTitle(entity.config as Record<string, any> | null, fields as EntityField[], row.fieldValues as Record<string, any>),
      _createdAt: row.createdAt,
      _updatedAt: row.updatedAt,
      _createdById: row.createdById,
      _updatedById: row.updatedById,
    });
  },
  { method: "GET", requiredPermission: "entities:manage" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key, id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(updateRecordSchema, body);

    const { entity, fields } = await getEntityWithFields(tenantId, key);

    const [existing] = await db.select()
      .from(entityRecords)
      .where(and(eq(entityRecords.tenantId, tenantId), eq(entityRecords.id, id)))
      .limit(1);
    if (!existing) {
      const error = new Error("Record not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const previous = existing.fieldValues as Record<string, any>;
    const { errors, normalized } = validateRecord(fields as EntityField[], { ...previous, ...validated.values });
    if (errors.length > 0) {
      const error = new Error(errors[0].message) as any;
      error.code = "INVALID_INPUT";
      error.details = errors;
      throw error;
    }

    const [updated] = await db.update(entityRecords)
      .set({ fieldValues: normalized, updatedById: userId, updatedAt: new Date() })
      .where(eq(entityRecords.id, id))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "ENTITY_RECORD", id, { entityKey: key });

    const record = {
      id: updated.id,
      ...(updated.fieldValues as Record<string, any>),
      _title: recordTitle(entity.config as Record<string, any> | null, fields as EntityField[], updated.fieldValues as Record<string, any>),
    };

    await emitDomainEvent("record.updated", key, record, {
      tenantId,
      actorId: userId,
      previousRecord: { id, ...previous },
      extra: { recordId: id },
    });

    return apiSuccess(record);
  },
  { method: "PUT", requiredPermission: "entities:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key, id } = await (req as any).params;

    const [existing] = await db.select()
      .from(entityRecords)
      .where(and(eq(entityRecords.tenantId, tenantId), eq(entityRecords.id, id)))
      .limit(1);
    if (!existing) {
      const error = new Error("Record not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db.delete(entityRecords).where(eq(entityRecords.id, id));

    await logAudit(tenantId, userId, "DELETE", "ENTITY_RECORD", id, { entityKey: key });

    return apiSuccess({ success: true, id });
  },
  { method: "DELETE", requiredPermission: "entities:manage" }
);