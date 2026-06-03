import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { systemConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async () => {
  const [config] = await db.select().from(systemConfig).limit(1);
  return apiSuccess({
    maintenanceMode: config?.maintenanceMode || false,
    maintenanceMessage: config?.maintenanceMessage || null,
  });
}, { method: "GET" });

export const PUT = createApiHandler(async (req) => {
  const body = await req.json();
  const [existing] = await db.select().from(systemConfig).limit(1);

  if (existing) {
    const [updated] = await db.update(systemConfig)
      .set({
        maintenanceMode: body.maintenanceMode,
        maintenanceMessage: body.maintenanceMessage || null,
        updatedAt: new Date(),
      })
      .where(eq(systemConfig.id, existing.id))
      .returning();
    return apiSuccess(updated);
  }

  const [inserted] = await db.insert(systemConfig).values({
    maintenanceMode: body.maintenanceMode,
    maintenanceMessage: body.maintenanceMessage || null,
  }).returning();
  return apiSuccess(inserted);
}, { method: "PUT" });
