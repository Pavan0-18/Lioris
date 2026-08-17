import { db } from "@/lib/db";
import { workflows, workflowRuns, webhookDeliveries, entityRecords, entities, entityFields } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/emails";
import { validateRecord } from "@/lib/entities/engine";
import { logAudit } from "@/lib/auth-utils";

export type WorkflowTriggerType =
  | "record.created"
  | "record.updated"
  | "status.changed"
  | "scheduled";

export type WorkflowOperator =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "contains" | "starts_with" | "ends_with"
  | "in" | "not_in" | "is_empty" | "is_not_empty"
  | "changed" | "changed_to" | "changed_from";

export interface WorkflowCondition {
  field: string;
  operator: WorkflowOperator;
  value?: any;
}

export interface WorkflowConditionGroup {
  all?: WorkflowCondition[];
  any?: WorkflowCondition[];
}

export type WorkflowActionType =
  | "send_notification"
  | "send_email"
  | "create_record"
  | "update_record"
  | "webhook";

export interface WorkflowAction {
  type: WorkflowActionType;
  config: Record<string, any>;
}

export interface EventContext {
  tenantId: string;
  actorId?: string;
  eventType: WorkflowTriggerType;
  entityKey?: string;
  record?: Record<string, any>;
  previousRecord?: Record<string, any>;
  extra?: Record<string, any>;
}

export function getNestedValue(obj: Record<string, any> | undefined, path: string): any {
  if (!obj) return undefined;
  const parts = path.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

export function applyTemplate(template: string, record: Record<string, any> | undefined, extra?: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path: string) => {
    const fromExtra = extra ? getNestedValue(extra, path.trim()) : undefined;
    const fromRecord = record ? getNestedValue(record, path.trim()) : undefined;
    const value = fromExtra !== undefined ? fromExtra : fromRecord;
    return value === undefined || value === null ? "" : String(value);
  });
}

export function evaluateConditions(
  group: WorkflowConditionGroup | null | undefined,
  record: Record<string, any> | undefined,
  previousRecord: Record<string, any> | undefined
): boolean {
  if (!group) return true;
  if (group.all && group.all.length > 0) {
    return group.all.every((c) => evaluateCondition(c, record, previousRecord));
  }
  if (group.any && group.any.length > 0) {
    return group.any.some((c) => evaluateCondition(c, record, previousRecord));
  }
  return true;
}

export function evaluateCondition(
  condition: WorkflowCondition,
  record: Record<string, any> | undefined,
  previousRecord: Record<string, any> | undefined
): boolean {
  const current = getNestedValue(record, condition.field);
  const previous = getNestedValue(previousRecord, condition.field);

  switch (condition.operator) {
    case "eq": return current === condition.value;
    case "neq": return current !== condition.value;
    case "gt": return Number(current) > Number(condition.value);
    case "gte": return Number(current) >= Number(condition.value);
    case "lt": return Number(current) < Number(condition.value);
    case "lte": return Number(current) <= Number(condition.value);
    case "contains": return String(current ?? "").includes(String(condition.value ?? ""));
    case "starts_with": return String(current ?? "").startsWith(String(condition.value ?? ""));
    case "ends_with": return String(current ?? "").endsWith(String(condition.value ?? ""));
    case "in": return Array.isArray(condition.value) && condition.value.includes(current);
    case "not_in": return Array.isArray(condition.value) && !condition.value.includes(current);
    case "is_empty": return current === undefined || current === null || current === "";
    case "is_not_empty": return current !== undefined && current !== null && current !== "";
    case "changed": return current !== previous;
    case "changed_to": return previous !== condition.value && current === condition.value;
    case "changed_from": return previous === condition.value && current !== condition.value;
    default: return false;
  }
}

export function shouldTrigger(
  triggerType: WorkflowTriggerType,
  triggerConfig: Record<string, any> | null | undefined,
  event: EventContext
): boolean {
  if (event.eventType !== triggerType) return false;

  if (triggerType === "status.changed") {
    const statusField = triggerConfig?.statusField ?? "status";
    const current = getNestedValue(event.record, statusField);
    const previous = getNestedValue(event.previousRecord, statusField);
    if (current === previous) return false;
    if (triggerConfig?.to && current !== triggerConfig.to) return false;
    if (triggerConfig?.from && previous !== triggerConfig.from) return false;
    return true;
  }

  if (triggerType === "record.updated") {
    const fields = triggerConfig?.fields as string[] | undefined;
    if (fields && fields.length > 0 && event.previousRecord) {
      const anyChanged = fields.some((f) =>
        getNestedValue(event.record, f) !== getNestedValue(event.previousRecord, f)
      );
      if (!anyChanged) return false;
    }
  }

  return true;
}

