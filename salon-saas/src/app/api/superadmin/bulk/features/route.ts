import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants, tenantFeatures, features } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { invalidateFeatureCache } from "@/lib/feature-gate";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const { featureKey, isEnabled, tenantFilter } = body;

    if (!featureKey) return apiError("featureKey is required", "VALIDATION_ERROR", 400);

    const [feat] = await db.select({ id: features.id, name: features.name }).from(features).where(eq(features.key, featureKey)).limit(1);
    if (!feat) return apiError("Feature not found", "NOT_FOUND", 404);

    let targetTenants: { id: string }[];

    if (tenantFilter === "active") {
      targetTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.isActive, true));
    } else if (tenantFilter === "trialing") {
      targetTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.planStatus, "trialing"));
    } else {
      targetTenants = await db.select({ id: tenants.id }).from(tenants);
    }

    for (const t of targetTenants) {
      const [existing] = await db.select()
        .from(tenantFeatures)
        .where(and(eq(tenantFeatures.tenantId, t.id), eq(tenantFeatures.featureId, feat.id)))
        .limit(1);

      if (existing) {
        await db.update(tenantFeatures)
          .set({ isEnabled })
          .where(and(eq(tenantFeatures.tenantId, t.id), eq(tenantFeatures.featureId, feat.id)));
      } else {
        await db.insert(tenantFeatures).values({
          tenantId: t.id,
          featureId: feat.id,
          isEnabled,
        });
      }

      await invalidateFeatureCache(t.id);
    }

    return apiSuccess({ affectedTenants: targetTenants.length, featureName: feat.name, isEnabled });
  } catch (err: any) {
    console.error("[bulk-features]", err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const allFeatures = await db.select().from(features).where(eq(features.isActive, true));
    return apiSuccess(allFeatures);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
