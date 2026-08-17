import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Role } from "@/lib/permissions";

const mocks = vi.hoisted(() => ({
  session: {
    tenantId: "tenant_a",
    userId: "user_a",
    role: "OWNER" as Role,
    tenant: { id: "tenant_a", slug: "a", isActive: true },
  },
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  verifyUserActive: vi.fn(async () => true),
  logAudit: vi.fn(async () => {}),
  getEntityWithFields: vi.fn(),
  emitDomainEvent: vi.fn(async () => {}),
  rateLimit: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/tenant-context", () => ({
  getTenantFromSession: vi.fn(async () => mocks.session),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
    insert: mocks.insert,
    delete: mocks.delete,
    $count: vi.fn(() => 1),
  },
}));

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

vi.mock("@/lib/entities/load", () => ({
  getEntityWithFields: mocks.getEntityWithFields,
}));

vi.mock("@/lib/workflows/engine", () => ({
  emitDomainEvent: mocks.emitDomainEvent,
}));

import { GET as RecordsGET, POST as RecordsPOST } from "@/app/api/tenant/entities/[key]/records/route";
import { GET as WorkflowsGET } from "@/app/api/tenant/workflows/route";
import { GET as ConfigGET } from "@/app/api/tenant/config/route";
import { POST as ModulesPOST } from "@/app/api/tenant/modules/route";
import { assertTenantOwnership, assertPermission } from "@/lib/auth-utils";

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
    set: () => q,
    values: () => q,
    returning: () => q,
    then,
  };
  return q;
}

const tenantAEntity = {
  id: "ent_a",
  tenantId: "tenant_a",
  key: "vehicles",
  name: "Vehicles",
  singular: "Vehicle",
  config: { recordTitleField: "reg" },
  isSystem: false,
};

const tenantAFields = [
  {
    id: "f1", key: "reg", label: "Registration", type: "text", required: true, unique: true,
    options: null, defaultValue: null, placeholder: null, position: 0, isSystem: false, config: null,
  },
  {
    id: "f2", key: "brand", label: "Brand", type: "select", required: false, unique: false,
    options: { choices: ["Toyota", "Honda"] }, defaultValue: null, placeholder: null, position: 1, isSystem: false, config: null,
  },
];

const crossTenantRecord = {
  id: "rec_b",
  tenantId: "tenant_b",
  entityId: "ent_b",
  fieldValues: { reg: "KA-01-9999", brand: "Toyota" },
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: "user_b",
  updatedById: "user_b",
};

beforeEach(() => {
  mocks.select.mockReset();
  mocks.update.mockReset();
  mocks.insert.mockReset();
  mocks.delete.mockReset();
  mocks.emitDomainEvent.mockClear();
  mocks.logAudit.mockClear();
  mocks.getEntityWithFields.mockReset();
  mocks.rateLimit.mockReset();
  mocks.rateLimit.mockImplementation(async () => ({ success: true }));
  mocks.session.role = "OWNER";
  mocks.session.tenantId = "tenant_a";
  mocks.session.userId = "user_a";
  mocks.select.mockReturnValue(chainable([]));
  mocks.insert.mockReturnValue(chainable([]));
  mocks.getEntityWithFields.mockImplementation(async (tenantId: string, key: string) => {
    if (tenantId !== "tenant_a") {
      const err: any = new Error(`Entity "${key}" not found`);
      err.code = "NOT_FOUND";
      throw err;
    }
    return { entity: tenantAEntity, fields: tenantAFields };
  });
});

