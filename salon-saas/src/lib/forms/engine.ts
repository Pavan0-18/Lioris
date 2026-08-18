import { z } from "zod";
import { evaluateCondition, type WorkflowCondition } from "@/lib/workflows/engine";
import {
  validateRecord,
  type EntityField,
  type FieldType,
} from "@/lib/entities/engine";

export interface FormFieldPlacement {
  key: string;
  label?: string;
  required?: boolean;
  visibleWhen?: WorkflowCondition | null;
  width?: "full" | "half" | "third";
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldPlacement[];
}

export interface FormLayout {
  sections: FormSection[];
}

export interface FormConfig {
  submitLabel?: string;
  successMessage?: string;
  allowMultiple?: boolean;
  redirectToRecords?: boolean;
}

export const FIELD_WIDTHS = ["full", "half", "third"] as const;

export const formLayoutSchema: z.ZodType<FormLayout, z.ZodTypeDef, any> = z.object({
  sections: z.array(z.object({
    id: z.string().min(1),
    title: z.string().max(120).default("Untitled section"),
    description: z.string().max(500).optional(),
    fields: z.array(z.object({
      key: z.string().min(1),
      label: z.string().max(200).optional(),
      required: z.boolean().optional(),
      visibleWhen: z.object({
        field: z.string(),
        operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains", "starts_with", "ends_with", "in", "not_in", "is_empty", "is_not_empty", "changed", "changed_to", "changed_from"]),
        value: z.any().optional(),
      }).nullable().optional(),
      width: z.enum(FIELD_WIDTHS).optional(),
    })).default([]),
  })).default([]),
});

export const formConfigSchema = z.object({
  submitLabel: z.string().max(120).optional(),
  successMessage: z.string().max(500).optional(),
  allowMultiple: z.boolean().optional(),
  redirectToRecords: z.boolean().optional(),
});

export function validateFormLayout(raw: any): FormLayout {
  const parsed = formLayoutSchema.safeParse(raw);
  if (!parsed.success) {
    const error = new Error(`Invalid form layout: ${parsed.error.errors[0]?.message}`) as any;
    error.code = "INVALID_INPUT";
    throw error;
  }
  const layout = parsed.data;
  const seen = new Set<string>();
  for (const section of layout.sections) {
    for (const field of section.fields) {
      if (seen.has(field.key)) {
        const error = new Error(`Field "${field.key}" appears more than once in the form layout`) as any;
        error.code = "INVALID_INPUT";
        throw error;
      }
      seen.add(field.key);
    }
  }
  return layout;
}

export function formFieldsOf(layout: FormLayout): FormFieldPlacement[] {
  return layout.sections.flatMap((s) => s.fields);
}

export function layoutFieldByKey(layout: FormLayout, key: string): FormFieldPlacement | undefined {
  for (const section of layout.sections) {
    const found = section.fields.find((f) => f.key === key);
    if (found) return found;
  }
  return undefined;
}

export function isFieldVisible(placement: FormFieldPlacement, values: Record<string, any>): boolean {
  if (!placement.visibleWhen) return true;
  return evaluateCondition(placement.visibleWhen, values, undefined);
}

export function visibleFields(
  layout: FormLayout,
  values: Record<string, any>
): { placement: FormFieldPlacement; visible: boolean }[] {
  return layout.sections.flatMap((s) => s.fields.map((f) => ({
    placement: f,
    visible: isFieldVisible(f, values),
  })));
}

export interface FormValidationResult {
  errors: { key: string; message: string }[];
  normalized: Record<string, any>;
}

export function collectFormValues(
  layout: FormLayout,
  fields: EntityField[],
  values: Record<string, any>
): FormValidationResult {
  const fieldMap = new Map(fields.map((f) => [f.key, f]));
  const placed = formFieldsOf(layout);
  const placedKeys = new Set(placed.map((p) => p.key));

  const errors: { key: string; message: string }[] = [];
  const normalized: Record<string, any> = {};

  for (const placement of placed) {
    const field = fieldMap.get(placement.key);
    if (!field) {
      errors.push({ key: placement.key, message: `Field "${placement.key}" does not exist on this entity` });
      continue;
    }

    if (!isFieldVisible(placement, values)) continue;

    const raw = values[placement.key];
    if (placement.required === true && (raw === undefined || raw === null || raw === "")) {
      errors.push({ key: field.key, message: `${placement.label ?? field.label} is required` });
      continue;
    }
    if (raw === undefined || raw === null || raw === "") continue;

    normalized[field.key] = raw;
  }

  if (errors.length > 0) {
    return { errors, normalized };
  }

  const { errors: fieldErrors, normalized: fieldNormalized } = validateRecord(fields, normalized);
  return {
    errors: fieldErrors.map((e) => ({ key: e.fieldKey, message: e.message })),
    normalized: fieldNormalized,
  };
}

export function fieldTypeLabel(type: FieldType): string {
  const labels: Record<string, string> = {
    text: "Text",
    textarea: "Long text",
    number: "Number",
    percentage: "Percentage",
    rating: "Rating",
    date: "Date",
    datetime: "Date & time",
    boolean: "Yes / No",
    select: "Dropdown",
    multiselect: "Multi-select",
    email: "Email",
    phone: "Phone",
    url: "URL",
    address: "Address",
    json: "JSON",
    currency: "Currency",
  };
  return labels[type] ?? type;
}
