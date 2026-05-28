import { cache } from "react";
import { db } from "@/lib/db";
import { tenantFeatures, features } from "@/lib/db/schema";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import { getCachedFeatures, cacheFeatures } from "./rate-limit";

export const getTenantFeatures = cache(async (tenantId: string): Promise<string[]> => {
  const cached = await getCachedFeatures(tenantId);
  if (cached) return cached;

  const rows = await db
    .select({ key: features.key })
    .from(tenantFeatures)
    .innerJoin(features, eq(tenantFeatures.featureId, features.id))
    .where(
      and(
        eq(tenantFeatures.tenantId, tenantId),
        eq(tenantFeatures.isEnabled, true),
        eq(features.isActive, true),
        or(isNull(tenantFeatures.expiresAt), gt(tenantFeatures.expiresAt, new Date()))
      )
    );

  const keys = rows.map((r: any) => r.key);
  await cacheFeatures(tenantId, keys);
  return keys;
});

export async function hasFeature(tenantId: string, featureKey: string): Promise<boolean> {
  const featureList = await getTenantFeatures(tenantId);
  return featureList.includes(featureKey);
}

export async function requireFeature(tenantId: string, featureKey: string): Promise<void> {
  const enabled = await hasFeature(tenantId, featureKey);
  if (!enabled) {
    const err = new Error(`Feature not enabled: ${featureKey}`);
    (err as any).code = "FEATURE_NOT_ENABLED";
    (err as any).status = 403;
    throw err;
  }
}

export async function checkPlanLimit(
  tenantId: string,
  featureKey: string,
  currentCount: number,
): Promise<{ allowed: boolean; limit: number | null }> {
  const rows = await db
    .select({ limit: tenantFeatures.limit })
    .from(tenantFeatures)
    .innerJoin(features, eq(tenantFeatures.featureId, features.id))
    .where(and(
      eq(tenantFeatures.tenantId, tenantId),
      eq(features.key, featureKey),
      eq(tenantFeatures.isEnabled, true),
    ))
    .limit(1);

  if (!rows[0]) return { allowed: false, limit: 0 };
  if (rows[0].limit === null) return { allowed: true, limit: null };
  return { allowed: currentCount < rows[0].limit, limit: rows[0].limit };
}

export { invalidateFeatureCache } from "./rate-limit";
