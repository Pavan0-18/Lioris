import { describe, it, expect } from "vitest";
import { can, matrix, type Role } from "@/lib/permissions";

const ROLES: Role[] = ["OWNER", "MANAGER", "RECEPTIONIST", "STYLIST"];

describe("permissions matrix integrity", () => {
  it("SUPER_ADMIN can do everything", () => {
    expect(can("SUPER_ADMIN", "appointments:read")).toBe(true);
    expect(can("SUPER_ADMIN", "entities:manage")).toBe(true);
    expect(can("SUPER_ADMIN", "config:manage")).toBe(true);
  });

  it("every role has base permissions", () => {
    for (const role of ROLES) {
      expect(can(role, "appointments:read"), `${role} can read appointments`).toBe(true);
      expect(can(role, "customers:read"), `${role} can read customers`).toBe(true);
      expect(can(role, "services:read"), `${role} can read services`).toBe(true);
    }
  });

  it("only owners can deactivate staff and approve payroll", () => {
    expect(can("OWNER", "staff:deactivate")).toBe(true);
    expect(can("OWNER", "payroll:approve")).toBe(true);
    expect(can("MANAGER", "staff:deactivate")).toBe(false);
    expect(can("RECEPTIONIST", "staff:deactivate")).toBe(false);
    expect(can("STYLIST", "staff:deactivate")).toBe(false);
    expect(can("STYLIST", "payroll:approve")).toBe(false);
  });

  it("customization permissions exist for owner/manager but not receptionist/stylist", () => {
    for (const perm of ["entities:manage", "workflows:manage", "modules:manage", "config:manage"]) {
      expect(can("OWNER", perm as any), `${perm} for OWNER`).toBe(true);
      expect(can("MANAGER", perm as any), `${perm} for MANAGER`).toBe(true);
      expect(can("RECEPTIONIST", perm as any), `${perm} denied for RECEPTIONIST`).toBe(false);
      expect(can("STYLIST", perm as any), `${perm} denied for STYLIST`).toBe(false);
    }
  });

  it("inventory permissions are present for operations roles", () => {
    expect(can("OWNER", "inventory:create")).toBe(true);
    expect(can("MANAGER", "inventory:update")).toBe(true);
    expect(can("RECEPTIONIST", "inventory:read")).toBe(true);
    expect(can("STYLIST", "inventory:read")).toBe(false);
    expect(can("RECEPTIONIST", "inventory:delete")).toBe(false);
  });

  it("matrix has no duplicate permissions per role", () => {
    for (const role of ROLES) {
      const perms = matrix[role];
      expect(new Set(perms).size, `${role} has no duplicates`).toBe(perms.length);
    }
  });
});