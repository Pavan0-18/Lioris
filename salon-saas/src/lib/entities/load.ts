import { db } from "@/lib/db";
import { entities, entityFields } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getTenantEntity(tenantId: string, key: string) {
  const [entity] = await db.select()
    .from(entities)
    .where(and(eq(entities.tenantId, tenantId), eq(entities.key, key)))
    .limit(1);

  if (!entity) {
    const error = new Error(`Entity "${key}" not found`) as any;
    error.code = "NOT_FOUND";
    throw error;
  }
  return entity;
}

export async function getEntityWithFields(tenantId: string, key: string) {
  const entity = await getTenantEntity(tenantId, key);
  const fields = await db.select()
    .from(entityFields)
    .where(eq(entityFields.entityId, entity.id))
    .orderBy(entityFields.position);
  return { entity, fields };
}