import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  logAudit: vi.fn(async () => {}),
  emitDomainEvent: vi.fn(async () => {}),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/auth-utils", () => ({ logAudit: mocks.logAudit }));
vi.mock("@/lib/workflows/engine", () => ({ emitDomainEvent: mocks.emitDomainEvent }));

import { exportEntityCsv, importEntityCsv, parseCsv, toCsv } from "@/lib/import-export";

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

const entity = {
  id: "ent_1",
  tenantId: "tenant_a",
  key: "vehicles",
  name: "Vehicles",
  singular: "Vehicle",
  config: { titleField: "reg" },
};

const fields = [
  { id: "f1", key: "reg", label: "Registration", type: "text" as const, required: true, unique: true, options: null, defaultValue: null, placeholder: null, position: 1, isSystem: false, config: null },
  { id: "f2", key: "price", label: "Price", type: "currency" as const, required: false, unique: false, options: null, defaultValue: null, placeholder: null, position: 2, isSystem: false, config: null },
  { id: "f3", key: "sold", label: "Sold", type: "boolean" as const, required: false, unique: false, options: null, defaultValue: null, placeholder: null, position: 3, isSystem: false, config: null },
  { id: "f4", key: "tags", label: "Tags", type: "multiselect" as const, required: false, unique: false, options: { choices: ["new", "used", "demo"] }, defaultValue: null, placeholder: null, position: 4, isSystem: false, config: null },
];

const record = {
  id: "rec_1",
  tenantId: "tenant_a",
  entityId: "ent_1",
  fieldValues: { reg: "KA-01-1234", price: 250000, sold: true, tags: ["new"] },
  createdAt: new Date("2026-08-01T00:00:00Z"),
  updatedAt: new Date("2026-08-01T00:00:00Z"),
  createdById: "user_a",
  updatedById: "user_a",
};

let selectQueue: any[][] = [];
const insertValues: any[] = [];

function insertChainable(returned: any[]) {
  const base = chainable([returned]);
  const origValues = base.values.bind(base);
  base.values = (v: any) => {
    insertValues.push(v);
    return origValues(v);
  };
  return base;
}

beforeEach(() => {
  vi.clearAllMocks();
  insertValues.length = 0;
  selectQueue = [];
  mocks.db.select.mockImplementation(() => {
    const rowsArr = selectQueue.shift() ?? [];
    return chainable([rowsArr]);
  });
  mocks.db.insert.mockImplementation(() =>
    insertChainable([{ id: "rec_new", tenantId: "tenant_a", entityId: "ent_1", fieldValues: {} }])
  );
});

function entityFlow(extra: any[][] = []) {
  selectQueue.push([entity], fields, ...extra);
}

describe("csv helpers", () => {
  it("escapes commas, quotes and newlines", () => {
    const csv = toCsv([{ a: 'va,lue', b: 'say "hi"', c: "line\nbreak" }], [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
      { key: "c", label: "C" },
    ]);
    expect(csv).toContain('"va,lue"');
    expect(csv).toContain('"say ""hi"""');
    expect(csv).toContain('"line\nbreak"');
  });

  it("round-trips through parseCsv", () => {
    const csv = 'Name,Note\r\n"Smith, John","said ""hi"""\r\nDoe,plain';
    const parsed = parseCsv(csv);
    expect(parsed).toEqual([
      ["Name", "Note"],
      ["Smith, John", 'said "hi"'],
      ["Doe", "plain"],
    ]);
  });

  it("skips blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("exportEntityCsv", () => {
  it("builds a CSV with field labels as headers", async () => {
    entityFlow([[record]]);
    const { csv, count } = await exportEntityCsv("tenant_a", "vehicles");
    expect(count).toBe(1);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("id,Registration,Price,Sold,Tags,createdAt");
    expect(lines[1]).toContain("KA-01-1234");
    expect(lines[1]).toContain("250000");
    expect(lines[1]).toContain("true");
  });
});

describe("importEntityCsv", () => {
  it("imports valid rows and reports failures with row numbers", async () => {
    entityFlow([[], [{ id: "dup", tenantId: "tenant_a", entityId: "ent_1" }]]);
    const csv = [
      "Registration,Price,Sold,Tags",
      "KA-02-5678,300000,yes,new|demo",
      "KA-03-9999,not-a-number,yes,new",
      "KA-02-5678,100,no,used",
    ].join("\n");

    const result = await importEntityCsv("tenant_a", "user_a", "vehicles", csv);
    expect(result.imported).toBe(1);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].row).toBe(3);
    expect(result.errors[0].message).toMatch(/must be a number/);
    expect(result.errors[1].row).toBe(4);
    expect(result.errors[1].message).toMatch(/must be unique/);

    expect(insertValues).toHaveLength(1);
    const firstValues = insertValues[0];
    expect(firstValues.fieldValues.reg).toBe("KA-02-5678");
    expect(firstValues.fieldValues.price).toBe(300000);
    expect(firstValues.fieldValues.sold).toBe(true);
    expect(firstValues.fieldValues.tags).toEqual(["new", "demo"]);

    expect(mocks.emitDomainEvent).toHaveBeenCalled();
    expect(mocks.logAudit).toHaveBeenCalledWith("tenant_a", "user_a", "IMPORT", "ENTITY_RECORD", "ent_1", expect.objectContaining({ imported: 1, failed: 2 }));
  });

  it("rejects empty CSVs", async () => {
    entityFlow();
    await expect(importEntityCsv("tenant_a", "user_a", "vehicles", "")).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("matches columns by header label case-insensitively", async () => {
    entityFlow([[]]);
    const csv = ["registration,PRICE", "KA-04-0001,150000"].join("\n");
    const result = await importEntityCsv("tenant_a", "user_a", "vehicles", csv);
    expect(result.imported).toBe(1);
    expect(insertValues[0].fieldValues.reg).toBe("KA-04-0001");
    expect(insertValues[0].fieldValues.price).toBe(150000);
  });

  it("applies missing required fields as row errors", async () => {
    entityFlow();
    const csv = ["Price,Sold", "100,yes"].join("\n");
    const result = await importEntityCsv("tenant_a", "user_a", "vehicles", csv);
    expect(result.imported).toBe(0);
    expect(result.errors[0].message).toMatch(/Registration is required/);
  });
});