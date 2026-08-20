import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { API_SCOPES } from "@/lib/api-scopes";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  scopes: z.array(z.enum(API_SCOPES)).max(20).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

async function findOwnKey(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.tenantId, tenantId), eq(apiKeys.id, id)))
    .limit(1);
  return row ?? null;
}

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;
    const key = await findOwnKey(tenantId, id);
    if (!key) {
      const error = new Error("API key not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    return apiSuccess({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      scopes: key.scopes,
      environment: key.environment,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
    });
  },
  { method: "GET", requiredPermission: "automation:manage" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(updateSchema, body);

    const existing = await findOwnKey(tenantId, id);
    if (!existing) {
      const error = new Error("API key not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const [key] = await db
      .update(apiKeys)
      .set({
        name: validated.name ?? existing.name,
        scopes: validated.scopes ?? existing.scopes,
        expiresAt:
          validated.expiresAt !== undefined
            ? validated.expiresAt
              ? new Date(validated.expiresAt)
              : null
            : existing.expiresAt,
      })
      .where(and(eq(apiKeys.tenantId, tenantId), eq(apiKeys.id, id)))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "API_KEY", key.id, { name: key.name });

    return apiSuccess({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      scopes: key.scopes,
      environment: key.environment,
      expiresAt: key.expiresAt,
    });
  },
  { method: "PUT", requiredPermission: "automation:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;

    const existing = await findOwnKey(tenantId, id);
    if (!existing) {
      const error = new Error("API key not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.tenantId, tenantId), eq(apiKeys.id, id)));

    await logAudit(tenantId, userId, "DELETE", "API_KEY", id, { name: existing.name });

    return apiSuccess({ revoked: true });
  },
  { method: "DELETE", requiredPermission: "automation:manage" }
);