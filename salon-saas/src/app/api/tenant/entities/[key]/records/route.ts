import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody, validateQuery } from "@/lib/validation";
import { db } from "@/lib/db";
import { entityRecords } from "@/lib/db/schema";
import { and, eq, desc, asc, sql } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { getEntityWithFields } from "@/lib/entities/load";
import { validateRecord, recordTitle, type EntityField } from "@/lib/entities/engine";
import { emitDomainEvent } from "@/lib/workflows/engine";

const createRecordSchema = z.object({
  values: z.record(z.any()),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  sortBy: z.string().max(40).optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  field: z.string().max(40).optional(),
  value: z.string().max(200).optional(),
});

async function checkUnique(tenantId: string, entityId: string, fields: EntityField[], values: Record<string, any>) {
  for (const field of fields) {
    if (!field.unique) continue;
    const value = values[field.key];
    if (value === undefined || value === null || value === "") continue;
    const path = sql`${entityRecords.fieldValues}->>${field.key}`;
    const [dup] = await db.select({ id: entityRecords.id })
      .from(entityRecords)
      .where(and(
        eq(entityRecords.tenantId, tenantId),
        eq(entityRecords.entityId, entityId),
        eq(path, String(value))
      ))
      .limit(1);
    if (dup) {
      const error = new Error(`${field.label} must be unique`) as any;
      error.code = "INVALID_INPUT";
      throw error;
    }
  }
}

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { key } = await (req as any).params;
    const url = new URL(req.url);
    const query = validateQuery(listQuerySchema, url);

    const { entity, fields } = await getEntityWithFields(tenantId, key);

    let conditions = and(eq(entityRecords.tenantId, tenantId), eq(entityRecords.entityId, entity.id));

    if (query.field && query.value) {
      const all = await db.select()
        .from(entityRecords)
        .where(conditions);
      const field = fields.find((f) => f.key === query.field);
      const filtered = all.filter((r) => {
        const fv = r.fieldValues as Record<string, any>;
        const v = fv[query.field!];
        if (v === undefined || v === null) return false;
        if (field?.type === "boolean") return String(v) === query.value;
        return String(v).toLowerCase().includes(query.value!.toLowerCase());
      });
      return apiSuccess({ entity, fields, records: filtered, pagination: { page: query.page, limit: query.limit, total: filtered.length } });
    }

    if (query.search) {
      const all = await db.select()
        .from(entityRecords)
        .where(conditions);
      const needle = query.search.toLowerCase();
      const filtered = all.filter((r) => {
        const fv = r.fieldValues as Record<string, any>;
        return Object.values(fv).some((v) =>
          v !== null && v !== undefined && String(v).toLowerCase().includes(needle)
        );
      });
      const total = filtered.length;
      const start = (query.page - 1) * query.limit;
      const page = filtered.slice(start, start + query.limit);
      return apiSuccess({ entity, fields, records: page, pagination: { page: query.page, limit: query.limit, total } });
    }

    const [count] = await db.select({ count: db.$count(entityRecords, conditions) }).from(entityRecords).limit(1);
    const total = count?.count ?? 0;

    const sortField = query.sortBy ?? "createdAt";
    const orderBy = sortField === "createdAt"
      ? (query.sortDir === "asc" ? asc(entityRecords.createdAt) : desc(entityRecords.createdAt))
      : (query.sortDir === "asc" ? asc(entityRecords.createdAt) : desc(entityRecords.createdAt));

    const rows = await db.select()
      .from(entityRecords)
      .where(conditions)
      .orderBy(orderBy)
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    const records = rows.map((r) => ({
      id: r.id,
      ...(r.fieldValues as Record<string, any>),
      _title: recordTitle(entity.config as Record<string, any> | null, fields as EntityField[], r.fieldValues as Record<string, any>),
      _createdAt: r.createdAt,
      _updatedAt: r.updatedAt,
      _createdById: r.createdById,
      _updatedById: r.updatedById,
    }));

    return apiSuccess({ entity, fields, records, pagination: { page: query.page, limit: query.limit, total } });
  },
  { method: "GET", requiredPermission: "entities:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(createRecordSchema, body);

    const { entity, fields } = await getEntityWithFields(tenantId, key);

    const { errors, normalized } = validateRecord(fields as EntityField[], validated.values);
    if (errors.length > 0) {
      const error = new Error(errors[0].message) as any;
      error.code = "INVALID_INPUT";
      error.details = errors;
      throw error;
    }

    for (const field of fields) {
      if (field.defaultValue && normalized[field.key] === undefined) {
        normalized[field.key] = field.defaultValue;
      }
    }

    await checkUnique(tenantId, entity.id, fields as EntityField[], normalized);

    const [inserted] = await db.insert(entityRecords).values({
      tenantId,
      entityId: entity.id,
      fieldValues: normalized,
      createdById: userId,
      updatedById: userId,
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "ENTITY_RECORD", inserted.id, { entityKey: key });

    const record = {
      id: inserted.id,
      ...(inserted.fieldValues as Record<string, any>),
      _title: recordTitle(entity.config as Record<string, any> | null, fields as EntityField[], inserted.fieldValues as Record<string, any>),
    };

    await emitDomainEvent("record.created", key, record, {
      tenantId,
      actorId: userId,
      extra: { recordId: inserted.id },
    });

    return apiSuccess(record);
  },
  { method: "POST", requiredPermission: "entities:manage" }
);