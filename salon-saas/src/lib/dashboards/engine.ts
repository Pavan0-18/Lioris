import { z } from "zod";
import {
  aggregateValues,
  filterRecords,
  runReport,
  type Aggregation,
  type ReportResult,
} from "@/lib/reports/engine";
import type { WorkflowCondition } from "@/lib/workflows/engine";

export const WIDGET_TYPES = ["count", "metric", "recent", "bar", "line", "pie"] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export interface WidgetConfig {
  field?: string;
  aggregation?: Aggregation;
  filters?: WorkflowCondition[];
  dateField?: string;
  limit?: number;
  suffix?: string;
  color?: string;
}

export const widgetConfigSchema = z.object({
  field: z.string().max(60).optional(),
  aggregation: z.enum(["count", "sum", "avg", "min", "max"]).optional(),
  filters: z.array(z.object({
    field: z.string().max(60),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "starts_with", "ends_with", "in", "not_in", "is_empty", "is_not_empty", "changed", "changed_to", "changed_from"]),
    value: z.any().optional(),
  })).max(30).optional(),
  dateField: z.string().max(60).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  suffix: z.string().max(20).optional(),
  color: z.string().max(20).optional(),
});

export function validateWidgetConfig(raw: any): WidgetConfig {
  const parsed = widgetConfigSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    const error = new Error(`Invalid widget config: ${parsed.error.errors[0]?.message}`) as any;
    error.code = "INVALID_INPUT";
    throw error;
  }
  return parsed.data ?? {};
}

export interface WidgetData {
  value?: number;
  suffix?: string;
  records?: Record<string, any>[];
  chart?: { labels: string[]; series: Record<string, number[]> };
  empty: boolean;
}

export function resolveWidgetData(
  type: WidgetType,
  config: WidgetConfig,
  records: Record<string, any>[]
): WidgetData {
  const filtered = filterRecords(records, config.filters, config.dateField ? { field: config.dateField } : undefined);
  const limit = config.limit ?? 10;
  const aggregation = config.aggregation ?? (type === "count" ? "count" : "sum");
  const empty = filtered.length === 0;

  switch (type) {
    case "count":
      return { value: filtered.length, suffix: config.suffix, empty };

    case "metric": {
      const values = filtered.map((r) => (aggregation === "count" ? 1 : r[config.field ?? ""]));
      return { value: aggregateValues(values, aggregation), suffix: config.suffix, empty };
    }

    case "recent":
      return { records: [...filtered].slice(0, limit), empty };

    case "bar":
    case "line":
    case "pie": {
      if (!config.field) {
        const error = new Error("Chart widgets require a field") as any;
        error.code = "INVALID_INPUT";
        throw error;
      }
      const result: ReportResult = runReport(filtered, {
        groupBy: [{ field: config.field }],
        metrics: [{ field: config.field, aggregation: aggregation === "count" ? "count" : "sum" }],
        limit,
      });
      const labels = result.groups.map((g) => g.label);
      const series: Record<string, number[]> = {};
      for (const column of Object.keys(result.total)) {
        series[column] = result.groups.map((g) => g.values[column] ?? 0);
      }
      return { chart: { labels, series }, empty };
    }

    default:
      return { value: filtered.length, empty };
  }
}
