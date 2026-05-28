import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "rl:auth",
  analytics: false,
});

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  prefix: "rl:api",
  analytics: false,
});

const FEATURES_CACHE_TTL = 300;

export async function cacheFeatures(tenantId: string, keys: string[]): Promise<void> {
  try {
    await redis.set(`features:${tenantId}`, JSON.stringify(keys), { ex: FEATURES_CACHE_TTL });
  } catch {
    // Non-fatal
  }
}

export async function getCachedFeatures(tenantId: string): Promise<string[] | null> {
  try {
    const cached = await redis.get<string>(`features:${tenantId}`);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export async function invalidateFeatureCache(tenantId: string): Promise<void> {
  try {
    await redis.del(`features:${tenantId}`);
  } catch {
    // Non-fatal
  }
}
