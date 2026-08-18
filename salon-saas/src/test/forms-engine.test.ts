import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

import {
  validateFormLayout,
  formLayoutSchema,
  collectFormValues,
  isFieldVisible,
  formFieldsOf,
  layoutFieldByKey,
  visibleFields,
} from "@/lib/forms/engine";

const fieldDefs = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "age", label: "Age", type: "number", required: false },
  { key: "type", label: "Type", type: "select", options: { choices: ["a", "b"] }, required: false },
] as any[];

describe("validateFormLayout", () => {
  it("accepts a valid layout with sections and placements", () => {
    const layout = validateFormLayout({
      sections: [
        {
          id: "s1",
          title: "General",
          fields: [{ key: "name", required: true }, { key: "email" }],
        },
      ],
    });
    expect(layout.sections).toHaveLength(1);
    expect(layout.sections[0].fields).toHaveLength(2);
  });

  it("rejects duplicate field keys across sections", () => {
    expect(() =>
      validateFormLayout({
        sections: [
          { id: "s1", title: "A", fields: [{ key: "name" }] },
          { id: "s2", title: "B", fields: [{ key: "name" }] },
        ],
      })
    ).toThrow(/more than once/);
  });

  it("rejects invalid operators in visibility rules", () => {
    const result = formLayoutSchema.safeParse({
      sections: [
        {
          id: "s1",
          title: "A",
          fields: [{ key: "email", visibleWhen: { field: "type", operator: "bogus" } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("defaults empty sections and fields to empty arrays", () => {
    const layout = validateFormLayout({});
    expect(layout.sections).toEqual([]);
  });

  it("throws INVALID_INPUT for a non-object layout", () => {
    expect(() => validateFormLayout(null)).toThrow(/Invalid form layout/);
  });
});

describe("formFieldsOf / layoutFieldByKey", () => {
  const layout = validateFormLayout({
    sections: [
      { id: "s1", title: "A", fields: [{ key: "name" }, { key: "email" }] },
      { id: "s2", title: "B", fields: [{ key: "age" }] },
    ],
  });

  it("flattens all placements", () => {
    expect(formFieldsOf(layout).map((f) => f.key)).toEqual(["name", "email", "age"]);
  });

  it("finds a placement by key", () => {
    expect(layoutFieldByKey(layout, "age")?.key).toBe("age");
    expect(layoutFieldByKey(layout, "missing")).toBeUndefined();
  });
});

describe("isFieldVisible", () => {
  const layout = validateFormLayout({
    sections: [
      {
        id: "s1",
        title: "A",
        fields: [
          { key: "email", visibleWhen: { field: "type", operator: "eq", value: "b" } },
          { key: "age", visibleWhen: { field: "email", operator: "is_not_empty" } },
        ],
      },
    ],
  });

  it("shows a field when its condition matches", () => {
    expect(isFieldVisible(layout.sections[0].fields[0], { type: "b" })).toBe(true);
    expect(isFieldVisible(layout.sections[0].fields[0], { type: "a" })).toBe(false);
  });

  it("supports is_not_empty conditions", () => {
    expect(isFieldVisible(layout.sections[0].fields[1], { email: "x@y.z" })).toBe(true);
    expect(isFieldVisible(layout.sections[0].fields[1], {})).toBe(false);
  });

  it("shows all fields when there is no condition", () => {
    const layout2 = validateFormLayout({ sections: [{ id: "s", fields: [{ key: "name" }] }] });
    expect(isFieldVisible(layout2.sections[0].fields[0], {})).toBe(true);
  });

  it("visibleFields marks hidden fields", () => {
    const visible = visibleFields(layout, { type: "a" });
    expect(visible.find((v) => v.placement.key === "email")?.visible).toBe(false);
  });
});

describe("collectFormValues", () => {
  it("collects visible field values into normalized record", () => {
    const layout = validateFormLayout({
      sections: [{ id: "s1", title: "A", fields: [{ key: "name" }, { key: "age" }] }],
    });
    const result = collectFormValues(layout, fieldDefs, { name: "Alice", age: "30" });
    expect(result.errors).toEqual([]);
    expect(result.normalized).toEqual({ name: "Alice", age: 30 });
  });

  it("enforces required fields", () => {
    const layout = validateFormLayout({
      sections: [{ id: "s1", title: "A", fields: [{ key: "name", required: true }] }],
    });
    const result = collectFormValues(layout, fieldDefs, {});
    expect(result.errors).toEqual([{ key: "name", message: "Name is required" }]);
  });

  it("skips hidden fields entirely", () => {
    const layout = validateFormLayout({
      sections: [
        {
          id: "s1",
          title: "A",
          fields: [{ key: "name" }, { key: "email", visibleWhen: { field: "type", operator: "eq", value: "b" } }],
        },
      ],
    });
    const result = collectFormValues(layout, fieldDefs, { name: "Alice", email: "hidden@x.com", type: "a" });
    expect(result.normalized).toEqual({ name: "Alice" });
  });

  it("includes a hidden-but-filled value when condition becomes true", () => {
    const layout = validateFormLayout({
      sections: [
        {
          id: "s1",
          title: "A",
          fields: [{ key: "name" }, { key: "email", visibleWhen: { field: "type", operator: "eq", value: "b" } }],
        },
      ],
    });
    const result = collectFormValues(layout, fieldDefs, { name: "Alice", email: "x@y.z", type: "b" });
    expect(result.normalized).toEqual({ name: "Alice", email: "x@y.z" });
  });

  it("fails with entity validation errors for wrong types", () => {
    const layout = validateFormLayout({
      sections: [{ id: "s1", title: "A", fields: [{ key: "name" }, { key: "age" }] }],
    });
    const result = collectFormValues(layout, fieldDefs, { name: "Alice", age: "not-a-number" });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].key).toBe("age");
  });

  it("reports missing fields in the layout", () => {
    const layout = validateFormLayout({
      sections: [{ id: "s1", title: "A", fields: [{ key: "ghost" }] }],
    });
    const result = collectFormValues(layout, fieldDefs, { ghost: "x" });
    expect(result.errors).toEqual([{ key: "ghost", message: 'Field "ghost" does not exist on this entity' }]);
  });
});