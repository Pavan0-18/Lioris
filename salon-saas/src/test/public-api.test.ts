import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    $count: vi.fn(() => 1),
  },
  logAudit: vi.fn(async () => {}),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/redis", () => ({
  redis: { set: vi.fn(), get: vi.fn(), del: vi.fn(), eval: vi.fn(), pipeline: () => ({ exec: vi.fn() }) },
}));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
    constructor() {}
    async limit() {
      return { success: true, limit: 60, remaining: 59, reset: 0 };
    }
  },
}));
vi.mock("@/lib/auth-utils", () => ({
  logAudit: mocks.logAudit,
}));

import { GET as customersList, POST as customersCreate } from "@/app/api/v1/customers/route";
import { GET as customerGet, PUT as customerPut, DELETE as customerDelete } from "@/app/api/v1/customers/[id]/route";
import { POST as appointmentsCreate } from "@/app/api/v1/appointments/route";
import { GET as invoicesList } from "@/app/api/v1/invoices/route";
import { hashApiKey, generateApiKey, extractBearerToken, maskApiKey } from "@/lib/api-keys";
import { assertScope } from "@/lib/api-scopes";

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
    catch: () => q,
    then,
  };
  return q;
}

function rows(...data: any[]) {
  return chainable(data.map((d) => [d]));
}

const activeKey = {
  id: "key_1",
  tenantId: "tenant_a",
  name: "Zapier",
  prefix: "lior_prod_ab",
  keyHash: "hash",
  scopes: ["customers:read", "customers:write", "appointments:read", "appointments:write", "invoices:read"],
  environment: "production",
  expiresAt: null,
  revokedAt: null,
  createdAt: new Date("2026-08-01T00:00:00Z"),
};

const tenant = {
  id: "tenant_a",
  slug: "a",
  name: "Tenant A",
  isActive: true,
  planStatus: "active",
};

