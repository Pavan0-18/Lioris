import { createHash } from "crypto";
import { db } from "@/lib/db";
import { apiKeys, idempotencyKeys, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { extractBearerToken, hashApiKey } from "@/lib/api-keys";
import { apiError, apiSuccess } from "@/lib/utils";
import { assertScope } from "@/lib/api-scopes";
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

export interface PublicApiContext {
  tenantId: string;
  keyId: string;
  keyName: string;
  scopes: string[];
  body?: unknown;
}

interface PublicApiHandlerOptions {
  requiredScope?: string;
  idempotent?: boolean;
  rateLimit?: number;
}

export type PublicApiHandler<T = any> = (
  req: Request,
  context: PublicApiContext & { params?: any }
) => Promise<T>;

function rateLimiter(keyId: string) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: `rl:apikey:${keyId}`,
    analytics: false,
  });
}

async function authenticate(req: Request): Promise<{ key: any; tenant: any }> {
  const token = extractBearerToken(req);
  if (!token) {
    const error = new Error("Missing API key") as any;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hashApiKey(token)))
    .limit(1);

  if (!key) {
    const error = new Error("Invalid API key") as any;
    error.code = "UNAUTHORIZED";
    throw error;
  }
  if (key.revokedAt) {
    const error = new Error("API key has been revoked") as any;
    error.code = "UNAUTHORIZED";
    throw error;
  }
  if (key.expiresAt && key.expiresAt < new Date()) {
    const error = new Error("API key has expired") as any;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, key.tenantId))
    .limit(1);
  if (!tenant) {
    const error = new Error("Tenant not found") as any;
    error.code = "UNAUTHORIZED";
    throw error;
  }
  if (!tenant.isActive || tenant.planStatus === "suspended") {
    const error = new Error("Tenant account is suspended") as any;
    error.code = "FORBIDDEN";
    throw error;
  }

  return { key, tenant };
}

function idempotencyHash(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? {})).digest("hex");
}

export function createPublicApiHandler(
  handler: PublicApiHandler,
  options: PublicApiHandlerOptions = {}
) {
  return async (req: Request, routeContext?: { params?: any }) => {
    try {
      const { key, tenant } = await authenticate(req);
      const url = new URL(req.url);
      const method = req.method;
      const path = url.pathname;

      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id))
        .catch(() => {});

      if (options.rateLimit !== 0) {
        const { success } = await rateLimiter(key.id).limit(tenant.id);
        if (!success) {
          return apiError("Rate limit exceeded", "RATE_LIMITED", 429);
        }
      }

      if (options.requiredScope) {
        assertScope(key.scopes ?? [], options.requiredScope);
      }

      let body: unknown = null;
      if (method === "POST" || method === "PUT" || method === "PATCH") {
        body = await req.json().catch(() => null);
      }

      const context = {
        tenantId: tenant.id,
        keyId: key.id,
        keyName: key.name,
        scopes: key.scopes ?? [],
        params: routeContext?.params,
        body,
      };

      if (options.idempotent && (method === "POST" || method === "PUT")) {
        const idemKey = req.headers.get("idempotency-key");
        if (idemKey) {
          const requestHash = idempotencyHash(body);
          const [existing] = await db
            .select()
            .from(idempotencyKeys)
            .where(and(eq(idempotencyKeys.tenantId, tenant.id), eq(idempotencyKeys.key, idemKey)))
            .limit(1);

          if (existing) {
            if (existing.requestHash !== requestHash) {
              return apiError(
                "Idempotency key reused with a different request body",
                "IDEMPOTENCY_CONFLICT",
                409
              );
            }
            return apiSuccess(existing.responseBody, existing.responseCode ?? 200);
          }

          const result = await handler(req, context);

          let response: Response;
          if (result instanceof Response) {
            response = result;
          } else {
            response = apiSuccess(result);
          }

          let responseCode = 200;
          let responseBody: unknown = null;
          try {
            const text = await response.text();
            responseBody = JSON.parse(text);
            const parsed = responseBody as any;
            if (parsed?.data !== undefined) responseBody = parsed.data;
            else responseBody = parsed;
            responseCode = response.status;
          } catch {
            responseBody = null;
          }

          const ttlSeconds = 24 * 60 * 60;
          const now = new Date();
          const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
          try {
            await db.insert(idempotencyKeys).values({
              tenantId: tenant.id,
              key: idemKey,
              method,
              path,
              requestHash,
              responseCode,
              responseBody,
              createdAt: now,
              expiresAt,
            });
          } catch {
            const [race] = await db
              .select()
              .from(idempotencyKeys)
              .where(and(eq(idempotencyKeys.tenantId, tenant.id), eq(idempotencyKeys.key, idemKey)))
              .limit(1);
            if (race) return apiSuccess(race.responseBody, race.responseCode ?? 200);
          }

          return apiSuccess(responseBody, responseCode);
        }
      }

      const result = await handler(req, context);
      if (result instanceof Response) return result;
      return apiSuccess(result);
    } catch (err: any) {
      if (err.code === "RATE_LIMITED") return apiError(err.message, err.code, 429);
      if (err.code === "FORBIDDEN") return apiError(err.message, err.code, 403);
      if (err.code === "UNAUTHORIZED") return apiError(err.message, err.code, 401);
      if (err.code === "NOT_FOUND") return apiError(err.message, err.code, 404);
      if (err.code === "INVALID_INPUT") return apiError(err.message, err.code, 400);
      console.error("[Public API Error]", err);
      return apiError("Internal server error", "INTERNAL_ERROR", 500);
    }
  };
}