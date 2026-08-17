import { describe, it, expect } from "vitest";
import {
  validateFieldValue,
  validateRecord,
  normalizeFieldValue,
  formatFieldValue,
  slugifyKey,
  recordTitle,
  type EntityField,
} from "@/lib/entities/engine";

function field(partial: Partial<EntityField>): EntityField {
  return {
    id: "f1",
    key: "field1",
    label: "Field 1",
    type: "text",
    required: false,
    unique: false,
    options: null,
    defaultValue: null,
    placeholder: null,
    position: 0,
    isSystem: false,
    config: null,
    ...partial,
  };
}

describe("entity field validation", () => {
  it("required fields reject empty values", () => {
    const f = field({ key: "name", label: "Name", required: true });
    expect(validateFieldValue(f, "")).toBe("Name is required");
    expect(validateFieldValue(f, null)).toBe("Name is required");
    expect(validateFieldValue(f, undefined)).toBe("Name is required");
    expect(validateFieldValue(f, "John")).toBeNull();
  });

  it("optional empty fields pass", () => {
    const f = field({ key: "note" });
    expect(validateFieldValue(f, "")).toBeNull();
  });

  it("text respects maxLength", () => {
    const f = field({ config: { maxLength: 5 } });
    expect(validateFieldValue(f, "toolong")).toMatch(/at most 5/);
    expect(validateFieldValue(f, "ok")).toBeNull();
  });

  it("numbers must be finite", () => {
    const f = field({ type: "number" });
    expect(validateFieldValue(f, "abc")).toMatch(/must be a number/);
    expect(validateFieldValue(f, "42")).toBeNull();
    expect(validateFieldValue(f, 3.14)).toBeNull();
  });

  it("percentage clamps to 0-100", () => {
    const f = field({ type: "percentage" });
    expect(validateFieldValue(f, 150)).toMatch(/between 0 and 100/);
    expect(validateFieldValue(f, 25)).toBeNull();
  });

  it("rating clamps to 0-5", () => {
    const f = field({ type: "rating" });
    expect(validateFieldValue(f, 7)).toMatch(/between 0 and 5/);
    expect(validateFieldValue(f, 4)).toBeNull();
  });

  it("currency rejects negatives", () => {
    const f = field({ type: "currency" });
    expect(validateFieldValue(f, -10)).toMatch(/cannot be negative/);
  });

  it("date accepts ISO and rejects garbage", () => {
    const f = field({ type: "date" });
    expect(validateFieldValue(f, "2026-01-15")).toBeNull();
    expect(validateFieldValue(f, "not-a-date")).toMatch(/valid date/);
  });

  it("datetime accepts parseable values", () => {
    const f = field({ type: "datetime" });
    expect(validateFieldValue(f, "2026-01-15T10:00:00Z")).toBeNull();
  });

  it("boolean accepts only booleans", () => {
    const f = field({ type: "boolean" });
    expect(validateFieldValue(f, true)).toBeNull();
    expect(validateFieldValue(f, "banana")).toMatch(/true or false/);
  });

  it("select validates against choices", () => {
    const f = field({ type: "select", options: { choices: ["a", "b"] } });
    expect(validateFieldValue(f, "a")).toBeNull();
    expect(validateFieldValue(f, "c")).toMatch(/invalid choice/);
  });

  it("multiselect validates array subsets", () => {
    const f = field({ type: "multiselect", options: { choices: ["a", "b", "c"] } });
    expect(validateFieldValue(f, ["a", "c"])).toBeNull();
    expect(validateFieldValue(f, ["a", "zzz"])).toMatch(/invalid choices/);
    expect(validateFieldValue(f, "a")).toMatch(/must be a list/);
  });

  it("email, phone, url validated", () => {
    expect(validateFieldValue(field({ type: "email" }), "x@y.com")).toBeNull();
    expect(validateFieldValue(field({ type: "email" }), "nope")).toMatch(/valid email/);
    expect(validateFieldValue(field({ type: "phone" }), "+91 98765 43210")).toBeNull();
    expect(validateFieldValue(field({ type: "phone" }), "x")).toMatch(/valid phone/);
    expect(validateFieldValue(field({ type: "url" }), "https://example.com")).toBeNull();
    expect(validateFieldValue(field({ type: "url" }), "not a url")).toMatch(/valid URL/);
  });

  it("entity reference accepts id or object", () => {
    const f = field({ type: "entity_reference" });
    expect(validateFieldValue(f, "rec_123")).toBeNull();
    expect(validateFieldValue(f, { recordId: "rec_123", label: "Car" })).toBeNull();
    expect(validateFieldValue(f, 123)).toMatch(/reference a record/);
  });

  it("json validates parseable input", () => {
    const f = field({ type: "json" });
    expect(validateFieldValue(f, '{"a":1}')).toBeNull();
    expect(validateFieldValue(f, "{broken")).toMatch(/valid JSON/);
  });

  it("normalizes numeric and boolean strings", () => {
    expect(normalizeFieldValue(field({ type: "number" }), "42")).toBe(42);
    expect(normalizeFieldValue(field({ type: "boolean" }), "true")).toBe(true);
    expect(normalizeFieldValue(field({ type: "boolean" }), "false")).toBe(false);
    expect(normalizeFieldValue(field({ type: "multiselect" }), "a")).toEqual([]);
  });
});

describe("record validation", () => {
  const fields = [
    field({ key: "name", label: "Name", required: true }),
    field({ key: "email", label: "Email", type: "email" }),
    field({ key: "rating", label: "Rating", type: "rating" }),
  ];

  it("collects all errors with normalized values", () => {
    const { errors, normalized } = validateRecord(fields, { email: "bad", rating: "4" });
    expect(errors).toHaveLength(2);
    expect(errors[0].fieldKey).toBe("name");
    expect(errors[1].fieldKey).toBe("email");
    expect(normalized.rating).toBe(4);
    expect(normalized.email).toBe("bad");
  });

  it("passes clean records", () => {
    const { errors } = validateRecord(fields, { name: "A", email: "a@b.com", rating: 3 });
    expect(errors).toHaveLength(0);
  });
});

describe("formatting and titles", () => {
  it("formats by field type", () => {
    expect(formatFieldValue(field({ type: "currency" }), 42)).toContain("42");
    expect(formatFieldValue(field({ type: "percentage" }), 20)).toBe("20%");
    expect(formatFieldValue(field({ type: "boolean" }), true)).toBe("Yes");
    expect(formatFieldValue(field({ type: "rating" }), 4)).toBe("4 ★");
    expect(formatFieldValue(field({ type: "multiselect" }), ["a", "b"])).toBe("a, b");
  });

  it("recordTitle uses configured field, else first text field", () => {
    const fields = [
      field({ key: "reg", label: "Reg" }),
      field({ key: "brand", label: "Brand" }),
    ];
    expect(recordTitle({ recordTitleField: "reg" }, fields, { reg: "KA-01-2026", brand: "Toyota" })).toBe("KA-01-2026");
    expect(recordTitle(null, fields, { brand: "Toyota" })).toBe("Toyota");
    expect(recordTitle(null, fields, {})).toBe("Untitled record");
  });

  it("slugifyKey produces safe keys", () => {
    expect(slugifyKey("Registration Number")).toBe("registration_number");
    expect(slugifyKey("  Hello   World! ")).toBe("hello_world");
    expect(slugifyKey("")).toMatch(/^field_/);
  });
});