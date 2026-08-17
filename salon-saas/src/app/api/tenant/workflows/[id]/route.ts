import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const workflowUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).nullable().optional(),
  entityKey: z.string().nullable().optional(),
  triggerType: z.enum(["record.created", "record.updated", "status.changed", "scheduled"]).optional(),
  triggerConfig: z.record(z.any()).optional(),
  conditions: z.record(z.any()).nullable().optional(),
  actions: z.array(z.record(z.any())).optional(),
  isActive: z.boolean().optional(),
});

const toggleSchema = z.object({
  isActive: z.boolean(),
});

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const [row] = await db.select()
      .from(workflows)
      .where(and(eq(workflows.tenantId, tenantId), eq(workflows.id, id)))
      .limit(1);
    if (!row) {
      const error = new Error("Workflow not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    return apiSuccess(row);
  },
  { method: "GET", requiredPermission: "workflows:manage" }
);

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(workflowUpdateSchema, body);

    const [existing] = await db.select()
      .from(workflows)
      .where(and(eq(workflows.tenantId, tenantId), eq(workflows.id, id)))
      .limit(1);
    if (!existing) {
      const error = new Error("Workflow not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const [updated] = await db.update(workflows)
      .set({
        name: validated.name ?? existing.name,
        description: validated.description !== undefined ? validated.description : existing.description,
        entityKey: validated.entityKey !== undefined ? validated.entityKey : existing.entityKey,
        triggerType: (validated.triggerType as any) ?? existing.triggerType,
        triggerConfig: validated.triggerConfig ?? existing.triggerConfig,
        conditions: validated.conditions !== undefined ? validated.conditions : existing.conditions,
        actions: validated.actions ?? existing.actions,
        isActive: validated.isActive ?? existing.isActive,
        version: existing.version + 1,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, id))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "WORKFLOW", id, { version: updated.version });

    return apiSuccess(updated);
  },
  { method: "PUT", requiredPermission: "workflows:manage" }
);

export const PATCH = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(toggleSchema, body);

    const [existing] = await db.select()
      .from(workflows)
      .where(and(eq(workflows.tenantId, tenantId), eq(workflows.id, id)))
      .limit(1);
    if (!existing) {
      const error = new Error("Workflow not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const [updated] = await db.update(workflows)
      .set({ isActive: validated.isActive, updatedAt: new Date(), updatedById: userId })
      .where(eq(workflows.id, id))
      .returning();

    await logAudit(tenantId, userId, validated.isActive ? "ENABLE" : "DISABLE", "WORKFLOW", id);

    return apiSuccess(updated);
  },
  { method: "PATCH", requiredPermission: "workflows:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const { id } = await (req as any).params;

    if (role !== "OWNER") {
      const error = new Error("Only the workspace owner can delete workflows") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const [existing] = await db.select()
      .from(workflows)
      .where(and(eq(workflows.tenantId, tenantId), eq(workflows.id, id)))
      .limit(1);
    if (!existing) {
      const error = new Error("Workflow not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db.delete(workflows).where(eq(workflows.id, id));
    await logAudit(tenantId, userId, "DELETE", "WORKFLOW", id, { key: existing.key });

    return apiSuccess({ success: true, id });
  },
  { method: "DELETE", requiredPermission: "workflows:manage" }
);