import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

import {
  runReport,
  aggregateValues,
  filterRecords,
  inDateRange,
  toNumber,
  validateReportConfig,
  chartDataFromResult,
  metricValue,
  type ReportConfig,
} from "@/lib/reports/engine";

const records = [
  { id: "1", status: "open", amount: 100, date: "2026-01-05" },
  { id: "2", status: "open", amount: 50, date: "2026-01-10" },
  { id: "3", status: "done", amount: 200, date: "2026-02-01" },
  { id: "4", status: "done", amount: 30, date: "2026-02-15" },
  { id: "5", status: "open", date: "2026-03-01" },
] as Record<string, any>[];

describe("toNumber", () => {
  it("converts numeric strings", () => {
    expect(toNumber("42.5")).toBe(42.5);
  });
  it("returns null for non-numeric and empty values", () => {
    expect(toNumber("abc")).toBeNull();
    expect(toNumber("")).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
  });
});

describe("aggregateValues", () => {
  const values = [10, 20, 30, "40", null, undefined];
  it("counts all rows", () => expect(aggregateValues(values, "count")).toBe(6));
  it("sums numeric values only", () => expect(aggregateValues(values, "sum")).toBe(100));
  it("averages numeric values only", () => expect(aggregateValues(values, "avg")).toBe(25));
  it("computes min and max", () => {
    expect(aggregateValues(values, "min")).toBe(10);
    expect(aggregateValues(values, "max")).toBe(40);
  });
});

describe("filterRecords", () => {
  it("keeps everything without filters or range", () => {
    expect(filterRecords(records, undefined, undefined)).toHaveLength(5);
  });

  it("applies condition filters", () => {
    const filtered = filterRecords(records, [{ field: "status", operator: "eq", value: "done" }], undefined);
    expect(filtered).toHaveLength(2);
  });

  it("applies date range bounds", () => {
    const range = { field: "date", from: "2026-01-01", to: "2026-01-31" };
    const filtered = filterRecords(records, undefined, range);
    expect(filtered.map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("ignores invalid dates in range checks", () => {
    const range = { field: "date", from: "2026-01-01", to: "2026-01-31" };
    const withBad = [...records, { id: "6", date: "garbage" }];
    expect(filterRecords(withBad, undefined, range)).toHaveLength(3);
  });
});

describe("inDateRange", () => {
  it("returns true when no range configured", () => {
    expect(inDateRange("2026-05-01", undefined)).toBe(true);
  });
  it("respects from/to", () => {
    const range = { field: "date", from: "2026-01-01", to: "2026-01-31" };
    expect(inDateRange("2026-01-15", range)).toBe(true);
    expect(inDateRange("2026-02-15", range)).toBe(false);
  });
});

describe("metricValue", () => {
  it("returns 1 for count metrics", () => {
    expect(metricValue(records[0], { field: "amount", aggregation: "count" })).toBe(1);
  });
  it("returns the field value otherwise", () => {
    expect(metricValue(records[0], { field: "amount", aggregation: "sum" })).toBe(100);
  });
});

describe("runReport", () => {
  it("computes a flat count", () => {
    const result = runReport(records, { metrics: [{ field: "amount", aggregation: "count", label: "Rows" }] });
    expect(result.recordCount).toBe(5);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].values.Rows).toBe(5);
    expect(result.total.Rows).toBe(5);
    expect(result.columns).toEqual(["Rows"]);
  });

  it("groups and aggregates by status", () => {
    const config: ReportConfig = {
      groupBy: [{ field: "status", label: "Status" }],
      metrics: [
        { field: "amount", aggregation: "sum", label: "Revenue" },
        { field: "amount", aggregation: "avg", label: "Avg" },
      ],
    };
    const result = runReport(records, config);
    expect(result.columns).toEqual(["Status", "Revenue", "Avg"]);
    const open = result.groups.find((g) => g.label === "open")!;
    expect(open.values).toEqual({ Revenue: 150, Avg: 75 });
    const done = result.groups.find((g) => g.label === "done")!;
    expect(done.values).toEqual({ Revenue: 230, Avg: 115 });
    expect(result.total.Revenue).toBe(380);
  });

  it("counts missing metric values as rows", () => {
    const result = runReport(records, { metrics: [{ field: "amount", aggregation: "count" }] });
    expect(result.total.count_amount).toBe(5);
  });

  it("sums only present values", () => {
    const result = runReport(records, { metrics: [{ field: "amount", aggregation: "sum" }] });
    expect(result.total.sum_amount).toBe(380);
  });

  it("honors filters and date range", () => {
    const result = runReport(records, {
      groupBy: [{ field: "status" }],
      metrics: [{ field: "amount", aggregation: "sum" }],
      dateRange: { field: "date", from: "2026-01-01", to: "2026-01-31" },
      filters: [{ field: "amount", operator: "gte", value: 60 }],
    });
    expect(result.recordCount).toBe(1);
    expect(result.total.sum_amount).toBe(100);
  });

  it("respects the limit", () => {
    const config: ReportConfig = {
      groupBy: [{ field: "status" }],
      metrics: [{ field: "amount", aggregation: "count" }],
      limit: 1,
    };
    const result = runReport(records, config);
    expect(result.groups.length).toBeLessThanOrEqual(1);
  });

  it("marks empty groups with an em dash", () => {
    const result = runReport(
      [{ id: "x", status: null }],
      { groupBy: [{ field: "status" }], metrics: [{ field: "amount", aggregation: "count" }] }
    );
    expect(result.groups[0].label).toBe("—");
  });
});

describe("chartDataFromResult", () => {
  it("maps groups to labels and series", () => {
    const result = runReport(records, {
      groupBy: [{ field: "status" }],
      metrics: [{ field: "amount", aggregation: "sum", label: "Revenue" }],
    });
    const chart = chartDataFromResult(result);
    expect(chart.labels.sort()).toEqual(["done", "open"]);
    expect(chart.series.Revenue.sort()).toEqual([150, 230]);
  });
});

describe("validateReportConfig", () => {
  it("accepts a valid config", () => {
    const config = validateReportConfig({ metrics: [{ field: "amount", aggregation: "sum" }] });
    expect(config.metrics).toHaveLength(1);
  });

  it("rejects configs without metrics", () => {
    expect(() => validateReportConfig({})).toThrow(/at least one metric/);
  });

  it("rejects unknown aggregations", () => {
    expect(() => validateReportConfig({ metrics: [{ field: "x", aggregation: "total" }] })).toThrow(/Invalid report config/);
  });

  it("rejects bad operator types in filters", () => {
    expect(() =>
      validateReportConfig({ metrics: [{ field: "x", aggregation: "count" }], filters: [{ field: "y", operator: "??" }] })
    ).toThrow(/Invalid report config/);
  });

  it("rejects null config", () => {
    expect(() => validateReportConfig(null)).toThrow(/at least one metric/);
  });
});