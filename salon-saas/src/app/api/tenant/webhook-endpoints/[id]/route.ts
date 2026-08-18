import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { webhookEndpoints } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).nullable().optional(),
  url: z.string().url().max(500).optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  headers: z.record(z.string()).optional(),
  secret: z.string().max(200).optional(),
  clearSecret: z.boolean().optional(),
  eventTypes: z.array(z.string().max(40)).max(30).optional(),
  isActive: z.boolean().optional(),
});

function maskEndpoint(row: any) {
  const { secret, ...rest } = row;
  return { ...rest, hasSecret: Boolean(secret) };
}

async function findOwnEndpoint(tenantId: string, id: string) {
  const [row] = await db.select()
    .from(webhookEndpoints)
    .where(and(eq(webhookEndpoints.tenantId, tenantId), eq(webhookEndpoints.id, id)))
    .limit(1);
  return row ?? null;
}

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const endpoint = await findOwnEndpoint(tenantId, id);
    if (!endpoint) {
      const error = new Error("Webhook endpoint not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    return apiSuccess(maskEndpoint(endpoint));
  },
  { method: "GET", requiredPermission: "automation:view" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(updateSchema, body);

    const existing = await findOwnEndpoint(tenantId, id);
    if (!existing) {
      const error = new Error("Webhook endpoint not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const secret = validated.clearSecret
      ? null
      : validated.secret !== undefined
        ? validated.secret
        : existing.secret;

    const [updated] = await db.update(webhookEndpoints)
      .set({
        name: validated.name ?? existing.name,
        description: validated.description !== undefined ? validated.description : existing.description,
        url: validated.url ?? existing.url,
        method: validated.method ?? existing.method,
        headers: validated.headers ?? existing.headers,
        secret,
        eventTypes: validated.eventTypes ?? existing.eventTypes,
        isActive: validated.isActive ?? existing.isActive,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(webhookEndpoints.id, existing.id))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "WEBHOOK_ENDPOINT", updated.id, { name: updated.name });

    return apiSuccess(maskEndpoint(updated));
  },
  { method: "PUT", requiredPermission: "automation:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const { id } = await (req as any).params;

    if (role !== "OWNER") {
      const error = new Error("Only the workspace owner can delete webhook endpoints") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const existing = await findOwnEndpoint(tenantId, id);
    if (!existing) {
      const error = new Error("Webhook endpoint not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, existing.id));
    await logAudit(tenantId, userId, "DELETE", "WEBHOOK_ENDPOINT", existing.id, { name: existing.name });

    return apiSuccess({ deleted: true });
  },
  { method: "DELETE", requiredPermission: "automation:manage" }
);