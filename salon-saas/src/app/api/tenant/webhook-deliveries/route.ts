import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateQuery } from "@/lib/validation";
import { db } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";
import { and, eq, desc, asc } from "drizzle-orm";

const DELIVERY_STATUSES = ["pending", "delivered", "failed"] as const;

const listQuerySchema = z.object({
  status: z.enum(DELIVERY_STATUSES).optional(),
  endpointId: z.string().optional(),
  workflowId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const url = new URL(req.url);
    const query = validateQuery(listQuerySchema, url);

    const conditions = and(
      eq(webhookDeliveries.tenantId, tenantId),
      query.status ? eq(webhookDeliveries.status, query.status) : undefined,
      query.endpointId ? eq(webhookDeliveries.endpointId, query.endpointId) : undefined,
      query.workflowId ? eq(webhookDeliveries.workflowId, query.workflowId) : undefined
    );

    const [count] = await db.select({ count: db.$count(webhookDeliveries, conditions) }).from(webhookDeliveries).limit(1);
    const total = count?.count ?? 0;

    const rows = await db.select({
      id: webhookDeliveries.id,
      workflowId: webhookDeliveries.workflowId,
      endpointId: webhookDeliveries.endpointId,
      endpointName: webhookEndpoints.name,
      url: webhookDeliveries.url,
      status: webhookDeliveries.status,
      statusCode: webhookDeliveries.statusCode,
      attempts: webhookDeliveries.attempts,
      lastError: webhookDeliveries.lastError,
      createdAt: webhookDeliveries.createdAt,
    })
      .from(webhookDeliveries)
      .leftJoin(webhookEndpoints, eq(webhookDeliveries.endpointId, webhookEndpoints.id))
      .where(conditions)
      .orderBy(desc(webhookDeliveries.createdAt), asc(webhookDeliveries.id))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return apiSuccess({
      deliveries: rows,
      pagination: { page: query.page, limit: query.limit, total },
    });
  },
  { method: "GET", requiredPermission: "automation:view" }
);