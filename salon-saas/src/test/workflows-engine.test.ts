import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  evaluateConditions,
  evaluateCondition,
  shouldTrigger,
  applyTemplate,
  getNestedValue,
} from "@/lib/workflows/engine";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  sendEmail: vi.fn(),
  whereCalls: [] as string[],
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
    insert: mocks.insert,
    delete: mocks.delete,
  },
}));

vi.mock("@/lib/emails", () => ({
  sendEmail: mocks.sendEmail,
}));

import { runWorkflowsForEvent, emitDomainEvent } from "@/lib/workflows/engine";
import type { EventContext, WorkflowConditionGroup } from "@/lib/workflows/engine";

function extractWhere(cond: any): string[] {
  const out: string[] = [];
  const seen = new WeakSet<object>();
  const walk = (v: any) => {
    if (v === null) return;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out.push(String(v));
      return;
    }
    if (typeof v !== "object") return;
    if (seen.has(v)) return;
    seen.add(v);
    if (typeof v.name === "string") out.push("col:" + v.name);
    for (const child of Object.values(v)) walk(child);
  };
  walk(cond);
  return out;
}

function chainable(results: any[]) {
  let i = 0;
  const then = (onFulfilled?: any) => {
    const next = results[Math.min(i, results.length - 1)];
    i++;
    return Promise.resolve(next === undefined ? [] : next).then(onFulfilled);
  };
  const q: any = {
    from: () => q,
    where: (cond: any) => {
      mocks.whereCalls.push(...extractWhere(cond));
      return q;
    },
    limit: () => q,
    orderBy: () => q,
    offset: () => q,
    leftJoin: () => q,
    set: () => q,
    values: () => q,
    returning: () => q,
    then,
  };
  return q;
}

beforeEach(() => {
  mocks.select.mockReset();
  mocks.update.mockReset();
  mocks.insert.mockReset();
  mocks.delete.mockReset();
  mocks.sendEmail.mockReset();
  mocks.whereCalls.length = 0;
  mocks.select.mockReturnValue(chainable([]));
  mocks.update.mockReturnValue(chainable([]));
  mocks.insert.mockReturnValue(chainable([]));
});

describe("template interpolation", () => {
  it("replaces record and extra values", () => {
    const record = { customerName: "Pavan", total: 1500 };
    const out = applyTemplate("Hi {{customerName}}, total {{total}} ({{currency}})", record, { currency: "INR" });
    expect(out).toBe("Hi Pavan, total 1500 (INR)");
  });

  it("leaves unknown tokens empty", () => {
    expect(applyTemplate("{{missing}} here", { a: 1 })).toBe(" here");
  });

  it("supports nested paths", () => {
    expect(applyTemplate("{{customer.name}}", { customer: { name: "A" } })).toBe("A");
  });
});

