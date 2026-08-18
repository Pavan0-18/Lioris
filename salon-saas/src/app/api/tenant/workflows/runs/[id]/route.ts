import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { db } from "@/lib/db";
import { workflowRuns, workflows } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { retryWorkflowRun } from "@/lib/workflows/engine";
import { logAudit } from "@/lib/auth-utils";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const [run] = await db.select({
      id: workflowRuns.id,
      workflowId: workflowRuns.workflowId,
      workflowName: workflows.name,
      eventType: workflowRuns.eventType,
      entityKey: workflowRuns.entityKey,
      recordId: workflowRuns.recordId,
      status: workflowRuns.status,
      error: workflowRuns.error,
      input: workflowRuns.input,
      output: workflowRuns.output,
      actionsExecuted: workflowRuns.actionsExecuted,
      durationMs: workflowRuns.durationMs,
      triggeredById: workflowRuns.triggeredById,
      createdAt: workflowRuns.createdAt,
    })
      .from(workflowRuns)
      .leftJoin(workflows, eq(workflowRuns.workflowId, workflows.id))
      .where(and(eq(workflowRuns.tenantId, tenantId), eq(workflowRuns.id, id)))
      .limit(1);

    if (!run) {
      const error = new Error("Workflow run not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    return apiSuccess(run);
  },
  { method: "GET", requiredPermission: "automation:view" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;

    const result = await retryWorkflowRun(tenantId, id, userId);

    if (result.status === "not_found") {
      const error = new Error("Workflow run not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    if (result.status === "not_retryable") {
      const error = new Error(result.reason ?? "Run cannot be retried") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }
    if (result.status === "inactive") {
      const error = new Error(result.reason ?? "Workflow is no longer active") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    await logAudit(tenantId, userId, "CREATE", "WORKFLOW_RUN_RETRY", result.runId ?? id, { originalRunId: id });

    return apiSuccess({ runId: result.runId, status: result.status });
  },
  { method: "POST", requiredPermission: "automation:manage" }
);