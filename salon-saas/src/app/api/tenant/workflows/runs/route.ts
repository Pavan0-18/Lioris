import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateQuery } from "@/lib/validation";
import { db } from "@/lib/db";
import { workflowRuns, workflows } from "@/lib/db/schema";
import { and, eq, desc, asc } from "drizzle-orm";

const RUN_STATUSES = ["success", "failed", "skipped"] as const;

const runsQuerySchema = z.object({
  workflowId: z.string().optional(),
  status: z.enum(RUN_STATUSES).optional(),
  eventType: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const url = new URL(req.url);
    const query = validateQuery(runsQuerySchema, url);

    const conditions = and(
      eq(workflowRuns.tenantId, tenantId),
      query.workflowId ? eq(workflowRuns.workflowId, query.workflowId) : undefined,
      query.status ? eq(workflowRuns.status, query.status) : undefined,
      query.eventType ? eq(workflowRuns.eventType, query.eventType) : undefined
    );

    const [count] = await db.select({ count: db.$count(workflowRuns, conditions) }).from(workflowRuns).limit(1);
    const total = count?.count ?? 0;

    const rows = await db.select({
      id: workflowRuns.id,
      workflowId: workflowRuns.workflowId,
      workflowName: workflows.name,
      eventType: workflowRuns.eventType,
      entityKey: workflowRuns.entityKey,
      recordId: workflowRuns.recordId,
      status: workflowRuns.status,
      error: workflowRuns.error,
      actionsExecuted: workflowRuns.actionsExecuted,
      durationMs: workflowRuns.durationMs,
      triggeredById: workflowRuns.triggeredById,
      createdAt: workflowRuns.createdAt,
    })
      .from(workflowRuns)
      .leftJoin(workflows, eq(workflowRuns.workflowId, workflows.id))
      .where(conditions)
      .orderBy(desc(workflowRuns.createdAt), asc(workflowRuns.id))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return apiSuccess({
      runs: rows,
      pagination: { page: query.page, limit: query.limit, total },
    });
  },
  { method: "GET", requiredPermission: "automation:view" }
);