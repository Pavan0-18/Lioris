import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { entities, entityFields, entityRecords } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { getEntityWithFields } from "@/lib/entities/load";

const entityUpdateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  singular: z.string().min(1).max(60).optional(),
  description: z.string().max(300).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  config: z.record(z.any()).optional(),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { key } = await (req as any).params;
    const { entity, fields } = await getEntityWithFields(tenantId, key);
    return apiSuccess({ entity, fields });
  },
  { method: "GET", requiredPermission: "entities:manage" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(entityUpdateSchema, body);

    const [existing] = await db.select()
      .from(entities)
      .where(and(eq(entities.tenantId, tenantId), eq(entities.key, key)))
      .limit(1);
    if (!existing) {
      const error = new Error(`Entity "${key}" not found`) as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    if (existing.isSystem) {
      const error = new Error("System entities cannot be modified") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const [updated] = await db.update(entities)
      .set({
        name: validated.name ?? existing.name,
        singular: validated.singular ?? existing.singular,
        description: validated.description !== undefined ? validated.description : existing.description,
        icon: validated.icon !== undefined ? validated.icon : existing.icon,
        config: validated.config !== undefined ? validated.config : existing.config,
        updatedAt: new Date(),
      })
      .where(eq(entities.id, existing.id))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "ENTITY", existing.id, { key });

    return apiSuccess(updated);
  },
  { method: "PUT", requiredPermission: "entities:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const { key } = await (req as any).params;

    if (role !== "OWNER") {
      const error = new Error("Only the workspace owner can delete entities") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const [existing] = await db.select()
      .from(entities)
      .where(and(eq(entities.tenantId, tenantId), eq(entities.key, key)))
      .limit(1);
    if (!existing) {
      const error = new Error(`Entity "${key}" not found`) as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    if (existing.isSystem) {
      const error = new Error("System entities cannot be deleted") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const count = await db.$count(entityRecords, and(eq(entityRecords.entityId, existing.id)));

    await db.delete(entities).where(eq(entities.id, existing.id));

    await logAudit(tenantId, userId, "DELETE", "ENTITY", existing.id, {
      key,
      recordCount: count,
    });

    return apiSuccess({ success: true, id: existing.id, key });
  },
  { method: "DELETE", requiredPermission: "entities:manage" }
);