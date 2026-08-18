import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { entityViews } from "@/lib/db/schema";
import { and, eq, ne, asc } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { getEntityWithFields } from "@/lib/entities/load";
import { validateViewConfig, VIEW_TYPES } from "@/lib/views/engine";

const createViewSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(VIEW_TYPES).default("list"),
  config: z.any(),
  isDefault: z.boolean().optional(),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { key } = await (req as any).params;

    const { entity } = await getEntityWithFields(tenantId, key);

    const rows = await db.select()
      .from(entityViews)
      .where(and(eq(entityViews.tenantId, tenantId), eq(entityViews.entityId, entity.id)))
      .orderBy(asc(entityViews.name));

    return apiSuccess({ entity: { id: entity.id, key: entity.key, name: entity.name }, views: rows });
  },
  { method: "GET", requiredPermission: "views:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { key } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(createViewSchema, body);

    const { entity } = await getEntityWithFields(tenantId, key);
    const config = validateViewConfig(validated.type as any, validated.config);

    const [inserted] = await db.insert(entityViews).values({
      tenantId,
      entityId: entity.id,
      name: validated.name,
      type: validated.type,
      config: config as any,
      isDefault: validated.isDefault ?? false,
      createdById: userId,
      updatedById: userId,
    }).returning();

    if (inserted.isDefault) {
      await db.update(entityViews)
        .set({ isDefault: false })
        .where(and(
          eq(entityViews.tenantId, tenantId),
          eq(entityViews.entityId, entity.id),
          ne(entityViews.id, inserted.id),
        ));
    }

    await logAudit(tenantId, userId, "CREATE", "ENTITY_VIEW", inserted.id, { entityKey: key });

    return apiSuccess(inserted);
  },
  { method: "POST", requiredPermission: "views:manage" }
);
