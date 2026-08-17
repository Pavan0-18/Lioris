import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { entities, entityFields } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { slugifyKey } from "@/lib/entities/engine";
import { MODULE_MAP } from "@/lib/modules/registry";

const entityCreateSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, underscores"),
  name: z.string().min(1).max(60),
  singular: z.string().min(1).max(60),
  description: z.string().max(300).optional(),
  icon: z.string().max(40).optional(),
  moduleKey: z.string().default("custom"),
  config: z.record(z.any()).optional(),
});

export const GET = createApiHandler(
  async (_req, context) => {
    const { tenantId } = context.auth;
    const rows = await db.select({
      id: entities.id,
      key: entities.key,
      name: entities.name,
      singular: entities.singular,
      description: entities.description,
      icon: entities.icon,
      moduleKey: entities.moduleKey,
      isSystem: entities.isSystem,
      config: entities.config,
      createdAt: entities.createdAt,
      updatedAt: entities.updatedAt,
    })
      .from(entities)
      .where(eq(entities.tenantId, tenantId))
      .orderBy(entities.createdAt);

    const result = await Promise.all(rows.map(async (entity) => {
      const fields = await db.select({
        id: entityFields.id,
        key: entityFields.key,
        label: entityFields.label,
        type: entityFields.type,
        required: entityFields.required,
        unique: entityFields.unique,
        position: entityFields.position,
      })
        .from(entityFields)
        .where(eq(entityFields.entityId, entity.id))
        .orderBy(entityFields.position);
      return { ...entity, moduleName: MODULE_MAP[entity.moduleKey]?.name ?? entity.moduleKey, fieldCount: fields.length, fields };
    }));

    return apiSuccess(result);
  },
  { method: "GET", requiredPermission: "entities:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const body = await req.json();
    const validated = validateBody(entityCreateSchema, body);

    const key = validated.key || slugifyKey(validated.name);

    const [existing] = await db.select({ id: entities.id })
      .from(entities)
      .where(eq(entities.key, key))
      .limit(1);
    if (existing) {
      const error = new Error(`Entity "${key}" already exists in this workspace`) as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const [inserted] = await db.insert(entities).values({
      tenantId,
      key,
      name: validated.name,
      singular: validated.singular,
      description: validated.description,
      icon: validated.icon,
      moduleKey: validated.moduleKey,
      isSystem: false,
      config: validated.config ?? {},
      createdById: userId,
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "ENTITY", inserted.id, {
      key,
      name: validated.name,
    });

    return apiSuccess(inserted);
  },
  { method: "POST", requiredPermission: "entities:manage" }
);