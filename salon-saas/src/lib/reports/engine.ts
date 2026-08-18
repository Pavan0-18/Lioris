import { z } from "zod";
import { evaluateCondition, type WorkflowCondition, type WorkflowOperator } from "@/lib/workflows/engine";
import { getNestedValue } from "@/lib/workflows/engine";

export const AGGREGATIONS = ["count", "sum", "avg", "min", "max"] as const;

export type Aggregation = (typeof AGGREGATIONS)[number];

export interface MetricConfig {
  field: string;
  aggregation: Aggregation;
  label?: string;
}

export interface GroupByConfig {
  field: string;
  label?: string;
}

export interface DateRangeConfig {
  field: string;
  from?: string;
  to?: string;
}

export interface ReportConfig {
  groupBy?: GroupByConfig[];
  metrics?: MetricConfig[];
  dateRange?: DateRangeConfig;
  filters?: WorkflowCondition[];
  limit?: number;
}

export const reportConfigSchema = z.object({
  groupBy: z.array(z.object({
    field: z.string().max(60),
    label: z.string().max(120).optional(),
  })).max(4).optional(),
  metrics: z.array(z.object({
    field: z.string().max(60),
    aggregation: z.enum(AGGREGATIONS),
    label: z.string().max(120).optional(),
  })).max(10).optional(),
  dateRange: z.object({
    field: z.string().max(60),
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
  filters: z.array(z.object({
    field: z.string().max(60),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "starts_with", "ends_with", "in", "not_in", "is_empty", "is_not_empty", "changed", "changed_to", "changed_from"]),
    value: z.any().optional(),
  })).max(30).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export function validateReportConfig(raw: any): ReportConfig {
  const parsed = reportConfigSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    const error = new Error(`Invalid report config: ${parsed.error.errors[0]?.message}`) as any;
    error.code = "INVALID_INPUT";
    throw error;
  }
  const config = parsed.data ?? {};
  if ((config.metrics ?? []).length === 0) {
    const error = new Error("Report requires at least one metric") as any;
    error.code = "INVALID_INPUT";
    throw error;
  }
  return config as ReportConfig;
}

export function toNumber(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function inDateRange(value: any, range: DateRangeConfig | undefined): boolean {
  if (!range) return true;
  if (value === undefined || value === null || value === "") return true;
  const date = new Date(value);
  if (isNaN(date.getTime())) return true;
  const time = date.getTime();
  if (range.from) {
    const from = new Date(range.from);
    if (!isNaN(from.getTime()) && time < from.getTime()) return false;
  }
  if (range.to) {
    const to = new Date(range.to);
    if (!isNaN(to.getTime()) && time > to.getTime()) return false;
  }
  return true;
}

export function filterRecords(
  records: Record<string, any>[],
  filters: WorkflowCondition[] | undefined,
  dateRange: DateRangeConfig | undefined
): Record<string, any>[] {
  return records.filter((record) => {
    if (filters && filters.length > 0) {
      if (!filters.every((f) => evaluateCondition(f, record, undefined))) return false;
    }
    if (dateRange && !inDateRange(getNestedValue(record, dateRange.field), dateRange)) return false;
    return true;
  });
}

export function aggregateValues(values: (any)[], aggregation: Aggregation): number {
  const nums = values.map(toNumber).filter((n): n is number => n !== null);
  switch (aggregation) {
    case "count": return values.length;
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "avg": return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min": return nums.length === 0 ? 0 : Math.min(...nums);
    case "max": return nums.length === 0 ? 0 : Math.max(...nums);
    default: return 0;
  }
}

export function metricValue(record: Record<string, any>, metric: MetricConfig): any {
  if (metric.aggregation === "count") return 1;
  return getNestedValue(record, metric.field);
}

export interface ReportGroup {
  key: string;
  label: string;
  count: number;
  values: Record<string, number>;
}

export interface ReportResult {
  columns: string[];
  groups: ReportGroup[];
  total: Record<string, number>;
  recordCount: number;
}

export function runReport(records: Record<string, any>[], config: ReportConfig): ReportResult {
  const groupBy = config.groupBy ?? [];
  const metrics = config.metrics ?? [];
  const filtered = filterRecords(records, config.filters, config.dateRange);
  const limit = config.limit ?? 100;

  const keyOf = (record: Record<string, any>): string =>
    groupBy.map((g) => {
      const v = getNestedValue(record, g.field);
      return v === undefined || v === null || v === "" ? "—" : String(v);
    }).join(" · ");

  const labelOf = (record: Record<string, any>): string =>
    groupBy.map((g) => {
      const v = getNestedValue(record, g.field);
      return v === undefined || v === null || v === "" ? "—" : String(v);
    }).join(" · ");

  const groups = new Map<string, Record<string, any>[]>();
  for (const record of filtered) {
    const key = groupBy.length === 0 ? "__all__" : keyOf(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(record);
  }

  const columns = [
    ...groupBy.map((g) => g.label ?? g.field),
    ...metrics.map((m) => m.label ?? `${m.aggregation}_${m.field}`),
  ];

  const computed: ReportGroup[] = [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, groupRecords]) => {
      const values: Record<string, number> = {};
      for (const metric of metrics) {
        const column = metric.label ?? `${metric.aggregation}_${metric.field}`;
        values[column] = aggregateValues(groupRecords.map((r) => metricValue(r, metric)), metric.aggregation);
      }
      return { key, label: labelOf(groupRecords[0]) || key, count: groupRecords.length, values };
    });

  const total: Record<string, number> = {};
  for (const metric of metrics) {
    const column = metric.label ?? `${metric.aggregation}_${metric.field}`;
    total[column] = aggregateValues(filtered.map((r) => metricValue(r, metric)), metric.aggregation);
  }

  return { columns, groups: computed, total, recordCount: filtered.length };
}

export function chartDataFromResult(result: ReportResult): { labels: string[]; series: Record<string, number[]> } {
  const labels = result.groups.map((g) => g.label);
  const metricColumns = Object.keys(result.total);
  const series: Record<string, number[]> = {};
  for (const column of metricColumns) {
    series[column] = result.groups.map((g) => g.values[column] ?? 0);
  }
  return { labels, series };
}
