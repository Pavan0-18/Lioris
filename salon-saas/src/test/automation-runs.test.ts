import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  sendEmail: vi.fn(),
  insertValues: [] as any[],
  updateValues: [] as any[],
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

import { runWorkflowsForEvent, retryWorkflowRun, redeliverWebhook } from "@/lib/workflows/engine";

function chainable(results: any[]) {
  let i = 0;
  const then = (onFulfilled?: any) => {
    const next = results[Math.min(i, results.length - 1)];
    i++;
    return Promise.resolve(next === undefined ? [] : next).then(onFulfilled);
  };
  const q: any = {
    from: () => q,
    where: () => q,
    limit: () => q,
    orderBy: () => q,
    offset: () => q,
    leftJoin: () => q,
    set: (v: any) => {
      mocks.updateValues.push(v);
      return q;
    },
    values: (v: any) => {
      mocks.insertValues.push(v);
      return q;
    },
    returning: () => q,
    then,
  };
  return q;
}

const activeWorkflow = {
  id: "wf_1",
  tenantId: "tenant_a",
  key: "notify",
  name: "Notify",
  entityKey: "vehicles",
  triggerType: "record.created",
  triggerConfig: null,
  conditions: null,
  actions: [{ type: "send_notification", config: {} }],
  isActive: true,
  runCount: 3,
};

beforeEach(() => {
  mocks.select.mockReset();
  mocks.update.mockReset();
  mocks.insert.mockReset();
  mocks.delete.mockReset();
  mocks.sendEmail.mockReset();
  mocks.insertValues.length = 0;
  mocks.updateValues.length = 0;
  mocks.select.mockReturnValue(chainable([]));
  mocks.update.mockImplementation(() => chainable([]));
  mocks.insert.mockImplementation(() => chainable([]));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runWorkflowsForEvent — recording", () => {
  const event = {
    tenantId: "tenant_a",
    actorId: "user_a",
    eventType: "record.created" as const,
    entityKey: "vehicles",
    record: { id: "rec_1", reg: "KA-01-1234" },
    extra: { recordId: "rec_1" },
  };

  it("records input snapshot and output steps on the run", async () => {
    mocks.select.mockReturnValue(chainable([[activeWorkflow]]));
    mocks.insert.mockReturnValue(chainable([[{ id: "run_1", status: "success" }]]));

    const result = await runWorkflowsForEvent(event);
    expect(result.triggered).toBe(1);
    expect(result.runIds).toEqual(["run_1"]);

    const runValues = mocks.insertValues.find((v: any) => v.workflowId === "wf_1");
    expect(runValues).toBeDefined();
    expect(runValues.status).toBe("success");
    expect(runValues.input).toEqual({
      record: { id: "rec_1", reg: "KA-01-1234" },
      previousRecord: null,
      extra: { recordId: "rec_1" },
    });
    expect(runValues.output).toEqual([{ type: "send_notification", ok: true }]);
    expect(runValues.actionsExecuted).toBe(1);
    expect(runValues.recordId).toBe("rec_1");

    expect(mocks.update).toHaveBeenCalled();
  });

  it("records failed output steps with messages", async () => {
    mocks.select.mockReturnValue(chainable([[
      {
        ...activeWorkflow,
        actions: [{ type: "webhook", config: { url: "ftp://bad-endpoint" } }],
      },
    ]]));
    mocks.insert.mockReturnValue(chainable([[{ id: "run_2" }]]));

    const result = await runWorkflowsForEvent(event);
    expect(result.triggered).toBe(0);
    const runValues = mocks.insertValues.find((v: any) => v.workflowId === "wf_1");
    expect(runValues.status).toBe("failed");
    expect(runValues.output[0].ok).toBe(false);
    expect(runValues.actionsExecuted).toBe(0);
  });

  it("marks runs as skipped when conditions fail", async () => {
    mocks.select.mockReturnValue(chainable([[
      {
        ...activeWorkflow,
        conditions: { all: [{ field: "reg", operator: "eq", value: "NOPE" }] },
      },
    ]]));
    mocks.insert.mockReturnValue(chainable([[{ id: "run_3" }]]));

    const result = await runWorkflowsForEvent(event);
    expect(result.triggered).toBe(0);
    const runValues = mocks.insertValues.find((v: any) => v.workflowId === "wf_1");
    expect(runValues.status).toBe("skipped");
    expect(runValues.output).toEqual([]);
  });

  it("filters by workflowId when retrying", async () => {
    mocks.select.mockReturnValue(chainable([[]]));
    await runWorkflowsForEvent(event, { workflowId: "wf_x" });
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });
});

