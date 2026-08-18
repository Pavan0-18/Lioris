import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { scheduleRules, staff } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";

const ruleSchema = z.object({
  staffId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  isWorking: z.boolean().default(true),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  bufferMinutes: z.number().int().min(0).max(1440).default(0),
  maxConcurrent: z.number().int().min(1).max(50).default(1),
  notes: z.string().max(500).nullable().optional(),
});

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function validateTimes(body: z.infer<typeof ruleSchema>) {
  if (body.isWorking) {
    if (!body.startTime || !body.endTime) {
      const error = new Error("Working days require a start and end time") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }
    if (body.startTime >= body.endTime) {
      const error = new Error("Start time must be before end time") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }
  }
}

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const url = new URL(req.url);
    const staffId = url.searchParams.get("staffId");

    const conditions = staffId
      ? and(eq(scheduleRules.tenantId, tenantId), eq(scheduleRules.staffId, staffId))
      : eq(scheduleRules.tenantId, tenantId);

    const rows = await db.select()
      .from(scheduleRules)
      .where(conditions)
      .orderBy(asc(scheduleRules.dayOfWeek));

    const decorated = rows.map((r) => ({
      ...r,
      dayLabel: DAY_LABELS[r.dayOfWeek] ?? String(r.dayOfWeek),
    }));

    return apiSuccess(decorated);
  },
  { method: "GET", requiredPermission: "schedule:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const body = await req.json();
    const validated = validateBody(ruleSchema, body);

    validateTimes(validated);

    const [staffRow] = await db.select()
      .from(staff)
      .where(and(eq(staff.tenantId, tenantId), eq(staff.id, validated.staffId)))
      .limit(1);
    if (!staffRow) {
      const error = new Error("Staff member not found in this workspace") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const [inserted] = await db.insert(scheduleRules).values({
      tenantId,
      staffId: validated.staffId,
      dayOfWeek: validated.dayOfWeek,
      isWorking: validated.isWorking,
      startTime: validated.isWorking ? validated.startTime! : null,
      endTime: validated.isWorking ? validated.endTime! : null,
      bufferMinutes: validated.bufferMinutes,
      maxConcurrent: validated.maxConcurrent,
      notes: validated.notes ?? null,
      createdById: userId,
      updatedById: userId,
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "SCHEDULE_RULE", inserted.id, {
      staffId: validated.staffId,
      dayOfWeek: validated.dayOfWeek,
    });

    return apiSuccess(inserted);
  },
  { method: "POST", requiredPermission: "schedule:manage" }
);