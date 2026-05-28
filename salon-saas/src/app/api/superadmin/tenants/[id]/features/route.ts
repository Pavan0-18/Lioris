import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenantFeatures, features } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { invalidateFeatureCache } from "@/lib/feature-gate";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();

    for (const item of body) {
      const existing = await db.select()
        .from(tenantFeatures)
        .where(
          and(
            eq(tenantFeatures.tenantId, id),
            eq(tenantFeatures.featureId, item.featureId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db.update(tenantFeatures)
          .set({ isEnabled: item.isEnabled })
          .where(
            and(
              eq(tenantFeatures.tenantId, id),
              eq(tenantFeatures.featureId, item.featureId)
            )
          );
      } else {
        await db.insert(tenantFeatures).values({
          tenantId: id,
          featureId: item.featureId,
          isEnabled: item.isEnabled
        });
      }
    }

    await invalidateFeatureCache(id);

    const [feat] = await db.select({ name: features.name }).from(features).where(eq(features.id, body[0]?.featureId));
    await createAuditLog({
      tenantId: id,
      userId: session.user.id,
      action: "toggle_feature",
      entityType: "feature",
      entityId: body[0]?.featureId,
      changes: { featureName: feat?.name, isEnabled: body[0]?.isEnabled },
    });

    return apiSuccess({ success: true });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
