import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { entityFields } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { getTenantEntity } from "@/lib/entities/load";
import { slugifyKey, FIELD_TYPES } from "@/lib/entities/engine";

const fieldSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, underscores").optional(),
  label: z.string().min(1).max(60),
  type: z.enum(FIELD_TYPES.map((t) => t.value) as [string, ...string[]]),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  options: z.record(z.any()).optional(),
  defaultValue: z.string().nullable().optional(),
  placeholder: z.string().max(120).nullable().optional(),
  position: z.number().int().min(0).optional(),
  config: z.record(z.any()).optional(),
});

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key: entityKey } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(fieldSchema, body);

    const entity = await getTenantEntity(tenantId, entityKey);

    const fieldKey = validated.key || slugifyKey(validated.label);

    const [existing] = await db.select({ id: entityFields.id })
      .from(entityFields)
      .where(and(eq(entityFields.entityId, entity.id), eq(entityFields.key, fieldKey)))
      .limit(1);
    if (existing) {
      const error = new Error(`Field "${fieldKey}" already exists`) as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const position = validated.position ?? (await db.$count(entityFields, eq(entityFields.entityId, entity.id)));

    const [inserted] = await db.insert(entityFields).values({
      tenantId,
      entityId: entity.id,
      key: fieldKey,
      label: validated.label,
      type: validated.type,
      required: validated.required,
      unique: validated.unique,
      options: validated.options ?? {},
      defaultValue: validated.defaultValue ?? null,
      placeholder: validated.placeholder ?? null,
      position,
      isSystem: false,
      config: validated.config ?? {},
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "ENTITY_FIELD", entity.id, {
      entityKey,
      fieldKey,
      type: validated.type,
    });

    return apiSuccess(inserted);
  },
  { method: "POST", requiredPermission: "entities:manage" }
);