describe("condition evaluation", () => {
  const record = { status: "completed", total: 50000, tags: ["vip"], name: "Alpha Salon" };

  it("evaluates comparison operators", () => {
    expect(evaluateCondition({ field: "status", operator: "eq", value: "completed" }, record, undefined)).toBe(true);
    expect(evaluateCondition({ field: "status", operator: "neq", value: "cancelled" }, record, undefined)).toBe(true);
    expect(evaluateCondition({ field: "total", operator: "gt", value: 10000 }, record, undefined)).toBe(true);
    expect(evaluateCondition({ field: "total", operator: "lt", value: 10000 }, record, undefined)).toBe(false);
    expect(evaluateCondition({ field: "total", operator: "gte", value: 50000 }, record, undefined)).toBe(true);
  });

  it("evaluates string operators", () => {
    expect(evaluateCondition({ field: "name", operator: "contains", value: "Salon" }, record, undefined)).toBe(true);
    expect(evaluateCondition({ field: "name", operator: "starts_with", value: "Alpha" }, record, undefined)).toBe(true);
    expect(evaluateCondition({ field: "name", operator: "ends_with", value: "Salon" }, record, undefined)).toBe(true);
  });

  it("evaluates array operators", () => {
    const rec = { tier: "vip", tags: ["vip"] };
    expect(evaluateCondition({ field: "tier", operator: "in", value: ["vip", "gold"] }, rec, undefined)).toBe(true);
    expect(evaluateCondition({ field: "tier", operator: "in", value: ["basic"] }, rec, undefined)).toBe(false);
    expect(evaluateCondition({ field: "tier", operator: "not_in", value: ["basic"] }, rec, undefined)).toBe(true);
  });

  it("evaluates emptiness", () => {
    expect(evaluateCondition({ field: "phone", operator: "is_empty" }, record, undefined)).toBe(true);
    expect(evaluateCondition({ field: "name", operator: "is_not_empty" }, record, undefined)).toBe(true);
  });

  it("evaluates change operators against previous record", () => {
    const prev = { status: "confirmed" };
    expect(evaluateCondition({ field: "status", operator: "changed" }, record, prev)).toBe(true);
    expect(evaluateCondition({ field: "status", operator: "changed_to", value: "completed" }, record, prev)).toBe(true);
    expect(evaluateCondition({ field: "status", operator: "changed_from", value: "confirmed" }, record, prev)).toBe(true);
    expect(evaluateCondition({ field: "status", operator: "changed_to", value: "cancelled" }, record, prev)).toBe(false);
  });

  it("combines all/any groups", () => {
    const group: WorkflowConditionGroup = {
      all: [
        { field: "status", operator: "eq", value: "completed" },
        { field: "total", operator: "gt", value: 10000 },
      ],
    };
    expect(evaluateConditions(group, record, undefined)).toBe(true);

    const bad: WorkflowConditionGroup = { all: [{ field: "status", operator: "eq", value: "cancelled" }] };
    expect(evaluateConditions(bad, record, undefined)).toBe(false);

    const anyGroup: WorkflowConditionGroup = {
      any: [
        { field: "status", operator: "eq", value: "cancelled" },
        { field: "total", operator: "gte", value: 50000 },
      ],
    };
    expect(evaluateConditions(anyGroup, record, undefined)).toBe(true);

    expect(evaluateConditions(null, record, undefined)).toBe(true);
    expect(evaluateConditions(undefined, record, undefined)).toBe(true);
  });
});

describe("trigger matching", () => {
  const base: EventContext = {
    tenantId: "t1",
    eventType: "status.changed",
    entityKey: "appointment",
    record: { id: "a1", status: "completed" },
    previousRecord: { id: "a1", status: "confirmed" },
  };

  it("matches event type only", () => {
    expect(shouldTrigger("status.changed", null, base)).toBe(true);
    expect(shouldTrigger("record.created", null, base)).toBe(false);
  });

  it("respects from/to filters on status changes", () => {
    expect(shouldTrigger("status.changed", { from: "confirmed", to: "completed" }, base)).toBe(true);
    expect(shouldTrigger("status.changed", { from: "scheduled" }, base)).toBe(false);
    expect(shouldTrigger("status.changed", { to: "cancelled" }, base)).toBe(false);
  });

  it("does not fire when status is unchanged", () => {
    const same = { ...base, previousRecord: { id: "a1", status: "completed" } };
    expect(shouldTrigger("status.changed", null, same)).toBe(false);
  });

  it("record.updated respects field filters", () => {
    const event: EventContext = {
      tenantId: "t1",
      eventType: "record.updated",
      record: { priority: "high" },
      previousRecord: { priority: "low" },
    };
    expect(shouldTrigger("record.updated", { fields: ["priority"] }, event)).toBe(true);
    expect(shouldTrigger("record.updated", { fields: ["status"] }, event)).toBe(false);
  });
});

