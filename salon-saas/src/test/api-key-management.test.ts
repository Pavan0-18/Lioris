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

import { GET as listKeys, POST as createKey } from "@/app/api/tenant/api-keys/route";
import { GET as getKey, PUT as updateKey, DELETE as deleteKey } from "@/app/api/tenant/api-keys/[id]/route";

function chainable(results: any[]) {
  let i = 0;
  const then = (fn: any) =>
    Promise.resolve(results[Math.min(i++, results.length - 1)] ?? []).then(fn);
  const q: any = {
    from: () => q,
    where: () => q,
    limit: () => q,
    orderBy: () => q,
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

const keyRow = {
  id: "key_1",
  tenantId: "tenant_a",
  name: "Zapier",
  prefix: "lior_prod_ab",
  keyHash: "abc123",
  scopes: ["customers:read"],
  environment: "production",
  expiresAt: null,
  lastUsedAt: null,
  revokedAt: null,
  createdAt: new Date("2026-08-01T00:00:00Z"),
};

function authContext(role: string, params: Record<string, string> = {}) {
  mocks.session = { ...mocks.session, role: role as any };
  return { params: Promise.resolve(params) as any };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = {
    tenantId: "tenant_a",
    userId: "user_a",
    role: "OWNER",
    tenant: { id: "tenant_a", slug: "a", isActive: true },
  };
  mocks.db.select.mockImplementation(() => rows());
  mocks.db.insert.mockImplementation(() => rows());
  mocks.db.update.mockImplementation(() => rows());
  mocks.db.delete.mockImplementation(() => rows());
});

describe("api key management", () => {
  it("lists keys without exposing hashes", async () => {
    const { keyHash: _kh, ...safeRow } = keyRow;
    mocks.db.select.mockImplementation(() => rows(safeRow));
    const res = await listKeys(new Request("http://localhost/api/tenant/api-keys"), await authContext("OWNER"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.keys[0].name).toBe("Zapier");
    expect(json.data.keys[0].keyHash).toBeUndefined();
  });

  it("creates a key and returns the full secret once", async () => {
    mocks.db.insert.mockImplementation(() => rows({ id: "key_2", name: "New", prefix: "lior_prod_xx", scopes: [], environment: "production", createdAt: new Date() }));
    const res = await createKey(
      new Request("http://localhost/api/tenant/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New", scopes: ["customers:read"] }),
      }),
      await authContext("OWNER")
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.key.startsWith("lior_prod_")).toBe(true);
    expect(json.data.keyHash).toBeUndefined();
  });

  it("rejects invalid scope names", async () => {
    const res = await createKey(
      new Request("http://localhost/api/tenant/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Bad", scopes: ["hack:all"] }),
      }),
      await authContext("OWNER")
    );
    expect(res.status).toBe(400);
  });

  it("denies receptionists", async () => {
    const res = await listKeys(new Request("http://localhost/api/tenant/api-keys"), await authContext("RECEPTIONIST"));
    expect(res.status).toBe(403);
  });

  it("gets a single key", async () => {
    mocks.db.select.mockImplementation(() => rows(keyRow));
    const res = await getKey(new Request("http://localhost/api/tenant/api-keys/key_1"), await authContext("OWNER", { id: "key_1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe("key_1");
    expect(json.data.keyHash).toBeUndefined();
  });

  it("404 for other tenants", async () => {
    mocks.db.select.mockImplementation(() => rows());
    const res = await getKey(new Request("http://localhost/api/tenant/api-keys/key_1"), await authContext("OWNER", { id: "key_1" }));
    expect(res.status).toBe(404);
  });

  it("updates key metadata", async () => {
    mocks.db.select.mockImplementation(() => rows(keyRow));
    mocks.db.update.mockImplementation(() => rows({ ...keyRow, name: "Renamed", scopes: ["customers:write"] }));
    const res = await updateKey(
      new Request("http://localhost/api/tenant/api-keys/key_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed", scopes: ["customers:write"] }),
      }),
      await authContext("OWNER", { id: "key_1" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("Renamed");
    expect(json.data.keyHash).toBeUndefined();
  });

  it("revokes keys via DELETE", async () => {
    mocks.db.select.mockImplementation(() => rows(keyRow));
    mocks.db.update.mockImplementation(() => rows({ ...keyRow, revokedAt: new Date() }));
    const res = await deleteKey(new Request("http://localhost/api/tenant/api-keys/key_1", { method: "DELETE" }), await authContext("OWNER", { id: "key_1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.revoked).toBe(true);
  });
});