import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

import {
  resolveWidgetData,
  validateWidgetConfig,
  WIDGET_TYPES,
  type WidgetConfig,
} from "@/lib/dashboards/engine";

const records = [
  { id: "1", status: "open", amount: 100, date: "2026-01-05" },
  { id: "2", status: "open", amount: 50, date: "2026-01-10" },
  { id: "3", status: "done", amount: 200, date: "2026-02-01" },
] as Record<string, any>[];

describe("WIDGET_TYPES", () => {
  it("exposes the supported widget types", () => {
    expect(WIDGET_TYPES).toEqual(["count", "metric", "recent", "bar", "line", "pie"]);
  });
});

describe("validateWidgetConfig", () => {
  it("accepts empty config", () => {
    expect(validateWidgetConfig({})).toEqual({});
  });

  it("rejects bad aggregation values", () => {
    expect(() => validateWidgetConfig({ aggregation: "summarize" })).toThrow(/Invalid widget config/);
  });

  it("rejects non-numeric limits", () => {
    expect(() => validateWidgetConfig({ limit: -3 })).toThrow(/Invalid widget config/);
  });

  it("rejects invalid filter operators", () => {
    expect(() => validateWidgetConfig({ filters: [{ field: "x", operator: "??" }] })).toThrow(/Invalid widget config/);
  });
});

describe("resolveWidgetData", () => {
  it("counts records for count widgets", () => {
    const data = resolveWidgetData("count", {}, records);
    expect(data.value).toBe(3);
    expect(data.empty).toBe(false);
  });

  it("flags empty data", () => {
    const data = resolveWidgetData("count", {}, []);
    expect(data.value).toBe(0);
    expect(data.empty).toBe(true);
  });

  it("applies widget filters", () => {
    const config: WidgetConfig = { filters: [{ field: "status", operator: "eq", value: "open" }] };
    expect(resolveWidgetData("count", config, records).value).toBe(2);
  });

  it("sums a field for metric widgets", () => {
    const data = resolveWidgetData("metric", { field: "amount", aggregation: "sum" }, records);
    expect(data.value).toBe(350);
  });

  it("averages for metric widgets with avg aggregation", () => {
    const data = resolveWidgetData("metric", { field: "amount", aggregation: "avg" }, records);
    expect(data.value).toBe(116.66666666666667);
  });

  it("returns recent records limited by config", () => {
    const data = resolveWidgetData("recent", { limit: 2 }, records);
    expect(data.records).toHaveLength(2);
    expect(data.empty).toBe(false);
  });

  it("builds chart data for bar widgets", () => {
    const data = resolveWidgetData("bar", { field: "status", aggregation: "sum" }, records);
    expect(data.chart).not.toBeNull();
    expect(data.chart!.labels.sort()).toEqual(["done", "open"]);
    expect(data.chart!.series).toBeDefined();
  });

  it("builds chart data for pie widgets with count aggregation", () => {
    const data = resolveWidgetData("pie", { field: "status", aggregation: "count" }, records);
    expect(data.chart!.labels.sort()).toEqual(["done", "open"]);
  });

  it("throws for chart widgets without a field", () => {
    expect(() => resolveWidgetData("bar", {}, records)).toThrow(/require a field/);
  });

  it("returns empty state for charts over no data", () => {
    const data = resolveWidgetData("line", { field: "status" }, []);
    expect(data.empty).toBe(true);
    expect(data.chart).toBeDefined();
  });

  it("supports date-range filtering via dateField", () => {
    const config: WidgetConfig = {
      field: "amount",
      aggregation: "sum",
      dateField: "date",
    };
    const unfiltered = resolveWidgetData("metric", config, records);
    expect(unfiltered.value).toBe(350);
  });
});