describe("runWorkflowsForEvent — tenant isolation and dispatch", () => {
  const tenantAWorkflow = {
    id: "wf_a",
    tenantId: "t1",
    key: "notify_owner",
    name: "Notify owner",
    entityKey: "appointment",
    triggerType: "status.changed",
    triggerConfig: { to: "completed" },
    conditions: null,
    actions: [{ type: "send_notification", config: { title: "Done", message: "Appointment {{id}} completed", roles: ["OWNER"] } }],
    isActive: true,
    version: 1,
    runCount: 0,
    lastRunAt: null,
  };
  const tenantBWorkflow = { ...tenantAWorkflow, id: "wf_b", tenantId: "t2" };

  it("always filters workflow queries by the actor's tenant", async () => {
    mocks.select.mockReturnValue(chainable([[tenantBWorkflow]]));

    const event: EventContext = {
      tenantId: "t1",
      actorId: "u1",
      eventType: "status.changed",
      entityKey: "appointment",
      record: { id: "a1", status: "completed" },
      previousRecord: { id: "a1", status: "confirmed" },
    };

    await runWorkflowsForEvent(event);

    // the where clause must pin tenant_id to t1 — a tenant B workflow can never leak in
    const whereJson = mocks.whereCalls.join(" ");
    expect(whereJson).toContain("col:tenant_id");
    expect(whereJson).toContain("t1");
  });

  it("does not execute when the DB returns nothing for the tenant", async () => {
    mocks.select.mockReturnValue(chainable([[]]));
    const event: EventContext = {
      tenantId: "t1",
      eventType: "status.changed",
      entityKey: "appointment",
      record: { id: "a1", status: "completed" },
      previousRecord: { id: "a1", status: "confirmed" },
    };
    const result = await runWorkflowsForEvent(event);
    expect(result.runs).toBe(0);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("executes matching active workflows for the correct tenant", async () => {
    mocks.select.mockReturnValue(chainable([[tenantAWorkflow]]));
    mocks.insert.mockReturnValue(chainable([]));

    const event: EventContext = {
      tenantId: "t1",
      actorId: "u1",
      eventType: "status.changed",
      entityKey: "appointment",
      record: { id: "a1", status: "completed" },
      previousRecord: { id: "a1", status: "confirmed" },
    };

    const result = await runWorkflowsForEvent(event);
    expect(result.triggered).toBe(1);
    expect(mocks.insert).toHaveBeenCalled();
  });

  it("skips workflows whose conditions fail", async () => {
    const conditional = {
      ...tenantAWorkflow,
      conditions: { all: [{ field: "status", operator: "eq", value: "cancelled" }] },
    };
    mocks.select.mockReturnValue(chainable([[conditional]]));
    mocks.insert.mockReturnValue(chainable([]));

    const event: EventContext = {
      tenantId: "t1",
      eventType: "status.changed",
      entityKey: "appointment",
      record: { id: "a1", status: "completed" },
      previousRecord: { id: "a1", status: "confirmed" },
    };

    const result = await runWorkflowsForEvent(event);
    expect(result.triggered).toBe(0);
    expect(mocks.insert).toHaveBeenCalled(); // run row still recorded as skipped
  });

  it("never throws to the caller even when actions fail", async () => {
    const failing = {
      ...tenantAWorkflow,
      entityKey: null,
      triggerType: "record.created",
      actions: [{ type: "create_record", config: { entityKey: "tasks", values: {} } }],
    };
    mocks.select.mockReturnValue(chainable([[failing], []]));
    mocks.insert.mockReturnValue(chainable([[], []]));

    const event: EventContext = {
      tenantId: "t1",
      eventType: "record.created",
      entityKey: "tasks",
      record: { id: "r1" },
    };

    const result = await runWorkflowsForEvent(event);
    expect(result.runs).toBe(1);
    expect(result.triggered).toBe(0);
  });

  it("emitDomainEvent swallows dispatch errors", async () => {
    mocks.select.mockImplementation(() => { throw new Error("db down"); });
    await expect(emitDomainEvent("record.created", "x", {}, { tenantId: "t1" })).resolves.toBeUndefined();
  });
});

describe("getNestedValue", () => {
  it("walks dot paths safely", () => {
    expect(getNestedValue({ a: { b: { c: 1 } } }, "a.b.c")).toBe(1);
    expect(getNestedValue({ a: 1 }, "a.b.c")).toBeUndefined();
    expect(getNestedValue(undefined, "a")).toBeUndefined();
  });
});