import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  session: {
    tenantId: "tenant_a",
    userId: "user_a",
    role: "OWNER",
    tenant: { id: "tenant_a", slug: "a", isActive: true },
  },
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    $count: vi.fn(() => 1),
  },
  retryWorkflowRun: vi.fn(),
  redeliverWebhook: vi.fn(),
  verifyUserActive: vi.fn(async () => true),
  logAudit: vi.fn(async () => {}),
  rateLimit: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/tenant-context", () => ({
  getTenantFromSession: vi.fn(async () => mocks.session),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: { limit: mocks.rateLimit },
}));

vi.mock("@/lib/auth-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-utils")>();
  return {
    ...actual,
    verifyUserActive: mocks.verifyUserActive,
    logAudit: mocks.logAudit,
  };
});

vi.mock("@/lib/workflows/engine", () => ({
  retryWorkflowRun: mocks.retryWorkflowRun,
  redeliverWebhook: mocks.redeliverWebhook,
}));

import { GET as listRuns } from "@/app/api/tenant/workflows/runs/route";
import { GET as getRun, POST as postRun } from "@/app/api/tenant/workflows/runs/[id]/route";
import { GET as listDeliveries } from "@/app/api/tenant/webhook-deliveries/route";
import { GET as getDelivery, POST as postDelivery } from "@/app/api/tenant/webhook-deliveries/[id]/route";
import { GET as listEndpoints, POST as createEndpoint } from "@/app/api/tenant/webhook-endpoints/route";
import { GET as getEndpoint, PUT as updateEndpoint, DELETE as deleteEndpoint } from "@/app/api/tenant/webhook-endpoints/[id]/route";

function chainable(results: any[]) {
  let i = 0;
  const then = (fn: any) =>
    Promise.resolve(results[Math.min(i++, results.length - 1)] ?? []).then(fn);
  const q: any = {
    from: () => q,
    where: () => q,
    leftJoin: () => q,
    limit: () => q,
    orderBy: () => q,
    offset: () => q,
    set: () => q,
    values: () => q,
    returning: () => q,
    then,
  };
  return q;
}

function rows(...data: any[]) {
  return chainable(data.map((d) => [d]));
}

let selectQueue: any[][] = [];

function enqueueSelect(...calls: any[][]) {
  selectQueue.push(...calls);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = {
    tenantId: "tenant_a",
    userId: "user_a",
    role: "OWNER",
    tenant: { id: "tenant_a", slug: "a", isActive: true },
  };
  mocks.db.$count.mockReturnValue(chainable([1]));
  selectQueue = [];
  mocks.db.select.mockImplementation(() => {
    const rowsArr = selectQueue.shift() ?? [];
    return chainable([rowsArr]);
  });
  mocks.db.insert.mockImplementation(() => rows());
  mocks.db.update.mockImplementation(() => rows());
  mocks.db.delete.mockImplementation(() => rows());
});

const runRow = {
  id: "run_1",
  tenantId: "tenant_a",
  workflowId: "wf_1",
  workflowName: "Notify",
  eventType: "record.created",
  entityKey: "vehicles",
  recordId: "rec_1",
  status: "failed",
  actionsExecuted: 1,
  input: { record: { id: "rec_1" } },
  output: [{ type: "send_notification", ok: false, message: "nope" }],
  error: "nope",
  durationMs: 42,
  createdAt: new Date("2026-08-18T10:00:00Z"),
};

function authContext(role: string, tenantId = "tenant_a", params: Record<string, string> = {}) {
  mocks.session = { ...mocks.session, role: role as any, tenantId };
  return { params: Promise.resolve(params) as any };
}

