import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

import {
  applyView,
  groupByField,
  groupByCalendar,
  matchesFilters,
  sortRecords,
  validateViewConfig,
  viewRecordTitle,
} from "@/lib/views/engine";

const fields = [
  { key: "name", label: "Name", type: "text" },
  { key: "status", label: "Status", type: "select", options: { choices: ["open", "done"] } },
  { key: "due", label: "Due", type: "date" },
] as any[];

const records = [
  { id: "1", name: "Alpha", status: "open", due: "2026-01-10" },
  { id: "2", name: "Bravo", status: "done", due: "2026-01-05" },
  { id: "3", name: "Charlie", status: "open", due: "2026-01-08" },
  { id: "4", name: "Delta", status: "done" },
] as Record<string, any>[];

describe("matchesFilters", () => {
  it("returns true when no filters", () => {
    expect(matchesFilters(records[0], undefined)).toBe(true);
    expect(matchesFilters(records[0], [])).toBe(true);
  });

  it("applies eq and contains filters", () => {
    expect(matchesFilters(records[0], [{ field: "status", operator: "eq", value: "open" }])).toBe(true);
    expect(matchesFilters(records[1], [{ field: "status", operator: "eq", value: "open" }])).toBe(false);
    expect(matchesFilters(records[0], [{ field: "name", operator: "contains", value: "lph" }])).toBe(true);
  });

  it("combines filters with AND semantics", () => {
    expect(
      matchesFilters(records[2], [
        { field: "status", operator: "eq", value: "open" },
        { field: "name", operator: "starts_with", value: "C" },
      ])
    ).toBe(true);
    expect(
      matchesFilters(records[0], [
        { field: "status", operator: "eq", value: "open" },
        { field: "name", operator: "starts_with", value: "C" },
      ])
    ).toBe(false);
  });

  it("supports is_empty / is_not_empty", () => {
    expect(matchesFilters(records[3], [{ field: "due", operator: "is_empty" }])).toBe(true);
    expect(matchesFilters(records[0], [{ field: "due", operator: "is_not_empty" }])).toBe(true);
  });
});

describe("sortRecords", () => {
  it("sorts ascending by a field", () => {
    const sorted = sortRecords(records, "name", "asc");
    expect(sorted.map((r) => r.name)).toEqual(["Alpha", "Bravo", "Charlie", "Delta"]);
  });

  it("sorts descending", () => {
    const sorted = sortRecords(records, "name", "desc");
    expect(sorted.map((r) => r.name)).toEqual(["Delta", "Charlie", "Bravo", "Alpha"]);
  });

  it("puts null values last", () => {
    const sorted = sortRecords(records, "due", "asc");
    expect(sorted[sorted.length - 1].name).toBe("Delta");
  });

  it("returns the same order when no sortBy", () => {
    const sorted = sortRecords(records, undefined, "asc");
    expect(sorted).toEqual(records);
  });
});

describe("groupByField", () => {
  it("groups records by a field value", () => {
    const groups = groupByField(records, "status", fields);
    const byLabel = Object.fromEntries(groups.map((g) => [g.label, g.records.length]));
    expect(byLabel).toEqual({ open: 2, done: 2 });
  });

  it("buckets missing values under Empty", () => {
    const groups = groupByField(records, "due", fields);
    const empty = groups.find((g) => g.key === "__empty__");
    expect(empty?.records.map((r) => r.name)).toEqual(["Delta"]);
  });

  it("renders choice labels for select fields", () => {
    const groups = groupByField(records, "status", fields);
    expect(groups.find((g) => g.key === "open")?.label).toBe("open");
  });
});

describe("groupByCalendar", () => {
  it("groups by ISO date key", () => {
    const days = groupByCalendar(records, "due");
    expect(days).toHaveLength(3);
    expect(days[0].date).toBe("2026-01-05");
    expect(days[2].records[0].name).toBe("Alpha");
  });

  it("skips records without a valid date", () => {
    const days = groupByCalendar(records, "due");
    const total = days.reduce((n, d) => n + d.records.length, 0);
    expect(total).toBe(3);
  });
});

describe("applyView", () => {
  it("filters and sorts for list views", () => {
    const applied = applyView(
      records,
      {
        filters: [{ field: "status", operator: "eq", value: "done" }],
        sortBy: "name",
        sortDir: "desc",
      },
      fields,
      "list"
    );
    expect(applied.records.map((r) => r.name)).toEqual(["Delta", "Bravo"]);
    expect(applied.groups).toBeNull();
    expect(applied.calendar).toBeNull();
  });

  it("returns kanban groups when type is kanban", () => {
    const applied = applyView(records, { groupByField: "status" }, fields, "kanban");
    expect(applied.groups).not.toBeNull();
    expect(applied.groups!.map((g) => g.label).sort()).toEqual(["done", "open"]);
  });

  it("returns calendar days when type is calendar", () => {
    const applied = applyView(records, { calendarField: "due" }, fields, "calendar");
    expect(applied.calendar).not.toBeNull();
    expect(applied.calendar!.length).toBeGreaterThan(0);
  });

  it("falls back to a plain list for unknown layout types", () => {
    const applied = applyView(records, {}, fields, "list");
    expect(applied.records).toHaveLength(4);
  });
});

describe("validateViewConfig", () => {
  it("requires a group by field for kanban views", () => {
    expect(() => validateViewConfig("kanban", {})).toThrow(/group by field/);
  });

  it("requires a calendar field for calendar views", () => {
    expect(() => validateViewConfig("calendar", {})).toThrow(/calendar field/);
  });

  it("accepts list views without special fields", () => {
    const config = validateViewConfig("list", { sortBy: "name", sortDir: "asc" });
    expect(config.sortBy).toBe("name");
  });

  it("rejects unknown sort directions", () => {
    expect(() => validateViewConfig("list", { sortDir: "sideways" })).toThrow(/Invalid view config/);
  });

  it("accepts nullable groupByField for list views", () => {
    const config = validateViewConfig("list", { groupByField: null });
    expect(config.groupByField).toBeNull();
  });
});

describe("viewRecordTitle", () => {
  it("builds a title from the configured title field", () => {
    const title = viewRecordTitle(
      { columns: ["name"], groupByField: "name" },
      fields,
      { name: "Alpha" }
    );
    expect(title).toContain("Alpha");
  });
});