describe("retryWorkflowRun", () => {
  it("returns not_found for unknown runs", async () => {
    mocks.select.mockReturnValue(chainable([[]]));
    const result = await retryWorkflowRun("tenant_a", "run_x");
    expect(result.status).toBe("not_found");
  });

  it("refuses to retry successful runs", async () => {
    mocks.select.mockReturnValue(chainable([[
      { id: "run_1", tenantId: "tenant_a", workflowId: "wf_1", eventType: "record.created", entityKey: "vehicles", status: "success", recordId: "rec_1", input: { record: null, previousRecord: null, extra: null } },
    ]]));
    const result = await retryWorkflowRun("tenant_a", "run_1");
    expect(result.status).toBe("not_retryable");
  });

  it("retries a failed run with its stored input", async () => {
    mocks.select.mockReturnValue(chainable([
      { then: (fn: any) => Promise.resolve([{ id: "run_1", tenantId: "tenant_a", workflowId: "wf_1", eventType: "record.created", entityKey: "vehicles", status: "failed", recordId: "rec_1", input: { record: { id: "rec_1", reg: "KA-01-1234" }, previousRecord: null, extra: { recordId: "rec_1" } } }]).then(fn) },
      { then: (fn: any) => Promise.resolve([activeWorkflow]).then(fn) },
    ]));
    mocks.insert.mockReturnValue(chainable([[{ id: "run_retried" }]]));

    const result = await retryWorkflowRun("tenant_a", "run_1", "user_b");
    expect(result.status).toBe("retried");
    expect(result.runId).toBe("run_retried");

    const runValues = mocks.insertValues.find((v: any) => v.workflowId === "wf_1");
    expect(runValues.input.record).toEqual({ id: "rec_1", reg: "KA-01-1234" });
    expect(runValues.triggeredById).toBe("user_b");
  });

  it("reports inactive workflows", async () => {
    mocks.select.mockReturnValue(chainable([
      { then: (fn: any) => Promise.resolve([{ id: "run_1", tenantId: "tenant_a", workflowId: "wf_1", eventType: "record.created", status: "failed", input: { record: null, previousRecord: null, extra: null } }]).then(fn) },
      { then: (fn: any) => Promise.resolve([[]]).then(fn) },
    ]));
    const result = await retryWorkflowRun("tenant_a", "run_1");
    expect(result.status).toBe("inactive");
  });
});

describe("redeliverWebhook", () => {
  const delivery = {
    id: "del_1",
    tenantId: "tenant_a",
    endpointId: "ep_1",
    url: "https://example.com/hook",
    payload: { event: "record.created", record: { id: "r1" } },
    status: "failed",
    attempts: 2,
    lastError: "HTTP 500",
  };

  it("returns not_found for unknown deliveries", async () => {
    mocks.select.mockReturnValue(chainable([[]]));
    const result = await redeliverWebhook("tenant_a", "del_x");
    expect(result.status).toBe("not_found");
  });

  it("rejects deliveries without a valid URL", async () => {
    mocks.select.mockReturnValue(chainable([[{ ...delivery, url: "ftp://bad" }]]));
    const result = await redeliverWebhook("tenant_a", "del_1");
    expect(result.status).toBe("invalid");
  });

  it("re-posts the stored payload and records the outcome", async () => {
    mocks.select.mockReturnValue(chainable([[delivery]]));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "{\"ok\":true}",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await redeliverWebhook("tenant_a", "del_1");
    expect(result.status).toBe("delivered");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/hook",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(delivery.payload),
      })
    );

    const updateValues = mocks.updateValues.find((v: any) => v.status === "delivered");
    expect(updateValues).toBeDefined();
    expect(updateValues.attempts).toBe(3);
    expect(updateValues.statusCode).toBe(200);
    expect(updateValues.responseBody).toBe('{"ok":true}');
    expect(updateValues.lastError).toBeNull();
  });

  it("records failures and schedules an exponential backoff retry", async () => {
    mocks.select.mockReturnValue(chainable([[delivery]]));
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "boom",
    })));

    const result = await redeliverWebhook("tenant_a", "del_1");
    expect(result.status).toBe("retrying");
    const updateValues = mocks.updateValues.find((v: any) => v.status === "retrying");
    expect(updateValues.attempts).toBe(3);
    expect(updateValues.statusCode).toBe(500);
    expect(updateValues.lastError).toMatch(/HTTP 500/);
    expect(updateValues.nextRetryAt).toBeInstanceOf(Date);

    const endpointUpdate = mocks.updateValues.find((v: any) => "failureCount" in v);
    expect(endpointUpdate?.lastDeliveryAt).toBeInstanceOf(Date);
  });

  it("dead-letters deliveries past the max attempts", async () => {
    mocks.select.mockReturnValue(chainable([[{ ...delivery, attempts: 4 }]]));
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "boom",
    })));

    const result = await redeliverWebhook("tenant_a", "del_1");
    expect(result.status).toBe("dead");
    const updateValues = mocks.updateValues.find((v: any) => v.status === "dead");
    expect(updateValues.lastError).toMatch(/Dead-lettered after 5 attempts/);
    expect(updateValues.nextRetryAt).toBeNull();
  });
});