async function resolveUserIds(tenantId: string, roles?: string[]): Promise<string[]> {
  const { users } = await import("@/lib/db/schema");
  const rows = await db.select({ id: users.id })
    .from(users)
    .where(and(
      eq(users.tenantId, tenantId),
      eq(users.isActive, true),
      roles && roles.length > 0 ? inArray(users.role, roles as any) : undefined
    ));
  return rows.map((r) => r.id);
}

async function insertNotification(tenantId: string, userId: string, title: string, message: string, link?: string) {
  const { notifications } = await import("@/lib/db/schema");
  await db.insert(notifications).values({
    tenantId,
    userId,
    type: "info",
    title,
    message,
    link: link ?? null,
  });
}

async function createEntityRecord(tenantId: string, actorId: string | undefined, entityKey: string, values: Record<string, any>) {
  const [entity] = await db.select().from(entities)
    .where(and(eq(entities.tenantId, tenantId), eq(entities.key, entityKey)))
    .limit(1);
  if (!entity) throw new Error(`Entity "${entityKey}" not found`);

  const fields = await db.select().from(entityFields)
    .where(eq(entityFields.entityId, entity.id))
    .orderBy(entityFields.position);

  const { errors } = validateRecord(fields as any, values);
  if (errors.length > 0) throw new Error(`Validation failed: ${errors[0].message}`);

  const [inserted] = await db.insert(entityRecords).values({
    tenantId,
    entityId: entity.id,
    fieldValues: values,
    createdById: actorId,
    updatedById: actorId,
  }).returning();

  return inserted;
}

async function updateEntityRecord(tenantId: string, recordId: string, values: Record<string, any>) {
  const [existing] = await db.select().from(entityRecords)
    .where(and(eq(entityRecords.tenantId, tenantId), eq(entityRecords.id, recordId)))
    .limit(1);
  if (!existing) throw new Error(`Record ${recordId} not found`);

  const merged = { ...(existing.fieldValues as Record<string, any>), ...values };
  const [updated] = await db.update(entityRecords)
    .set({ fieldValues: merged, updatedAt: new Date() })
    .where(eq(entityRecords.id, recordId))
    .returning();
  return updated;
}

export async function executeAction(
  action: WorkflowAction,
  event: EventContext,
  tenantId: string,
  actorId: string | undefined
): Promise<boolean> {
  const config = action.config ?? {};
  const record = event.record;
  const title = applyTemplate(config.title ?? "Workflow notification", record, event.extra);

  switch (action.type) {
    case "send_notification": {
      const message = applyTemplate(config.message ?? "", record, event.extra);
      const userIds = config.userIds?.length
        ? config.userIds
        : await resolveUserIds(tenantId, config.roles);
      if (userIds.length === 0) return false;
      for (const userId of userIds) {
        await insertNotification(tenantId, userId, title, message, config.link ? applyTemplate(config.link, record, event.extra) : undefined);
      }
      return true;
    }

    case "send_email": {
      const to = applyTemplate(config.to ?? "", record, event.extra);
      if (!to || !to.includes("@")) return false;
      const subject = applyTemplate(config.subject ?? title, record, event.extra);
      const body = applyTemplate(config.body ?? "", record, event.extra);
      await sendEmail({ to, subject, html: body });
      return true;
    }

    case "create_record": {
      const values = Object.fromEntries(
        Object.entries(config.values ?? {}).map(([k, v]) => [k, applyTemplate(String(v), record, event.extra)])
      );
      await createEntityRecord(tenantId, actorId, config.entityKey, values);
      return true;
    }

    case "update_record": {
      const recordId = applyTemplate(String(config.recordId ?? ""), record, event.extra);
      if (!recordId) return false;
      const values = Object.fromEntries(
        Object.entries(config.values ?? {}).map(([k, v]) => [k, applyTemplate(String(v), record, event.extra)])
      );
      await updateEntityRecord(tenantId, recordId, values);
      return true;
    }

    case "webhook": {
      const url = applyTemplate(config.url ?? "", record, event.extra);
      if (!url || !/^https?:\/\//.test(url)) return false;
      const payload = {
        event: event.eventType,
        tenantId,
        entityKey: event.entityKey,
        record: record ?? null,
        workflowId: null as string | null,
        deliveredAt: new Date().toISOString(),
      };
      const [delivery] = await db.insert(webhookDeliveries).values({
        tenantId,
        url,
        payload,
        status: "pending",
        attempts: 1,
      }).returning();

      try {
        const res = await fetch(url, {
          method: config.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.headers ?? {}),
            "X-Lioris-Event": event.eventType,
            "X-Lioris-Tenant": tenantId,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });
        const ok = res.ok || res.status < 500;
        await db.update(webhookDeliveries)
          .set({ status: ok ? "delivered" : "failed", statusCode: res.status, lastError: ok ? null : `HTTP ${res.status}` })
          .where(eq(webhookDeliveries.id, delivery.id));
        return ok;
      } catch (err: any) {
        await db.update(webhookDeliveries)
          .set({ status: "failed", lastError: err?.message ?? "Network error" })
          .where(eq(webhookDeliveries.id, delivery.id));
        return false;
      }
    }

    default:
      return false;
  }
}

