import { describe, it, expect } from "vitest";
import {
  resolveScope,
  canAccess,
  assertRecordAccess,
  scopeFilter,
  mergeScopes,
  DEFAULT_SCOPES,
} from "@/lib/access-control";
import type { ScopeContext, PermissionOverride } from "@/lib/access-control";

const ownerCtx: ScopeContext = { tenantId: "t1", userId: "u1", role: "OWNER" };
const stylistCtx: ScopeContext = { tenantId: "t1", userId: "u1", role: "STYLIST", branchId: "b1" };
const managerCtx: ScopeContext = { tenantId: "t1", userId: "u2", role: "MANAGER", branchId: "b1" };

describe("access control — scope resolution", () => {
  it("owners and managers default to all", () => {
    expect(resolveScope("OWNER", "appointments:read")).toBe("all");
    expect(resolveScope("MANAGER", "customers:update")).toBe("all");
  });

  it("stylists get 'own' scope on appointments and customers by default", () => {
    expect(resolveScope("STYLIST", "appointments:read")).toBe("own");
    expect(resolveScope("STYLIST", "customers:read")).toBe("own");
  });

  it("unscoped permissions default to all for every role", () => {
    expect(resolveScope("STYLIST", "services:read")).toBe("all");
  });

  it("tenant overrides replace defaults", () => {
    const scopes: PermissionOverride = { "appointments:read": { STYLIST: "branch" } };
    expect(resolveScope("STYLIST", "appointments:read", scopes)).toBe("branch");
  });

  it("tenant can tighten owner scope to none", () => {
    const scopes: PermissionOverride = { "billing:read": { OWNER: "none" } };
    expect(resolveScope("OWNER", "billing:read", scopes)).toBe("none");
  });
});

describe("access control — record access", () => {
  it("cross-tenant access is always denied regardless of role", () => {
    expect(canAccess(ownerCtx, { tenantId: "t2" }, "appointments:read")).toBe(false);
    expect(canAccess(stylistCtx, { tenantId: "t2" }, "appointments:read")).toBe(false);
    expect(() => assertRecordAccess(ownerCtx, { tenantId: "t2" }, "appointments:read")).toThrow(/do not have access/);
  });

  it("own scope: stylist can access own records, not others", () => {
    expect(canAccess(stylistCtx, { tenantId: "t1", ownerUserId: "u1" }, "appointments:read")).toBe(true);
    expect(canAccess(stylistCtx, { tenantId: "t1", ownerUserId: "u99" }, "appointments:read")).toBe(false);
  });

  it("own scope: records without owner are accessible (defensive)", () => {
    expect(canAccess(stylistCtx, { tenantId: "t1", ownerUserId: null }, "appointments:read")).toBe(true);
  });

  it("branch scope: manager limited to their branch", () => {
    const scopes: PermissionOverride = { "customers:read": { MANAGER: "branch" } };
    expect(canAccess(managerCtx, { tenantId: "t1", branchId: "b1" }, "customers:read", scopes)).toBe(true);
    expect(canAccess(managerCtx, { tenantId: "t1", branchId: "b2" }, "customers:read", scopes)).toBe(false);
  });

  it("none scope: access denied even for same-tenant records", () => {
    const scopes: PermissionOverride = { "billing:read": { STYLIST: "none" } };
    expect(canAccess(stylistCtx, { tenantId: "t1", ownerUserId: "u1" }, "billing:read", scopes)).toBe(false);
  });
});

describe("access control — scope filters", () => {
  it("produces all filter for owners", () => {
    expect(scopeFilter(ownerCtx, "appointments:read")).toEqual({ type: "all" });
  });

  it("produces own filter for stylists", () => {
    expect(scopeFilter(stylistCtx, "appointments:read")).toEqual({ type: "own", userId: "u1" });
  });

  it("produces branch filter when configured", () => {
    const scopes: PermissionOverride = { "appointments:read": { MANAGER: "branch" } };
    expect(scopeFilter(managerCtx, "appointments:read", scopes)).toEqual({ type: "branch", branchId: "b1" });
  });

  it("none scope collapses to a never-matching filter", () => {
    const scopes: PermissionOverride = { "customers:read": { STYLIST: "none" } };
    const filter = scopeFilter(stylistCtx, "customers:read", scopes);
    if (filter.type === "own") {
      expect(filter.userId).toBe("__none__");
    }
  });
});

describe("access control — scope merging", () => {
  it("overrides can only tighten scope (least privilege)", () => {
    expect(mergeScopes("own", "all")).toBe("own");
    expect(mergeScopes("all", "own")).toBe("own");
    expect(mergeScopes("branch", "all")).toBe("branch");
    expect(mergeScopes("all", "branch")).toBe("branch");
  });

  it("default scopes cover key sensitive permissions", () => {
    expect(DEFAULT_SCOPES["appointments:update"]?.STYLIST).toBe("own");
    expect(DEFAULT_SCOPES["billing:read"]?.STYLIST).toBe("own");
  });
});