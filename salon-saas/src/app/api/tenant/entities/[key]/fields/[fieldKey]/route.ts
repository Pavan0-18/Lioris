import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { entityFields } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { getTenantEntity } from "@/lib/entities/load";
import { FIELD_TYPES } from "@/lib/entities/engine";

const fieldUpdateSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  type: z.enum(FIELD_TYPES.map((t) => t.value) as [string, ...string[]]).optional(),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  options: z.record(z.any()).optional(),
  defaultValue: z.string().nullable().optional(),
  placeholder: z.string().max(120).nullable().optional(),
  position: z.number().int().min(0).optional(),
  config: z.record(z.any()).optional(),
});

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key: entityKey, fieldKey } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(fieldUpdateSchema, body);

    const entity = await getTenantEntity(tenantId, entityKey);

    const [existing] = await db.select()
      .from(entityFields)
      .where(and(eq(entityFields.entityId, entity.id), eq(entityFields.key, fieldKey)))
      .limit(1);
    if (!existing) {
      const error = new Error(`Field "${fieldKey}" not found`) as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    if (existing.isSystem) {
      const error = new Error("System fields cannot be modified") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const [updated] = await db.update(entityFields)
      .set({
        label: validated.label ?? existing.label,
        type: validated.type ?? existing.type,
        required: validated.required ?? existing.required,
        unique: validated.unique ?? existing.unique,
        options: validated.options ?? existing.options,
        defaultValue: validated.defaultValue !== undefined ? validated.defaultValue : existing.defaultValue,
        placeholder: validated.placeholder !== undefined ? validated.placeholder : existing.placeholder,
        position: validated.position ?? existing.position,
        config: validated.config ?? existing.config,
      })
      .where(eq(entityFields.id, existing.id))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "ENTITY_FIELD", existing.id, { entityKey, fieldKey });

    return apiSuccess(updated);
  },
  { method: "PUT", requiredPermission: "entities:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const { key: entityKey, fieldKey } = await (req as any).params;

    if (role !== "OWNER") {
      const error = new Error("Only the workspace owner can delete fields") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const entity = await getTenantEntity(tenantId, entityKey);

    const [existing] = await db.select()
      .from(entityFields)
      .where(and(eq(entityFields.entityId, entity.id), eq(entityFields.key, fieldKey)))
      .limit(1);
    if (!existing) {
      const error = new Error(`Field "${fieldKey}" not found`) as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    if (existing.isSystem) {
      const error = new Error("System fields cannot be deleted") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    await db.delete(entityFields).where(eq(entityFields.id, existing.id));

    await logAudit(tenantId, userId, "DELETE", "ENTITY_FIELD", existing.id, { entityKey, fieldKey });

    return apiSuccess({ success: true });
  },
  { method: "DELETE", requiredPermission: "entities:manage" }
);