describe("workflow runs list", () => {
  it("returns runs for the tenant", async () => {
    enqueueSelect([{ count: 1 }], [{ ...runRow, workflowName: "Notify" }]);

    const res = await listRuns(new Request("http://localhost/api/tenant/workflows/runs"), await authContext("MANAGER", "tenant_a", { id: "run_1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.runs[0].workflowName).toBe("Notify");
    expect(json.data.runs[0].id).toBe("run_1");
    expect(json.data.pagination.total).toBe(1);
  });

  it("forwards status filter and tenant scoping", async () => {
    enqueueSelect([{ count: 1 }], [{ ...runRow }]);
    const res = await listRuns(
      new Request("http://localhost/api/tenant/workflows/runs?status=failed"),
      await authContext("MANAGER", "tenant_a", { id: "run_1" })
    );
    expect(res.status).toBe(200);
    const calls = mocks.db.select.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
  });

  it("denies receptionists", async () => {
    enqueueSelect([{ count: 1 }], [{ ...runRow }]);
    const res = await listRuns(new Request("http://localhost/api/tenant/workflows/runs"), await authContext("RECEPTIONIST"));
    expect(res.status).toBe(403);
  });
});

describe("workflow run detail", () => {
  it("returns detail for own tenant run", async () => {
    mocks.db.select.mockReturnValue(rows(runRow));
    const res = await getRun(new Request("http://localhost/api/tenant/workflows/runs/run_1"), await authContext("MANAGER", "tenant_a", { id: "run_1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.input.record.id).toBe("rec_1");
    expect(json.data.output.length).toBe(1);
  });

  it("404 for other tenants", async () => {
    mocks.db.select.mockReturnValue(rows());
    const res = await getRun(new Request("http://localhost/api/tenant/workflows/runs/run_1"), await authContext("MANAGER", "tenant_b", { id: "run_1" }));
    expect(res.status).toBe(404);
  });

  it("retries failed runs via engine", async () => {
    mocks.retryWorkflowRun.mockResolvedValue({ status: "retried", runId: "run_2", reason: "ok" });
    mocks.db.select.mockReturnValue(rows());
    const res = await postRun(new Request("http://localhost/api/tenant/workflows/runs/run_1", { method: "POST" }), await authContext("MANAGER", "tenant_a", { id: "run_1" }));
    expect(res.status).toBe(200);
    expect(mocks.retryWorkflowRun).toHaveBeenCalledWith("tenant_a", "run_1", "user_a");
    const json = await res.json();
    expect(json.data.runId).toBe("run_2");
  });

  it("403 for receptionists on retry", async () => {
    mocks.db.select.mockReturnValue(rows());
    const res = await postRun(new Request("http://localhost/api/tenant/workflows/runs/run_1", { method: "POST" }), await authContext("RECEPTIONIST", "tenant_a", { id: "run_1" }));
    expect(res.status).toBe(403);
    expect(mocks.retryWorkflowRun).not.toHaveBeenCalled();
  });
});

describe("webhook deliveries", () => {
  const delivery = {
    id: "del_1",
    tenantId: "tenant_a",
    endpointId: "ep_1",
    url: "https://example.com/hook",
    payload: { event: "record.created" },
    status: "failed",
    attempts: 2,
    statusCode: 500,
    responseBody: null,
    lastError: "HTTP 500",
    endpointName: "Slack alerts",
    createdAt: new Date("2026-08-18T10:00:00Z"),
  };

  it("lists deliveries with pagination", async () => {
    enqueueSelect([{ count: 7 }], [{ ...delivery, endpointName: "Slack alerts" }]);
    const res = await listDeliveries(new Request("http://localhost/api/tenant/webhook-deliveries"), await authContext("MANAGER", "tenant_a", { id: "run_1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.deliveries[0].endpointName).toBe("Slack alerts");
    expect(json.data.pagination.total).toBe(7);
  });

  it("denies receptionists", async () => {
    enqueueSelect([{ count: 1 }], [{ ...delivery, endpointName: "Slack alerts" }]);
    const res = await listDeliveries(new Request("http://localhost/api/tenant/webhook-deliveries"), await authContext("RECEPTIONIST"));
    expect(res.status).toBe(403);
  });

  it("redelivers via engine", async () => {
    mocks.redeliverWebhook.mockResolvedValue({ status: "delivered", reason: "200" });
    mocks.db.select.mockReturnValue(rows());
    const res = await postDelivery(new Request("http://localhost/api/tenant/webhook-deliveries/del_1", { method: "POST" }), await authContext("MANAGER", "tenant_a", { id: "del_1" }));
    expect(res.status).toBe(200);
    expect(mocks.redeliverWebhook).toHaveBeenCalledWith("tenant_a", "del_1");
  });
});

describe("webhook endpoints", () => {
  const endpoint = {
    id: "ep_1",
    tenantId: "tenant_a",
    name: "Slack alerts",
    url: "https://example.com/hook",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    secret: "s3cret",
    eventTypes: ["record.created"],
    isActive: true,
    successCount: 3,
    failureCount: 1,
    lastDeliveryAt: null,
  };

  it("lists endpoints with secrets masked", async () => {
    mocks.db.select.mockReturnValue(rows(endpoint));
    const res = await listEndpoints(new Request("http://localhost/api/tenant/webhook-endpoints"), await authContext("MANAGER", "tenant_a", { id: "run_1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.data[0];
    expect(data.secret).toBeUndefined();
    expect(data.hasSecret).toBe(true);
    expect(data.url).toBe("https://example.com/hook");
  });

  it("creates endpoints and masks the secret in the response", async () => {
    mocks.db.insert.mockReturnValue(chainable([[{ ...endpoint, secret: "created" }]]));
    mocks.db.select.mockReturnValue(rows());
    const res = await createEndpoint(
      new Request("http://localhost/api/tenant/webhook-endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Slack alerts",
          url: "https://example.com/hook",
          method: "POST",
          secret: "created",
          eventTypes: ["record.created"],
          isActive: true,
        }),
      }),
      await authContext("MANAGER", "tenant_a", { id: "run_1" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.hasSecret).toBe(true);
    expect(json.data.secret).toBeUndefined();
  });

  it("rejects invalid URLs", async () => {
    mocks.db.select.mockReturnValue(rows());
    const res = await createEndpoint(
      new Request("http://localhost/api/tenant/webhook-endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "x", url: "not-a-url" }),
      }),
      await authContext("MANAGER", "tenant_a", { id: "run_1" })
    );
    expect(res.status).toBe(400);
  });

  it("gets a single endpoint masked", async () => {
    mocks.db.select.mockReturnValue(rows(endpoint));
    const res = await getEndpoint(new Request("http://localhost/api/tenant/webhook-endpoints/ep_1"), await authContext("MANAGER", "tenant_a", { id: "ep_1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.hasSecret).toBe(true);
    expect(json.data.secret).toBeUndefined();
  });

  it("404 for other tenants", async () => {
    mocks.db.select.mockReturnValue(rows());
    const res = await getEndpoint(new Request("http://localhost/api/tenant/webhook-endpoints/ep_1"), await authContext("MANAGER", "tenant_b", { id: "ep_1" }));
    expect(res.status).toBe(404);
  });

  it("keeps existing secret when PUT omits it", async () => {
    mocks.db.select.mockReturnValue(chainable([[endpoint]]));
    mocks.db.update.mockReturnValue(chainable([[{ ...endpoint, name: "Renamed" }]]));
    mocks.db.insert.mockReturnValue(chainable([]));
    const res = await updateEndpoint(
      new Request("http://localhost/api/tenant/webhook-endpoints/ep_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed", url: "https://example.com/hook" }),
      }),
      await authContext("MANAGER", "tenant_a", { id: "ep_1" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("Renamed");
    expect(json.data.hasSecret).toBe(true);
    expect(json.data.secret).toBeUndefined();
  });

  it("clears secret with clearSecret flag", async () => {
    mocks.db.select.mockReturnValue(chainable([[endpoint]]));
    mocks.db.update.mockReturnValue(chainable([[{ ...endpoint, secret: null }]]));
    mocks.db.insert.mockReturnValue(chainable([]));
    const res = await updateEndpoint(
      new Request("http://localhost/api/tenant/webhook-endpoints/ep_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Slack alerts", url: "https://example.com/hook", clearSecret: true }),
      }),
      await authContext("MANAGER", "tenant_a", { id: "ep_1" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.hasSecret).toBe(false);
  });

  it("only owners can delete endpoints", async () => {
    mocks.db.select.mockReturnValue(rows(endpoint));
    mocks.db.delete.mockReturnValue(rows({ id: "ep_1" }));
    const res = await deleteEndpoint(new Request("http://localhost/api/tenant/webhook-endpoints/ep_1", { method: "DELETE" }), await authContext("MANAGER", "tenant_a", { id: "ep_1" }));
    expect(res.status).toBe(403);
  });

  it("owner deletes endpoints", async () => {
    mocks.db.select.mockReturnValue(rows(endpoint));
    mocks.db.delete.mockReturnValue(rows({ id: "ep_1" }));
    const res = await deleteEndpoint(new Request("http://localhost/api/tenant/webhook-endpoints/ep_1", { method: "DELETE" }), await authContext("OWNER", "tenant_a", { id: "ep_1" }));
    expect(res.status).toBe(200);
  });
});