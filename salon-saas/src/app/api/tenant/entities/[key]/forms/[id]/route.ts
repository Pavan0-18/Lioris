import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { entityForms } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { getEntityWithFields } from "@/lib/entities/load";
import { validateFormLayout, formConfigSchema } from "@/lib/forms/engine";

const updateFormSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  layout: z.any().optional(),
  config: z.any().optional(),
  isActive: z.boolean().optional(),
});

async function findOwnForm(tenantId: string, entityId: string, formId: string) {
  const [form] = await db.select()
    .from(entityForms)
    .where(and(
      eq(entityForms.tenantId, tenantId),
      eq(entityForms.id, formId)
    ))
    .limit(1);
  return form ?? null;
}

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { key, id } = await (req as any).params;

    const { entity, fields } = await getEntityWithFields(tenantId, key);
    const form = await findOwnForm(tenantId, entity.id, id);
    if (!form) {
      const error = new Error("Form not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    return apiSuccess({
      form,
      entity: { id: entity.id, key: entity.key, name: entity.name },
      fields: fields.map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options, placeholder: f.placeholder })),
    });
  },
  { method: "GET", requiredPermission: "forms:manage" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key, id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(updateFormSchema, body);

    const { entity, fields } = await getEntityWithFields(tenantId, key);
    const existing = await findOwnForm(tenantId, entity.id, id);
    if (!existing) {
      const error = new Error("Form not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    let layout = existing.layout as any;
    if (validated.layout !== undefined) {
      layout = validateFormLayout(validated.layout);
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
    }

    const config = validated.config !== undefined ? (formConfigSchema.safeParse(validated.config).success ? validated.config : (() => {
      const error = new Error("Invalid form config") as any;
      error.code = "INVALID_INPUT";
      throw error;
    })()) : existing.config;

    const [updated] = await db.update(entityForms)
      .set({
        name: validated.name ?? existing.name,
        description: validated.description !== undefined ? validated.description : existing.description,
        layout: layout as any,
        config: config as any,
        isActive: validated.isActive ?? existing.isActive,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(entityForms.id, existing.id))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "ENTITY_FORM", updated.id, { entityKey: key });

    return apiSuccess(updated);
  },
  { method: "PUT", requiredPermission: "forms:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const { key, id } = await (req as any).params;

    if (role !== "OWNER") {
      const error = new Error("Only the workspace owner can delete forms") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const { entity } = await getEntityWithFields(tenantId, key);
    const existing = await findOwnForm(tenantId, entity.id, id);
    if (!existing) {
      const error = new Error("Form not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db.delete(entityForms).where(eq(entityForms.id, existing.id));
    await logAudit(tenantId, userId, "DELETE", "ENTITY_FORM", existing.id, { entityKey: key });

    return apiSuccess({ deleted: true });
  },
  { method: "DELETE", requiredPermission: "forms:manage" }
);
