import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { webhookEndpoints } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const endpointSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  url: z.string().url().max(500),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  headers: z.record(z.string()).optional(),
  secret: z.string().max(200).optional(),
  eventTypes: z.array(z.string().max(40)).max(30).optional(),
  isActive: z.boolean().default(true),
});

function maskEndpoint(row: any) {
  const { secret, ...rest } = row;
  return { ...rest, hasSecret: Boolean(secret) };
}

export const GET = createApiHandler(
  async (_req, context) => {
    const { tenantId } = context.auth;
    const rows = await db.select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.tenantId, tenantId))
      .orderBy(asc(webhookEndpoints.name));
    return apiSuccess(rows.map(maskEndpoint));
  },
  { method: "GET", requiredPermission: "automation:view" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const body = await req.json();
    const validated = validateBody(endpointSchema, body);

    const [inserted] = await db.insert(webhookEndpoints).values({
      tenantId,
      name: validated.name,
      description: validated.description ?? null,
      url: validated.url,
      method: validated.method,
      headers: validated.headers ?? {},
      secret: validated.secret ?? null,
      eventTypes: validated.eventTypes ?? [],
      isActive: validated.isActive,
      createdById: userId,
      updatedById: userId,
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "WEBHOOK_ENDPOINT", inserted.id, { name: inserted.name });

    return apiSuccess(maskEndpoint(inserted));
  },
  { method: "POST", requiredPermission: "automation:manage" }
);