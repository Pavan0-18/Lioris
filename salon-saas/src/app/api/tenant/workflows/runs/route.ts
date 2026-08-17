import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateQuery } from "@/lib/validation";
import { db } from "@/lib/db";
import { workflowRuns, workflows } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

const runsQuerySchema = z.object({
  workflowId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const url = new URL(req.url);
    const query = validateQuery(runsQuerySchema, url);

    const conditions = query.workflowId
      ? and(eq(workflowRuns.tenantId, tenantId), eq(workflowRuns.workflowId, query.workflowId))
      : eq(workflowRuns.tenantId, tenantId);

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
      .orderBy(desc(workflowRuns.createdAt))
      .limit(query.limit);

    return apiSuccess(rows);
  },
  { method: "GET", requiredPermission: "workflows:manage" }
);