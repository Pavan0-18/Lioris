import { z } from "zod";
import { evaluateCondition, type WorkflowCondition, type WorkflowOperator } from "@/lib/workflows/engine";
import { getNestedValue } from "@/lib/workflows/engine";
import { formatFieldValue, recordTitle, type EntityField } from "@/lib/entities/engine";

export type ViewType = "list" | "kanban" | "calendar";

export interface ViewFilter {
  field: string;
  operator: WorkflowOperator;
  value?: any;
}

export interface ViewConfig {
  columns?: string[];
  sortBy?: string;
  sortDir?: "asc" | "desc";
  filters?: ViewFilter[];
  groupByField?: string | null;
  calendarField?: string | null;
  pageSize?: number;
}

export const viewConfigSchema = z.object({
  columns: z.array(z.string()).max(30).optional(),
  sortBy: z.string().max(60).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  filters: z.array(z.object({
    field: z.string().max(60),
    operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "starts_with", "ends_with", "in", "not_in", "is_empty", "is_not_empty", "changed", "changed_to", "changed_from"]),
    value: z.any().optional(),
  })).max(30).optional(),
  groupByField: z.string().max(60).nullable().optional(),
  calendarField: z.string().max(60).nullable().optional(),
  pageSize: z.number().int().min(10).max(200).optional(),
});

export const VIEW_TYPES = ["list", "kanban", "calendar"] as const;

export function validateViewConfig(type: ViewType, raw: any): ViewConfig {
  const parsed = viewConfigSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    const error = new Error(`Invalid view config: ${parsed.error.errors[0]?.message}`) as any;
    error.code = "INVALID_INPUT";
    throw error;
  }
  const config = parsed.data ?? {};
  if (type === "kanban" && !config.groupByField) {
    const error = new Error("Kanban views require a group by field") as any;
    error.code = "INVALID_INPUT";
    throw error;
  }
  if (type === "calendar" && !config.calendarField) {
    const error = new Error("Calendar views require a calendar field") as any;
    error.code = "INVALID_INPUT";
    throw error;
  }
  return config;
}

export function matchesFilters(record: Record<string, any>, filters: ViewFilter[] | undefined): boolean {
  if (!filters || filters.length === 0) return true;
  return filters.every((f) => evaluateCondition({ field: f.field, operator: f.operator as any, value: f.value }, record, undefined));
}

export function sortRecords(
  records: Record<string, any>[],
  sortBy: string | undefined,
  sortDir: "asc" | "desc" | undefined
): Record<string, any>[] {
  if (!sortBy) return records;
  const dir = sortDir === "desc" ? -1 : 1;
  return [...records].sort((a, b) => {
    const av = getNestedValue(a, sortBy);
    const bv = getNestedValue(b, sortBy);
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

export interface KanbanGroup {
  key: string;
  label: string;
  records: Record<string, any>[];
}

export function groupByField(
  records: Record<string, any>[],
  groupField: string,
  fields: EntityField[]
): KanbanGroup[] {
  const groups = new Map<string, Record<string, any>[]>();
  for (const record of records) {
    const value = getNestedValue(record, groupField);
    const key = value === undefined || value === null || value === "" ? "__empty__" : String(value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(record);
  }
  const field = fields.find((f) => f.key === groupField);
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, groupRecords]) => {
      const sample = field ? formatFieldValue(field, groupRecords[0]?.[groupField]) : key;
      const label = key === "__empty__" ? "Empty" : (field?.options?.choices?.find((c: any) => String(c) === key) ?? sample ?? key);
      return { key, label: String(label), records: groupRecords };
    });
}

export interface CalendarDay {
  date: string;
  records: Record<string, any>[];
}

export function groupByCalendar(
  records: Record<string, any>[],
  calendarField: string
): CalendarDay[] {
  const groups = new Map<string, Record<string, any>[]>();
  for (const record of records) {
    const value = getNestedValue(record, calendarField);
    if (value === undefined || value === null || value === "") continue;
    const date = new Date(value);
    if (isNaN(date.getTime())) continue;
    const dayKey = date.toISOString().slice(0, 10);
    if (!groups.has(dayKey)) groups.set(dayKey, []);
    groups.get(dayKey)!.push(record);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, dayRecords]) => ({ date, records: dayRecords }));
}

export interface AppliedView {
  records: Record<string, any>[];
  groups: KanbanGroup[] | null;
  calendar: CalendarDay[] | null;
}

export function applyView(
  records: Record<string, any>[],
  config: ViewConfig,
  fields: EntityField[],
  type: ViewType = "list"
): AppliedView {
  const filtered = records.filter((r) => matchesFilters(r, config.filters));
  const sorted = sortRecords(filtered, config.sortBy, config.sortDir);

  if (type === "kanban" && config.groupByField) {
    return { records: sorted, groups: groupByField(sorted, config.groupByField, fields), calendar: null };
  }
  if (type === "calendar" && config.calendarField) {
    return { records: sorted, groups: null, calendar: groupByCalendar(sorted, config.calendarField) };
  }
  return { records: sorted, groups: null, calendar: null };
}

export function viewRecordTitle(
  config: ViewConfig,
  fields: EntityField[],
  fieldValues: Record<string, any>
): string {
  return recordTitle({ recordTitleField: config.groupByField ?? config.columns?.[0] }, fields, fieldValues);
}
