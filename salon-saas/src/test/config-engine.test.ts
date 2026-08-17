import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateConfigValue, pruneVersions, MAX_CONFIG_VERSIONS } from "@/lib/config/engine";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
    insert: mocks.insert,
    delete: mocks.delete,
  },
}));

vi.mock("@/lib/auth-utils", () => ({
  logAudit: mocks.logAudit,
}));

import { setTenantConfig, getTenantConfig, rollbackConfig } from "@/lib/config/engine";

function makeChainable(results: any[]) {
  let i = 0;
  const then = (onFulfilled?: any) => {
    const next = results.length ? results[Math.min(i, results.length - 1)] : [];
    i++;
    return Promise.resolve(next).then(onFulfilled);
  };
  const q: any = {
    from: () => q,
    where: () => q,
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

function queueSelect(sequences: any[][]) {
  const queue = [...sequences];
  mocks.select.mockImplementation(() => makeChainable(queue.length ? queue.shift()! : []));
}

beforeEach(() => {
  mocks.select.mockReset();
  mocks.update.mockReset();
  mocks.insert.mockReset();
  mocks.delete.mockReset();
  mocks.logAudit.mockReset();
  mocks.select.mockImplementation(() => makeChainable([]));
  mocks.update.mockReturnValue(makeChainable([]));
  mocks.insert.mockReturnValue(makeChainable([]));
  mocks.delete.mockReturnValue(makeChainable([]));
});

describe("config validation", () => {
  it("accepts valid business.model", () => {
    expect(validateConfigValue("business.model", { type: "repair", tags: ["cars"] })).toEqual({
      type: "repair",
      tags: ["cars"],
    });
  });

  it("rejects invalid business.model", () => {
    expect(() => validateConfigValue("business.model", { type: 42 })).toThrow(/Invalid configuration/);
  });

  it("validates permissions.scopes shape", () => {
    const value = validateConfigValue("permissions.scopes", {
      "appointments:read": { STYLIST: "own" },
    });
    expect(value["appointments:read"].STYLIST).toBe("own");
    expect(() => validateConfigValue("permissions.scopes", { "x": { OWNER: "planet" } })).toThrow();
  });

  it("unknown keys must be JSON objects", () => {
    expect(validateConfigValue("custom.foo", { a: 1 })).toEqual({ a: 1 });
    expect(() => validateConfigValue("custom.foo", "string")).toThrow(/must be a JSON object/);
    expect(() => validateConfigValue("custom.foo", [1, 2])).toThrow(/must be a JSON object/);
  });
});

describe("config version pruning", () => {
  it("keeps newest versions within the limit", () => {
    const versions = Array.from({ length: 60 }, (_, i) => ({ version: i + 1 }));
    const pruned = pruneVersions(versions, 50);
    expect(pruned).toHaveLength(10);
    expect(pruned).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it("does not prune within the limit", () => {
    expect(pruneVersions([{ version: 1 }, { version: 2 }], MAX_CONFIG_VERSIONS)).toEqual([]);
  });
});

describe("setTenantConfig", () => {
  it("creates a new config with version 1 and writes history", async () => {
    queueSelect([[], []]);
    const result = await setTenantConfig("t1", "branding", { logoUrl: "x.png" }, "u1", "initial");

    expect(result.version).toBe(1);
    expect(result.value).toEqual({ logoUrl: "x.png" });
    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.logAudit).toHaveBeenCalledWith("t1", "u1", "UPDATE", "TENANT_CONFIG", "branding", expect.any(Object));
  });

  it("bumps version for existing configs", async () => {
    queueSelect([
      [[{ id: "c1", tenantId: "t1", key: "branding", value: { logoUrl: "a" }, version: 3 }]],
      [[{ version: 1 }, { version: 2 }, { version: 3 }]],
    ]);
    const result = await setTenantConfig("t1", "branding", { logoUrl: "b" }, "u1");

    expect(result.version).toBe(4);
    expect(mocks.update).toHaveBeenCalled();
  });

  it("throws on invalid value", async () => {
    await expect(setTenantConfig("t1", "business.model", { type: 5 }, "u1")).rejects.toThrow(/Invalid configuration/);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe("rollbackConfig", () => {
  it("restores a historical version as a new version", async () => {
    queueSelect([
      [[{ tenantId: "t1", key: "branding", value: { logoUrl: "old.png" }, version: 2 }]],
      [[{ id: "c1", tenantId: "t1", key: "branding", value: { logoUrl: "new.png" }, version: 5 }]],
      [[{ version: 1 }, { version: 2 }]],
    ]);
    const result = await rollbackConfig("t1", "branding", 2, "u1");
    expect(result.version).toBe(6);
    expect(result.value).toEqual({ logoUrl: "old.png" });
  });

  it("rejects unknown versions", async () => {
    queueSelect([[]]);
    await expect(rollbackConfig("t1", "branding", 99, "u1")).rejects.toThrow(/version 99 not found/);
  });
});

describe("getTenantConfig", () => {
  it("returns stored value when present", async () => {
    queueSelect([[[{ value: { type: "gym" }, version: 2 }]]]);
    const value = await getTenantConfig("t1", "business.model");
    expect(value).toEqual({ type: "gym" });
  });

  it("returns default when missing", async () => {
    queueSelect([[]]);
    const value = await getTenantConfig("t1", "business.model");
    expect(value.type).toBe("salon");
  });
});