export async function runWorkflowsForEvent(event: EventContext): Promise<{ triggered: number; runs: number }> {
  const { tenantId, actorId, eventType, entityKey } = event;

  const activeWorkflows = await db.select()
    .from(workflows)
    .where(and(
      eq(workflows.tenantId, tenantId),
      eq(workflows.isActive, true),
      eq(workflows.triggerType, eventType)
    ));

  const matching = activeWorkflows.filter((wf) => {
    if (wf.entityKey && entityKey && wf.entityKey !== entityKey) return false;
    return shouldTrigger(wf.triggerType as WorkflowTriggerType, wf.triggerConfig as Record<string, any> | null, event);
  });

  let triggered = 0;

  for (const wf of matching) {
    const started = Date.now();
    let status = "success";
    let error: string | null = null;
    let executed = 0;

    try {
      const conditionsOk = evaluateConditions(
        wf.conditions as WorkflowConditionGroup | null,
        event.record,
        event.previousRecord
      );
      if (!conditionsOk) {
        status = "skipped";
      } else {
        const actions = (wf.actions ?? []) as WorkflowAction[];
        for (const action of actions) {
          const ok = await executeAction(action, event, tenantId, actorId);
          if (ok) executed++;
        }
        triggered++;
      }
    } catch (err: any) {
      status = "failed";
      error = err?.message ?? "Unknown error";
    }

    await db.insert(workflowRuns).values({
      tenantId,
      workflowId: wf.id,
      eventType,
      entityKey: entityKey ?? null,
      recordId: event.record?.id ?? event.extra?.recordId ?? null,
      status,
      error,
      actionsExecuted: executed,
      durationMs: Date.now() - started,
      triggeredById: actorId,
    });

    await db.update(workflows)
      .set({
        runCount: wf.runCount + 1,
        lastRunAt: new Date(),
      })
      .where(eq(workflows.id, wf.id));
  }

  return { triggered, runs: matching.length };
}

export async function emitDomainEvent(
  eventType: WorkflowTriggerType,
  entityKey: string,
  record: Record<string, any>,
  opts: { tenantId: string; actorId?: string; previousRecord?: Record<string, any>; extra?: Record<string, any> }
) {
  try {
    await runWorkflowsForEvent({
      tenantId: opts.tenantId,
      actorId: opts.actorId,
      eventType,
      entityKey,
      record,
      previousRecord: opts.previousRecord,
      extra: opts.extra,
    });
  } catch (err) {
    console.error("[Workflows] Event dispatch failed:", err);
  }
}

export async function logWorkflowAudit(tenantId: string, actorId: string, action: string, workflowId: string, changes?: any) {
  try {
    await logAudit(tenantId, actorId, action, "WORKFLOW", workflowId, changes);
  } catch {}
}