import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { entityForms } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { getEntityWithFields } from "@/lib/entities/load";
import { validateFormLayout, formConfigSchema } from "@/lib/forms/engine";

const createFormSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  layout: z.any(),
  config: z.any().optional(),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { key } = await (req as any).params;

    const { entity, fields } = await getEntityWithFields(tenantId, key);

    const rows = await db.select()
      .from(entityForms)
      .where(and(eq(entityForms.tenantId, tenantId), eq(entityForms.entityId, entity.id)))
      .orderBy(asc(entityForms.name));

    return apiSuccess({
      entity: { id: entity.id, key: entity.key, name: entity.name },
      fields: fields.map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options })),
      forms: rows,
    });
  },
  { method: "GET", requiredPermission: "forms:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(createFormSchema, body);

    const layout = validateFormLayout(validated.layout ?? { sections: [] });
    const config = validated.config ?? {};

    const { entity, fields } = await getEntityWithFields(tenantId, key);

    const fieldKeys = new Set(fields.map((f) => f.key));
    for (const section of layout.sections) {
      for (const field of section.fields) {
        if (!fieldKeys.has(field.key)) {
          const error = new Error(`Field "${field.key}" does not exist on entity "${entity.key}"`) as any;
          error.code = "INVALID_INPUT";
          throw error;
        }
      }
    }

    const [inserted] = await db.insert(entityForms).values({
      tenantId,
      entityId: entity.id,
      name: validated.name,
      description: validated.description ?? null,
      layout: layout as any,
      config: config as any,
      isActive: true,
      createdById: userId,
      updatedById: userId,
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "ENTITY_FORM", inserted.id, { entityKey: key });

    return apiSuccess(inserted);
  },
  { method: "POST", requiredPermission: "forms:manage" }
);
