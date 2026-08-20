import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { generateApiKey } from "@/lib/api-keys";
import { API_SCOPES } from "@/lib/api-scopes";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.enum(API_SCOPES)).max(20).default([]),
  environment: z.enum(["production", "test"]).default("production"),
  expiresAt: z.string().datetime().optional(),
});

function maskKey(row: any) {
  const { keyHash, ...rest } = row;
  return rest;
}

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const rows = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        scopes: apiKeys.scopes,
        environment: apiKeys.environment,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, tenantId))
      .orderBy(desc(apiKeys.createdAt));

    return apiSuccess({ keys: rows });
  },
  { method: "GET", requiredPermission: "automation:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const body = await req.json();
    const validated = validateBody(createSchema, body);

    const generated = generateApiKey(validated.environment);

    const [key] = await db
      .insert(apiKeys)
      .values({
        tenantId,
        name: validated.name,
        prefix: generated.prefix,
        keyHash: generated.keyHash,
        scopes: validated.scopes,
        environment: validated.environment,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        createdById: userId,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        scopes: apiKeys.scopes,
        environment: apiKeys.environment,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      });

    await logAudit(tenantId, userId, "CREATE", "API_KEY", key.id, { name: key.name });

    return apiSuccess({ ...key, key: generated.key });
  },
  { method: "POST", requiredPermission: "automation:manage" }
);