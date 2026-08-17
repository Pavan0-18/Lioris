import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/auth-utils";
import { entities } from "@/lib/db/schema";

const workflowSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, underscores").optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  entityKey: z.string().nullable().optional(),
  triggerType: z.enum(["record.created", "record.updated", "status.changed", "scheduled"]),
  triggerConfig: z.record(z.any()).optional(),
  conditions: z.object({
    all: z.array(z.record(z.any())).optional(),
    any: z.array(z.record(z.any())).optional(),
  }).optional(),
  actions: z.array(z.object({
    type: z.enum(["send_notification", "send_email", "create_record", "update_record", "webhook"]),
    config: z.record(z.any()),
  })).min(1, "At least one action is required"),
  isActive: z.boolean().default(true),
});

export const GET = createApiHandler(
  async (_req, context) => {
    const { tenantId } = context.auth;
    const rows = await db.select().from(workflows).where(eq(workflows.tenantId, tenantId));
    return apiSuccess(rows);
  },
  { method: "GET", requiredPermission: "workflows:manage" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const body = await req.json();
    const validated = validateBody(workflowSchema, body);

    if (validated.entityKey) {
      const [entity] = await db.select({ id: entities.id })
        .from(entities)
        .where(eq(entities.key, validated.entityKey))
        .limit(1);
      if (!entity) {
        const error = new Error(`Entity "${validated.entityKey}" not found. Create it first.`) as any;
        error.code = "INVALID_INPUT";
        throw error;
      }
    }

    const key = validated.key ?? validated.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

    const [existing] = await db.select({ id: workflows.id })
      .from(workflows)
      .where(eq(workflows.key, key))
      .limit(1);
    if (existing) {
      const error = new Error(`Workflow "${key}" already exists`) as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const [inserted] = await db.insert(workflows).values({
      tenantId,
      key,
      name: validated.name,
      description: validated.description,
      entityKey: validated.entityKey ?? null,
      triggerType: validated.triggerType,
      triggerConfig: validated.triggerConfig ?? {},
      conditions: validated.conditions ?? null,
      actions: validated.actions,
      isActive: validated.isActive,
      createdById: userId,
    }).returning();

    await logAudit(tenantId, userId, "CREATE", "WORKFLOW", inserted.id, {
      key,
      triggerType: validated.triggerType,
      actionCount: validated.actions.length,
    });

    return apiSuccess(inserted);
  },
  { method: "POST", requiredPermission: "workflows:manage" }
);