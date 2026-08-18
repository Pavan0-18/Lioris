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

import { GET as FormsGET, POST as FormsPOST } from "@/app/api/tenant/entities/[key]/forms/route";
import { PUT as FormPUT, DELETE as FormDELETE } from "@/app/api/tenant/entities/[key]/forms/[id]/route";
import { GET as ViewsGET, POST as ViewsPOST } from "@/app/api/tenant/entities/[key]/views/route";
import { GET as DashboardsGET, POST as DashboardsPOST } from "@/app/api/tenant/dashboards/route";
import { POST as WidgetPOST } from "@/app/api/tenant/dashboards/[id]/widgets/route";
import { DELETE as DashboardDELETE } from "@/app/api/tenant/dashboards/[id]/route";
import { GET as ReportsGET, POST as ReportsPOST } from "@/app/api/tenant/reports/route";
import { DELETE as ReportDELETE } from "@/app/api/tenant/reports/[id]/route";
import { GET as ReportRunGET } from "@/app/api/tenant/reports/[id]/run/route";
import { GET as ScheduleGET, POST as SchedulePOST } from "@/app/api/tenant/schedule-rules/route";

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

function post(url: string, body: any) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.select.mockReset();
  mocks.update.mockReset();
  mocks.insert.mockReset();
  mocks.delete.mockReset();
  mocks.logAudit.mockClear();
  mocks.getEntityWithFields.mockReset();
  mocks.rateLimit.mockReset();
  mocks.rateLimit.mockImplementation(async () => ({ success: true }));
  mocks.session.role = "OWNER";
  mocks.session.tenantId = "tenant_a";
  mocks.session.userId = "user_a";
  mocks.select.mockReturnValue(chainable([]));
  mocks.insert.mockReturnValue(chainable([]));
  mocks.update.mockReturnValue(chainable([]));
  mocks.delete.mockReturnValue(chainable([]));
  mocks.getEntityWithFields.mockImplementation(async (tenantId: string, key: string) => {
    if (tenantId !== "tenant_a") {
      const err: any = new Error(`Entity "${key}" not found`);
      err.code = "NOT_FOUND";
      throw err;
    }
    return { entity: tenantAEntity, fields: tenantAFields };
  });
});

