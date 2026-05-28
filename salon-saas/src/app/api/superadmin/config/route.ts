import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { systemConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const [config] = await db.select().from(systemConfig).limit(1);
    if (!config) {
      const [created] = await db.insert(systemConfig).values({}).returning();
      return apiSuccess(created);
    }
    return apiSuccess(config);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const [existing] = await db.select({ id: systemConfig.id }).from(systemConfig).limit(1);

    if (existing) {
      await db.update(systemConfig)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(systemConfig.id, existing.id));
    } else {
      await db.insert(systemConfig).values(body);
    }

    const [updated] = await db.select().from(systemConfig).limit(1);
    return apiSuccess(updated);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