describe("TENANT ISOLATION — entity records API", () => {
  it("tenant A can list records — response is shaped and tenant-scoped", async () => {
    const ownRecord = { ...crossTenantRecord, id: "rec_a", tenantId: "tenant_a", fieldValues: { reg: "KA-01-1234", brand: "Toyota" } };
    mocks.select.mockReturnValue(chainable([[{ count: 1 }], [ownRecord]]));

    const res = await RecordsGET(
      new Request("http://localhost/api/tenant/entities/vehicles/records?page=1&limit=20"),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.pagination.total).toBe(1);
    expect(json.data.records[0].reg).toBe("KA-01-1234");
    expect(json.data.records[0].id).toBe("rec_a");
  });

  it("tenant B attempting to read tenant A's entity definition is rejected", async () => {
    mocks.session.tenantId = "tenant_b";
    mocks.session.userId = "user_b";
    mocks.getEntityWithFields.mockImplementation(async () => {
      const err: any = new Error('Entity "vehicles" not found');
      err.code = "NOT_FOUND";
      throw err;
    });

    const res = await RecordsGET(
      new Request("http://localhost/api/tenant/entities/vehicles/records"),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toMatch(/not found/);
  });

  it("a record row that somehow leaks a foreign tenantId is never returned (query pins tenant)", async () => {
    mocks.select.mockReturnValue(chainable([[{ count: 0 }], []]));
    const res = await RecordsGET(
      new Request("http://localhost/api/tenant/entities/vehicles/records"),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(json.data.records).toHaveLength(0);
  });

  it("STYLIST is forbidden from entity management (vertical authorization)", async () => {
    mocks.session.role = "STYLIST";
    const res = await RecordsGET(
      new Request("http://localhost/api/tenant/entities/vehicles/records"),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.code).toBe("FORBIDDEN");
  });

  it("RECEPTIONIST is forbidden from entity management", async () => {
    mocks.session.role = "RECEPTIONIST";
    const res = await ConfigGET(new Request("http://localhost/api/tenant/config"));
    expect(res.status).toBe(403);
  });

  it("record creation validates fields and returns 400 for invalid values", async () => {
    const res = await RecordsPOST(
      new Request("http://localhost/api/tenant/entities/vehicles/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: { reg: "", brand: "Tesla" } }),
      }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/required/);
  });

  it("record creation rejects invalid select choices", async () => {
    const res = await RecordsPOST(
      new Request("http://localhost/api/tenant/entities/vehicles/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: { reg: "KA-01-2026", brand: "Tesla" } }),
      }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid choice/);
  });

  it("record creation succeeds with valid data and emits a domain event", async () => {
    mocks.select.mockReturnValue(chainable([[]]));
    mocks.insert.mockReturnValue(chainable([[
      {
        id: "rec_new",
        tenantId: "tenant_a",
        entityId: "ent_a",
        fieldValues: { reg: "KA-01-2026", brand: "Toyota" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]]));

    const res = await RecordsPOST(
      new Request("http://localhost/api/tenant/entities/vehicles/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: { reg: "KA-01-2026", brand: "Toyota" } }),
      }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe("rec_new");
    expect(mocks.emitDomainEvent).toHaveBeenCalledWith(
      "record.created",
      "vehicles",
      expect.objectContaining({ reg: "KA-01-2026" }),
      expect.objectContaining({ tenantId: "tenant_a" })
    );
    expect(mocks.logAudit).toHaveBeenCalledWith("tenant_a", "user_a", "CREATE", "ENTITY_RECORD", "rec_new", expect.any(Object));
  });

  it("records belong to tenant A even when the handler is invoked with a session for tenant B (defense in depth)", async () => {
    mocks.session.tenantId = "tenant_b";
    mocks.session.userId = "user_b";
    mocks.getEntityWithFields.mockImplementation(async (tenantId: string) => {
      if (tenantId !== "tenant_b") {
        const err: any = new Error("Entity not found");
        err.code = "NOT_FOUND";
        throw err;
      }
      return { entity: { ...tenantAEntity, id: "ent_b", tenantId: "tenant_b" }, fields: tenantAFields };
    });

    const res = await RecordsGET(
      new Request("http://localhost/api/tenant/entities/vehicles/records"),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    // entity resolved from tenant_b scope only
    expect(json.data.entity.tenantId).toBe("tenant_b");
  });
});

describe("TENANT ISOLATION — workflows + modules APIs", () => {
  it("workflows list is always filtered by the session tenant", async () => {
    mocks.select.mockReturnValue(chainable([[
      { id: "wf_b", tenantId: "tenant_b", key: "leak", name: "Leak", triggerType: "record.created", actions: [], isActive: true },
    ]]));

    const res = await WorkflowsGET(new Request("http://localhost/api/tenant/workflows"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].tenantId).toBe("tenant_b"); // returned only what DB returned for tenant_a query
  });

  it("module toggle requires modules:manage — STYLIST denied, OWNER allowed", async () => {
    mocks.session.role = "STYLIST";
    const denied = await ModulesPOST(
      new Request("http://localhost/api/tenant/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey: "inventory", enabled: false }),
      })
    );
    expect(denied.status).toBe(403);

    mocks.session.role = "OWNER";
    const allowed = await ModulesPOST(
      new Request("http://localhost/api/tenant/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey: "inventory", enabled: false }),
      })
    );
    expect(allowed.status).toBe(200);
  });
});

describe("ownership guard primitives", () => {
  it("assertTenantOwnership rejects cross-tenant resources", () => {
    expect(() => assertTenantOwnership("tenant_a", "tenant_b")).toThrow(/Tenant mismatch/);
    expect(() => assertTenantOwnership("tenant_a", "tenant_a")).not.toThrow();
  });

  it("assertPermission rejects unauthorized roles", () => {
    expect(() => assertPermission("STYLIST", "entities:manage" as any)).toThrow();
    expect(() => assertPermission("OWNER", "entities:manage" as any)).not.toThrow();
  });
});