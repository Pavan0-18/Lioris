export type FieldType =
  | "text" | "textarea" | "number" | "currency" | "percentage" | "rating"
  | "date" | "datetime" | "boolean"
  | "select" | "multiselect"
  | "email" | "phone" | "url"
  | "user" | "entity_reference"
  | "address" | "json";

export interface EntityField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  options: Record<string, any> | null;
  defaultValue: string | null;
  placeholder: string | null;
  position: number;
  isSystem: boolean;
  config: Record<string, any> | null;
}

export interface FieldValidationError {
  fieldKey: string;
  label: string;
  message: string;
}

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percentage", label: "Percentage" },
  { value: "rating", label: "Rating" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "boolean", label: "Yes / No" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi Select" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "user", label: "User" },
  { value: "entity_reference", label: "Related Record" },
  { value: "address", label: "Address" },
  { value: "json", label: "JSON" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s\-().]{7,20}$/;

export function slugifyKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || `field_${Date.now()}`;
}

export function isFieldValueEmpty(value: any): boolean {
  return value === undefined || value === null || value === "" ||
    (Array.isArray(value) && value.length === 0);
}

export function validateFieldValue(field: EntityField, value: any): string | null {
  if (isFieldValueEmpty(value)) {
    if (field.required) return `${field.label} is required`;
    return null;
  }

  const options = field.options ?? {};
  const config = field.config ?? {};

  switch (field.type) {
    case "text":
    case "textarea":
      if (typeof value !== "string") return `${field.label} must be text`;
      if (config.maxLength && value.length > config.maxLength) {
        return `${field.label} must be at most ${config.maxLength} characters`;
      }
      return null;

    case "number":
    case "currency":
    case "percentage":
    case "rating": {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (!Number.isFinite(num)) return `${field.label} must be a number`;
      if (field.type === "percentage" && (num < 0 || num > 100)) return `${field.label} must be between 0 and 100`;
      if (field.type === "rating" && (num < 0 || num > 5)) return `${field.label} must be between 0 and 5`;
      if (field.type === "currency" && num < 0) return `${field.label} cannot be negative`;
      return null;
    }

    case "date": {
      const str = String(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(str) && isNaN(Date.parse(str))) return `${field.label} must be a valid date`;
      return null;
    }

    case "datetime": {
      const str = String(value);
      if (isNaN(Date.parse(str))) return `${field.label} must be a valid date and time`;
      return null;
    }

    case "boolean":
      if (typeof value !== "boolean" && value !== "true" && value !== "false" && value !== 1 && value !== 0) {
        return `${field.label} must be true or false`;
      }
      return null;

    case "select": {
      const allowed = (options.choices ?? []).map((c: any) => (typeof c === "object" ? c.value : c));
      if (!allowed.includes(value)) return `${field.label} has an invalid choice`;
      return null;
    }

    case "multiselect": {
      if (!Array.isArray(value)) return `${field.label} must be a list`;
      const allowed = (options.choices ?? []).map((c: any) => (typeof c === "object" ? c.value : c));
      const invalid = value.filter((v) => !allowed.includes(v));
      if (invalid.length > 0) return `${field.label} has invalid choices: ${invalid.join(", ")}`;
      return null;
    }

    case "email":
      if (!EMAIL_RE.test(String(value))) return `${field.label} must be a valid email`;
      return null;

    case "phone":
      if (!PHONE_RE.test(String(value))) return `${field.label} must be a valid phone number`;
      return null;

    case "url":
      try {
        new URL(String(value));
        return null;
      } catch {
        return `${field.label} must be a valid URL`;
      }

    case "user":
      if (typeof value !== "string" || value.length < 5) return `${field.label} must reference a user`;
      return null;

    case "entity_reference": {
      if (typeof value === "string") {
        if (value.length < 5) return `${field.label} must reference a record`;
        return null;
      }
      if (typeof value === "object" && value !== null && value.recordId) return null;
      return `${field.label} must reference a record`;
    }

    case "address":
      if (typeof value === "string") return null;
      if (typeof value === "object" && value !== null) return null;
      return `${field.label} must be an address`;

    case "json":
      try {
        if (typeof value === "string") JSON.parse(value);
        return null;
      } catch {
        return `${field.label} must be valid JSON`;
      }

    default:
      return null;
  }
}

export function normalizeFieldValue(field: EntityField, value: any): any {
  if (isFieldValueEmpty(value)) return field.required ? null : undefined;

  switch (field.type) {
    case "number":
    case "currency":
    case "percentage":
    case "rating": {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      return Number.isFinite(num) ? num : null;
    }
    case "boolean":
      if (typeof value === "boolean") return value;
      if (value === "true" || value === 1) return true;
      if (value === "false" || value === 0) return false;
      return null;
    case "multiselect":
      return Array.isArray(value) ? value : [];
    case "json":
      if (typeof value === "string") {
        try { return JSON.parse(value); } catch { return value; }
      }
      return value;
    default:
      return value;
  }
}

export function validateRecord(
  fields: EntityField[],
  values: Record<string, any>
): { errors: FieldValidationError[]; normalized: Record<string, any> } {
  const errors: FieldValidationError[] = [];
  const normalized: Record<string, any> = {};

  for (const field of fields) {
    const raw = values[field.key];
    const message = validateFieldValue(field, raw);
    if (message) {
      errors.push({ fieldKey: field.key, label: field.label, message });
    }
    normalized[field.key] = normalizeFieldValue(field, raw);
  }

  return { errors, normalized };
}

export function formatFieldValue(field: EntityField, value: any): string {
  if (isFieldValueEmpty(value)) return "—";
  switch (field.type) {
    case "currency":
      return Number(value).toLocaleString(undefined, { style: "currency", currency: "USD" });
    case "percentage":
      return `${Number(value)}%`;
    case "rating":
      return `${Number(value)} ★`;
    case "boolean":
      return value ? "Yes" : "No";
    case "multiselect":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "entity_reference":
      if (typeof value === "object" && value !== null) return String(value.label ?? value.recordId ?? "");
      return String(value);
    case "address":
      if (typeof value === "object" && value !== null) {
        return [value.line1, value.city, value.state, value.pincode].filter(Boolean).join(", ");
      }
      return String(value);
    case "json":
      return typeof value === "string" ? value : JSON.stringify(value);
    default:
      return String(value);
  }
}

export function recordTitle(entityConfig: Record<string, any> | null, fields: EntityField[], values: Record<string, any>): string {
  const titleFieldKey = entityConfig?.recordTitleField;
  if (titleFieldKey && values[titleFieldKey] !== undefined && !isFieldValueEmpty(values[titleFieldKey])) {
    const field = fields.find((f) => f.key === titleFieldKey);
    return field ? formatFieldValue(field, values[titleFieldKey]) : String(values[titleFieldKey]);
  }
  for (const field of fields) {
    if (field.type === "text" && !isFieldValueEmpty(values[field.key])) {
      return String(values[field.key]);
    }
  }
  return "Untitled record";
}