import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { scheduleRules } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const updateRuleSchema = z.object({
  isWorking: z.boolean().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  bufferMinutes: z.number().int().min(0).max(1440).optional(),
  maxConcurrent: z.number().int().min(1).max(50).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const PUT = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;
    const body = await req.json();
    const validated = validateBody(updateRuleSchema, body);

    const [existing] = await db.select()
      .from(scheduleRules)
      .where(and(eq(scheduleRules.tenantId, tenantId), eq(scheduleRules.id, id)))
      .limit(1);
    if (!existing) {
      const error = new Error("Schedule rule not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const isWorking = validated.isWorking ?? existing.isWorking;
    const startTime = validated.startTime !== undefined ? validated.startTime : existing.startTime;
    const endTime = validated.endTime !== undefined ? validated.endTime : existing.endTime;

    if (isWorking) {
      if (!startTime || !endTime) {
        const error = new Error("Working days require a start and end time") as any;
        error.code = "INVALID_INPUT";
        throw error;
      }
      if (startTime >= endTime) {
        const error = new Error("Start time must be before end time") as any;
        error.code = "INVALID_INPUT";
        throw error;
      }
    }

    const [updated] = await db.update(scheduleRules)
      .set({
        isWorking,
        startTime: isWorking ? startTime : null,
        endTime: isWorking ? endTime : null,
        bufferMinutes: validated.bufferMinutes ?? existing.bufferMinutes,
        maxConcurrent: validated.maxConcurrent ?? existing.maxConcurrent,
        notes: validated.notes !== undefined ? validated.notes : existing.notes,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(scheduleRules.id, existing.id))
      .returning();

    await logAudit(tenantId, userId, "UPDATE", "SCHEDULE_RULE", updated.id, {});

    return apiSuccess(updated);
  },
  { method: "PUT", requiredPermission: "schedule:manage" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId, userId, role } = context.auth;
    const { id } = await (req as any).params;

    if (role !== "OWNER") {
      const error = new Error("Only the workspace owner can delete schedule rules") as any;
      error.code = "FORBIDDEN";
      throw error;
    }

    const [existing] = await db.select()
      .from(scheduleRules)
      .where(and(eq(scheduleRules.tenantId, tenantId), eq(scheduleRules.id, id)))
      .limit(1);
    if (!existing) {
      const error = new Error("Schedule rule not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    await db.delete(scheduleRules).where(eq(scheduleRules.id, existing.id));
    await logAudit(tenantId, userId, "DELETE", "SCHEDULE_RULE", existing.id, {});

    return apiSuccess({ deleted: true });
  },
  { method: "DELETE", requiredPermission: "schedule:manage" }
);