describe("PHASE 2 — forms API", () => {
  it("lists forms with entity metadata and fields", async () => {
    const form = { id: "form_1", tenantId: "tenant_a", entityId: "ent_a", name: "Intake", layout: { sections: [] }, isActive: true };
    mocks.select.mockReturnValue(chainable([{ then: (fn: any) => Promise.resolve([form]).then(fn) }]));
    const res = await FormsGET(new Request("http://localhost/api/tenant/entities/vehicles/forms"), {
      params: Promise.resolve({ key: "vehicles" }),
    } as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.forms).toHaveLength(1);
    expect(json.data.fields.map((f: any) => f.key)).toEqual(["reg", "brand"]);
  });

  it("creates a form with a valid layout", async () => {
    mocks.insert.mockReturnValue(chainable([[
      { id: "form_new", tenantId: "tenant_a", entityId: "ent_a", name: "Intake", isActive: true },
    ]]));
    const res = await FormsPOST(
      post("http://localhost/api/tenant/entities/vehicles/forms", {
        name: "Intake",
        layout: { sections: [{ id: "s1", title: "General", fields: [{ key: "reg" }] }] },
      }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe("form_new");
    expect(mocks.logAudit).toHaveBeenCalledWith("tenant_a", "user_a", "CREATE", "ENTITY_FORM", "form_new", expect.any(Object));
  });

  it("rejects duplicate field keys in a layout", async () => {
    const res = await FormsPOST(
      post("http://localhost/api/tenant/entities/vehicles/forms", {
        name: "Bad",
        layout: {
          sections: [
            { id: "s1", title: "A", fields: [{ key: "reg" }] },
            { id: "s2", title: "B", fields: [{ key: "reg" }] },
          ],
        },
      }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    expect(res.status).toBe(400);
  });

  it("rejects fields that do not exist on the entity", async () => {
    const res = await FormsPOST(
      post("http://localhost/api/tenant/entities/vehicles/forms", {
        name: "Bad",
        layout: { sections: [{ id: "s1", title: "A", fields: [{ key: "ghost" }] }] },
      }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/does not exist/);
  });

  it("denies form management to RECEPTIONIST", async () => {
    mocks.session.role = "RECEPTIONIST";
    const res = await FormsGET(new Request("http://localhost/api/tenant/entities/vehicles/forms"), {
      params: Promise.resolve({ key: "vehicles" }),
    } as any);
    expect(res.status).toBe(403);
  });

  it("scopes form updates to the owning entity", async () => {
    const ownForm = { id: "form_a", tenantId: "tenant_a", entityId: "ent_a", name: "Intake", layout: { sections: [] }, isActive: true };
    mocks.select.mockReturnValue(chainable([[ownForm]]));
    mocks.update.mockReturnValue(chainable([[{ ...ownForm, name: "Renamed" }]]));
    const res = await FormPUT(
      new Request("http://localhost/api/tenant/entities/vehicles/forms/form_a", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed" }),
      }),
      { params: Promise.resolve({ key: "vehicles", id: "form_a" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.name).toBe("Renamed");
  });

  it("returns 404 when updating a form from another tenant", async () => {
    mocks.select.mockReturnValue(chainable([[]]));
    const res = await FormPUT(
      new Request("http://localhost/api/tenant/entities/vehicles/forms/form_b", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      }),
      { params: Promise.resolve({ key: "vehicles", id: "form_b" }) } as any
    );
    expect(res.status).toBe(404);
  });

  it("only OWNER can delete forms", async () => {
    mocks.session.role = "MANAGER";
    mocks.select.mockReturnValue(chainable([[{ id: "form_a", tenantId: "tenant_a" }]]));
    const res = await FormDELETE(
      new Request("http://localhost/api/tenant/entities/vehicles/forms/form_a", { method: "DELETE" }),
      { params: Promise.resolve({ key: "vehicles", id: "form_a" }) } as any
    );
    expect(res.status).toBe(403);
  });
});

describe("PHASE 2 — views API", () => {
  it("creates a list view", async () => {
    mocks.insert.mockReturnValue(chainable([[
      { id: "view_1", tenantId: "tenant_a", entityId: "ent_a", name: "All", type: "list", isDefault: false },
    ]]));
    const res = await ViewsPOST(
      post("http://localhost/api/tenant/entities/vehicles/views", {
        name: "All",
        type: "list",
        config: { sortBy: "reg", sortDir: "asc" },
      }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe("view_1");
  });

  it("rejects kanban views without a group by field", async () => {
    const res = await ViewsPOST(
      post("http://localhost/api/tenant/entities/vehicles/views", { name: "Board", type: "kanban", config: {} }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/group by field/);
  });

  it("rejects calendar views without a calendar field", async () => {
    const res = await ViewsPOST(
      post("http://localhost/api/tenant/entities/vehicles/views", { name: "Cal", type: "calendar", config: {} }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    expect(res.status).toBe(400);
  });

  it("accepts a kanban view with a group by field", async () => {
    mocks.insert.mockReturnValue(chainable([[
      { id: "view_2", tenantId: "tenant_a", entityId: "ent_a", name: "Board", type: "kanban", isDefault: false },
    ]]));
    const res = await ViewsPOST(
      post("http://localhost/api/tenant/entities/vehicles/views", {
        name: "Board",
        type: "kanban",
        config: { groupByField: "brand" },
      }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    expect(res.status).toBe(200);
  });

  it("clears previous defaults when creating a default view", async () => {
    mocks.insert.mockReturnValue(chainable([[
      { id: "view_3", tenantId: "tenant_a", entityId: "ent_a", name: "Fav", type: "list", isDefault: true },
    ]]));
    const res = await ViewsPOST(
      post("http://localhost/api/tenant/entities/vehicles/views", { name: "Fav", type: "list", config: {}, isDefault: true }),
      { params: Promise.resolve({ key: "vehicles" }) } as any
    );
    expect(res.status).toBe(200);
    expect(mocks.update).toHaveBeenCalled();
  });

  it("lists views scoped to the tenant's entity", async () => {
    mocks.select.mockReturnValue(chainable([[
      { id: "view_a", tenantId: "tenant_a", entityId: "ent_a", name: "All", type: "list", config: {}, isDefault: true },
    ]]));
    const res = await ViewsGET(new Request("http://localhost/api/tenant/entities/vehicles/views"), {
      params: Promise.resolve({ key: "vehicles" }),
    } as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.views[0].tenantId).toBe("tenant_a");
  });

  it("allows RECEPTIONIST to manage views", async () => {
    mocks.session.role = "RECEPTIONIST";
    const res = await ViewsGET(new Request("http://localhost/api/tenant/entities/vehicles/views"), {
      params: Promise.resolve({ key: "vehicles" }),
    } as any);
    expect(res.status).toBe(200);
  });
});

describe("PHASE 2 — dashboards API", () => {
  it("creates a dashboard", async () => {
    mocks.insert.mockReturnValue(chainable([[
      { id: "dash_1", tenantId: "tenant_a", name: "Overview", isDefault: false },
    ]]));
    const res = await DashboardsPOST(
      post("http://localhost/api/tenant/dashboards", { name: "Overview" }),
      {} as any
    );
    expect(res.status).toBe(200);
  });

  it("lists dashboards", async () => {
    mocks.select.mockReturnValue(chainable([[
      { id: "dash_a", tenantId: "tenant_a", name: "Overview", isDefault: true },
    ]]));
    const res = await DashboardsGET(new Request("http://localhost/api/tenant/dashboards"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data[0].tenantId).toBe("tenant_a");
  });

  it("adds a widget only to an owned dashboard", async () => {
    mocks.select.mockReturnValue(chainable([[]]));
    const res = await WidgetPOST(
      post("http://localhost/api/tenant/dashboards/dash_b/widgets", {
        title: "Count",
        type: "count",
        config: {},
      }),
      { params: Promise.resolve({ id: "dash_b" }) } as any
    );
    expect(res.status).toBe(404);
  });

  it("adds a widget to an owned dashboard", async () => {
    mocks.select.mockReturnValue(chainable([[
      { id: "dash_a", tenantId: "tenant_a", name: "Overview", isDefault: true },
    ]]));
    mocks.insert.mockReturnValue(chainable([[
      { id: "widget_1", tenantId: "tenant_a", dashboardId: "dash_a", title: "Count", type: "count", config: {}, position: { x: 0, y: 0, w: 4, h: 3 } },
    ]]));
    const res = await WidgetPOST(
      post("http://localhost/api/tenant/dashboards/dash_a/widgets", { title: "Count", type: "count", config: {} }),
      { params: Promise.resolve({ id: "dash_a" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe("widget_1");
  });

  it("rejects invalid widget types", async () => {
    mocks.select.mockReturnValue(chainable([[
      { id: "dash_a", tenantId: "tenant_a", name: "Overview", isDefault: true },
    ]]));
    const res = await WidgetPOST(
      post("http://localhost/api/tenant/dashboards/dash_a/widgets", { title: "X", type: "thermometer", config: {} }),
      { params: Promise.resolve({ id: "dash_a" }) } as any
    );
    expect(res.status).toBe(400);
  });

  it("only OWNER can delete dashboards", async () => {
    mocks.session.role = "MANAGER";
    mocks.select.mockReturnValue(chainable([[
      { id: "dash_a", tenantId: "tenant_a", name: "Overview" },
    ]]));
    const res = await DashboardDELETE(
      new Request("http://localhost/api/tenant/dashboards/dash_a", { method: "DELETE" }),
      { params: Promise.resolve({ id: "dash_a" }) } as any
    );
    expect(res.status).toBe(403);
  });

  it("cannot delete a dashboard from another tenant", async () => {
    mocks.select.mockReturnValue(chainable([[]]));
    const res = await DashboardDELETE(
      new Request("http://localhost/api/tenant/dashboards/dash_b", { method: "DELETE" }),
      { params: Promise.resolve({ id: "dash_b" }) } as any
    );
    expect(res.status).toBe(404);
  });
});

describe("PHASE 2 — reports API", () => {
  it("creates a report", async () => {
    mocks.insert.mockReturnValue(chainable([[
      { id: "rep_1", tenantId: "tenant_a", entityId: "ent_a", name: "Revenue", isActive: true },
    ]]));
    const res = await ReportsPOST(
      post("http://localhost/api/tenant/reports", {
        name: "Revenue",
        entityKey: "vehicles",
        config: { metrics: [{ field: "reg", aggregation: "count" }] },
      }),
      {} as any
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe("rep_1");
  });

  it("rejects reports without metrics", async () => {
    const res = await ReportsPOST(
      post("http://localhost/api/tenant/reports", { name: "Empty", entityKey: "vehicles", config: {} }),
      {} as any
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/at least one metric/);
  });

  it("rejects reports for unknown entities", async () => {
    mocks.getEntityWithFields.mockImplementation(async () => {
      const err: any = new Error('Entity "ghost" not found');
      err.code = "NOT_FOUND";
      throw err;
    });
    const res = await ReportsPOST(
      post("http://localhost/api/tenant/reports", {
        name: "X",
        entityKey: "ghost",
        config: { metrics: [{ field: "reg", aggregation: "count" }] },
      }),
      {} as any
    );
    expect(res.status).toBe(404);
  });

  it("lists reports", async () => {
    mocks.select.mockReturnValue(chainable([[
      { id: "rep_a", tenantId: "tenant_a", entityId: "ent_a", name: "Revenue", isActive: true },
    ]]));
    const res = await ReportsGET(new Request("http://localhost/api/tenant/reports"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data[0].tenantId).toBe("tenant_a");
  });

  it("only OWNER can delete reports", async () => {
    mocks.session.role = "MANAGER";
    mocks.select.mockReturnValue(chainable([[
      { id: "rep_a", tenantId: "tenant_a", entityId: "ent_a", name: "Revenue" },
    ]]));
    const res = await ReportDELETE(
      new Request("http://localhost/api/tenant/reports/rep_a", { method: "DELETE" }),
      { params: Promise.resolve({ id: "rep_a" }) } as any
    );
    expect(res.status).toBe(403);
  });

  it("runs a report over tenant-owned records", async () => {
    mocks.select.mockReturnValue(chainable([
      { then: (fn: any) => Promise.resolve([{ id: "rep_a", tenantId: "tenant_a", entityId: "ent_a", name: "Revenue", isActive: true, config: { metrics: [{ field: "reg", aggregation: "count" }] } }]).then(fn) },
      { then: (fn: any) => Promise.resolve([{ id: "ent_a", tenantId: "tenant_a" }]).then(fn) },
      { then: (fn: any) => Promise.resolve(tenantAFields).then(fn) },
      { then: (fn: any) => Promise.resolve([
        { id: "rec1", tenantId: "tenant_a", entityId: "ent_a", fieldValues: { reg: "KA-01", brand: "Toyota" }, createdAt: new Date(), updatedAt: new Date() },
        { id: "rec2", tenantId: "tenant_a", entityId: "ent_a", fieldValues: { reg: "KA-02", brand: "Toyota" }, createdAt: new Date(), updatedAt: new Date() },
      ]).then(fn) },
    ]));
    const res = await ReportRunGET(
      new Request("http://localhost/api/tenant/reports/rep_a/run"),
      { params: Promise.resolve({ id: "rep_a" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.result.recordCount).toBe(2);
    expect(json.data.result.total).toEqual({ count_reg: 2 });
  });

  it("refuses to run an inactive report", async () => {
    mocks.select.mockReturnValue(chainable([
      { then: (fn: any) => Promise.resolve([{ id: "rep_a", tenantId: "tenant_a", entityId: "ent_a", name: "Off", isActive: false, config: {} }]).then(fn) },
    ]));
    const res = await ReportRunGET(
      new Request("http://localhost/api/tenant/reports/rep_a/run"),
      { params: Promise.resolve({ id: "rep_a" }) } as any
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/not active/);
  });

  it("returns 404 for reports from another tenant", async () => {
    mocks.select.mockReturnValue(chainable([{ then: (fn: any) => Promise.resolve([]).then(fn) }]));
    const res = await ReportRunGET(
      new Request("http://localhost/api/tenant/reports/rep_b/run"),
      { params: Promise.resolve({ id: "rep_b" }) } as any
    );
    expect(res.status).toBe(404);
  });
});

describe("PHASE 2 — schedule rules API", () => {
  it("creates a working-day rule", async () => {
    mocks.select.mockReturnValue(chainable([{ then: (fn: any) => Promise.resolve([{ id: "staff_1", tenantId: "tenant_a" }]).then(fn) }]));
    mocks.insert.mockReturnValue(chainable([[
      { id: "rule_1", tenantId: "tenant_a", staffId: "staff_1", dayOfWeek: 1, isWorking: true, startTime: "09:00", endTime: "17:00" },
    ]]));
    const res = await SchedulePOST(
      post("http://localhost/api/tenant/schedule-rules", {
        staffId: "staff_1",
        dayOfWeek: 1,
        isWorking: true,
        startTime: "09:00",
        endTime: "17:00",
        bufferMinutes: 15,
        maxConcurrent: 1,
      }),
      {} as any
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.id).toBe("rule_1");
  });

  it("rejects working days without times", async () => {
    const res = await SchedulePOST(
      post("http://localhost/api/tenant/schedule-rules", { staffId: "staff_1", dayOfWeek: 1, isWorking: true }),
      {} as any
    );
    expect(res.status).toBe(400);
  });

  it("rejects start time after end time", async () => {
    const res = await SchedulePOST(
      post("http://localhost/api/tenant/schedule-rules", {
        staffId: "staff_1",
        dayOfWeek: 1,
        isWorking: true,
        startTime: "18:00",
        endTime: "09:00",
      }),
      {} as any
    );
    expect(res.status).toBe(400);
  });

  it("rejects malformed times", async () => {
    const res = await SchedulePOST(
      post("http://localhost/api/tenant/schedule-rules", {
        staffId: "staff_1",
        dayOfWeek: 1,
        isWorking: true,
        startTime: "9am",
        endTime: "5pm",
      }),
      {} as any
    );
    expect(res.status).toBe(400);
  });

  it("rejects rules for staff from another tenant", async () => {
    mocks.select.mockReturnValue(chainable([{ then: (fn: any) => Promise.resolve([]).then(fn) }]));
    const res = await SchedulePOST(
      post("http://localhost/api/tenant/schedule-rules", {
        staffId: "staff_b",
        dayOfWeek: 1,
        isWorking: true,
        startTime: "09:00",
        endTime: "17:00",
      }),
      {} as any
    );
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toMatch(/not found in this workspace/);
  });

  it("allows day-off rules without times", async () => {
    mocks.select.mockReturnValue(chainable([{ then: (fn: any) => Promise.resolve([{ id: "staff_1", tenantId: "tenant_a" }]).then(fn) }]));
    mocks.insert.mockReturnValue(chainable([[
      { id: "rule_off", tenantId: "tenant_a", staffId: "staff_1", dayOfWeek: 0, isWorking: false },
    ]]));
    const res = await SchedulePOST(
      post("http://localhost/api/tenant/schedule-rules", { staffId: "staff_1", dayOfWeek: 0, isWorking: false }),
      {} as any
    );
    expect(res.status).toBe(200);
  });

  it("lists rules with day labels", async () => {
    mocks.select.mockReturnValue(chainable([[
      { id: "rule_1", tenantId: "tenant_a", staffId: "staff_1", dayOfWeek: 1, isWorking: true, startTime: "09:00", endTime: "17:00", bufferMinutes: 0, maxConcurrent: 1 },
    ]]));
    const res = await ScheduleGET(new Request("http://localhost/api/tenant/schedule-rules"));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data[0].dayLabel).toBe("Monday");
  });

  it("denies schedule management to STYLIST", async () => {
    mocks.session.role = "STYLIST";
    const res = await ScheduleGET(new Request("http://localhost/api/tenant/schedule-rules"));
    expect(res.status).toBe(403);
  });
});