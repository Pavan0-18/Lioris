import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { entityViews } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { getEntityWithFields } from "@/lib/entities/load";
import { validateViewConfig, VIEW_TYPES } from "@/lib/views/engine";

const updateViewSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  type: z.enum(VIEW_TYPES).optional(),
  config: z.any().optional(),
  isDefault: z.boolean().optional(),
});

async function findOwnView(tenantId: string, entityId: string, viewId: string) {
  const [view] = await db.select()
    .from(entityViews)
    .where(and(
      eq(entityViews.tenantId, tenantId),
      eq(entityViews.id, viewId)
    ))
    .limit(1);
  return view ?? null;
}

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { key, id } = await (req as any).params;

    const { entity } = await getEntityWithFields(tenantId, key);
    const view = await findOwnView(tenantId, entity.id, id);
    if (!view) {
      const error = new Error("View not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    return apiSuccess({ view, entity: { id: entity.id, key: entity.key, name: entity.name } });
  },
  { method: "GET", requiredPermission: "views:manage" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key, id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(updateViewSchema, body);

    const { entity } = await getEntityWithFields(tenantId, key);
    const existing = await findOwnView(tenantId, entity.id, id);
    if (!existing) {
      const error = new Error("View not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const type = validated.type ?? existing.type;
    const config = validated.config !== undefined ? validateViewConfig(type as any, validated.config) : existing.config;
    const isDefault = validated.isDefault ?? existing.isDefault;

    const [updated] = await db.update(entityViews)
      .set({
        name: validated.name ?? existing.name,
        type,
        config: config as any,
        isDefault,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(entityViews.id, existing.id))
      .returning();

    if (isDefault) {
      await db.update(entityViews)
        .set({ isDefault: false })
        .where(and(
          eq(entityViews.tenantId, tenantId),
          eq(entityViews.entityId, entity.id),
          ne(entityViews.id, existing.id),
        ));
    }

    await logAudit(tenantId, userId, "UPDATE", "ENTITY_VIEW", updated.id, { entityKey: key });

    return apiSuccess(updated);
  },
  { method: "PUT", requiredPermission: "views:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key, id } = await (req as any).params;

    const { entity } = await getEntityWithFields(tenantId, key);
    const existing = await findOwnView(tenantId, entity.id, id);
    if (!existing) {
      const error = new Error("View not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db.delete(entityViews).where(eq(entityViews.id, existing.id));
    await logAudit(tenantId, userId, "DELETE", "ENTITY_VIEW", existing.id, { entityKey: key });

    return apiSuccess({ deleted: true });
  },
  { method: "DELETE", requiredPermission: "views:manage" }
);