function bearerRequest(url: string, key: string = "lior_prod_abc", init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

let selectQueue: any[][] = [];

function enqueueSelect(...calls: any[][]) {
  selectQueue.push(...calls);
}

beforeEach(() => {
  vi.clearAllMocks();
  selectQueue = [];
  mocks.db.select.mockImplementation(() => {
    const rowsArr = selectQueue.shift() ?? [];
    return chainable([rowsArr]);
  });
  mocks.db.insert.mockImplementation(() => rows());
  mocks.db.update.mockImplementation(() => rows());
  mocks.db.delete.mockImplementation(() => rows());
});

function authFlow(extra: any[] = []) {
  enqueueSelect([activeKey], [tenant], extra);
}

describe("api-keys utils", () => {
  it("generates a prefixed key and hashes it", () => {
    const { key, prefix, keyHash } = generateApiKey("production");
    expect(key.startsWith("lior_prod_")).toBe(true);
    expect(prefix).toBe(key.slice(0, 18));
    expect(keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashApiKey(key)).toBe(keyHash);
  });

  it("generates test keys with the test prefix", () => {
    const { key } = generateApiKey("test");
    expect(key.startsWith("lior_test_")).toBe(true);
  });

  it("extracts bearer tokens", () => {
    const req = new Request("http://x", { headers: { Authorization: "Bearer abc123" } });
    expect(extractBearerToken(req)).toBe("abc123");
    const none = new Request("http://x");
    expect(extractBearerToken(none)).toBeNull();
    const basic = new Request("http://x", { headers: { Authorization: "Basic abc" } });
    expect(extractBearerToken(basic)).toBeNull();
  });

  it("masks keys by prefix", () => {
    expect(maskApiKey("lior_prod_ab")).toBe("lior_prod_ab...");
  });

  it("asserts scopes", () => {
    expect(() => assertScope(["customers:read"], "customers:read")).not.toThrow();
    expect(() => assertScope(["customers:read"], "invoices:write")).toThrow();
  });
});

describe("public API auth", () => {
  it("returns 401 without a bearer token", async () => {
    mocks.db.select.mockImplementation(() => chainable([[]]));
    const res = await customersList(new Request("http://localhost/api/v1/customers"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown keys", async () => {
    mocks.db.select.mockImplementation(() => chainable([[]]));
    const res = await customersList(bearerRequest("http://localhost/api/v1/customers"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for revoked keys", async () => {
    enqueueSelect([{ ...activeKey, revokedAt: new Date() }], [tenant]);
    const res = await customersList(bearerRequest("http://localhost/api/v1/customers"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for expired keys", async () => {
    enqueueSelect([{ ...activeKey, expiresAt: new Date("2020-01-01") }], [tenant]);
    const res = await customersList(bearerRequest("http://localhost/api/v1/customers"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for suspended tenants", async () => {
    enqueueSelect([activeKey], [{ ...tenant, isActive: false }]);
    const res = await customersList(bearerRequest("http://localhost/api/v1/customers"));
    expect(res.status).toBe(403);
  });
});

describe("public API scopes", () => {
  it("denies access when the key lacks the scope", async () => {
    enqueueSelect([{ ...activeKey, scopes: ["customers:read"] }], [tenant]);
    const res = await invoicesList(bearerRequest("http://localhost/api/v1/invoices"));
    expect(res.status).toBe(403);
  });

  it("allows access when the key has the scope", async () => {
    authFlow();
    const res = await invoicesList(bearerRequest("http://localhost/api/v1/invoices"));
    expect(res.status).toBe(200);
  });
});

describe("public API customers", () => {
  it("lists customers for the key tenant", async () => {
    const customer = { id: "c1", name: "Asha", phone: "9876543210" };
    authFlow([customer]);
    const res = await customersList(bearerRequest("http://localhost/api/v1/customers"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.customers[0].name).toBe("Asha");
    expect(json.data.customers[0].tenantId).toBeUndefined();
  });

  it("creates customers and records audit", async () => {
    authFlow();
    mocks.db.insert.mockImplementation(() => rows({ id: "c2", name: "Ravi", phone: "999", email: null, createdAt: new Date() }));
    const res = await customersCreate(
      bearerRequest("http://localhost/api/v1/customers", "lior_prod_abc", {
        method: "POST",
        body: JSON.stringify({ name: "Ravi", phone: "9999999999", email: "ravi@x.com" }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.customer.name).toBe("Ravi");
    expect(mocks.logAudit).toHaveBeenCalledWith("tenant_a", "api:key_1", "CREATE", "CUSTOMER", "c2", expect.anything());
  });

  it("rejects invalid customer bodies", async () => {
    authFlow();
    const res = await customersCreate(
      bearerRequest("http://localhost/api/v1/customers", "lior_prod_abc", {
        method: "POST",
        body: JSON.stringify({ phone: "123" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("404 for customers of other tenants", async () => {
    authFlow();
    const res = await customerGet(
      bearerRequest("http://localhost/api/v1/customers/c1", "lior_prod_abc", { method: "GET" }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    expect(res.status).toBe(404);
  });

  it("updates own customers", async () => {
    authFlow([{ id: "c1", name: "Asha", phone: "987" }]);
    mocks.db.update.mockImplementation(() => rows({ id: "c1", name: "Asha K", phone: "987", email: null }));
    const res = await customerPut(
      bearerRequest("http://localhost/api/v1/customers/c1", "lior_prod_abc", {
        method: "PUT",
        body: JSON.stringify({ name: "Asha K" }),
      }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.customer.name).toBe("Asha K");
  });

  it("deletes own customers", async () => {
    authFlow([{ id: "c1", name: "Asha" }]);
    const res = await customerDelete(
      bearerRequest("http://localhost/api/v1/customers/c1", "lior_prod_abc", { method: "DELETE" }),
      { params: Promise.resolve({ id: "c1" }) }
    );
    expect(res.status).toBe(200);
    expect(mocks.db.delete).toHaveBeenCalled();
  });
});

describe("public API idempotency", () => {
  it("replays the stored response for the same key and body", async () => {
    const customer = { id: "c3", name: "Maya", phone: "555", email: null, createdAt: new Date() };
    authFlow();
    mocks.db.insert.mockImplementation(() => rows(customer));

    const body = JSON.stringify({ name: "Maya", phone: "5555555555" });
    const first = await customersCreate(
      bearerRequest("http://localhost/api/v1/customers", "lior_prod_abc", {
        method: "POST",
        body,
        headers: { "Idempotency-Key": "req-1" },
      })
    );
    expect(first.status).toBe(200);
    const firstJson = await first.json();
    expect(firstJson.data.customer.id).toBe("c3");

    const stored = { key: "req-1", requestHash: createHash("sha256").update(body).digest("hex"), responseCode: 200, responseBody: { customer } };
    authFlow([stored]);
    const second = await customersCreate(
      bearerRequest("http://localhost/api/v1/customers", "lior_prod_abc", {
        method: "POST",
        body,
        headers: { "Idempotency-Key": "req-1" },
      })
    );
    expect(second.status).toBe(200);
    const secondJson = await second.json();
    expect(secondJson.data.customer.id).toBe("c3");
  });

  it("conflicts when the same key is reused with a different body", async () => {
    const stored = { key: "req-2", requestHash: "other-hash", responseCode: 200, responseBody: {} };
    authFlow([stored]);
    const res = await customersCreate(
      bearerRequest("http://localhost/api/v1/customers", "lior_prod_abc", {
        method: "POST",
        body: JSON.stringify({ name: "Maya", phone: "5555555555" }),
        headers: { "Idempotency-Key": "req-2" },
      })
    );
    expect(res.status).toBe(409);
  });
});

describe("public API appointments", () => {
  it("rejects appointments with invalid time ranges", async () => {
    authFlow([{ id: "c1", tenantId: "tenant_a" }]);
    const res = await appointmentsCreate(
      bearerRequest("http://localhost/api/v1/appointments", "lior_prod_abc", {
        method: "POST",
        body: JSON.stringify({
          customerId: "c1",
          branchId: "b1",
          startTime: "2026-09-01T10:00:00Z",
          endTime: "2026-09-01T09:00:00Z",
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates appointments with a valid window", async () => {
    authFlow([{ id: "c1", tenantId: "tenant_a" }]);
    mocks.db.insert.mockImplementation(() => rows({ id: "a1", status: "scheduled", tenantId: "tenant_a" }));
    const res = await appointmentsCreate(
      bearerRequest("http://localhost/api/v1/appointments", "lior_prod_abc", {
        method: "POST",
        body: JSON.stringify({
          customerId: "c1",
          branchId: "b1",
          startTime: "2026-09-01T10:00:00Z",
          endTime: "2026-09-01T11:00:00Z",
        }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.appointment.status).toBe("scheduled");
  });
});