import { type Role } from "@/lib/permissions";

export type Scope = "all" | "branch" | "own" | "none";

export interface ScopeContext {
  tenantId: string;
  userId: string;
  role: Role;
  branchId?: string | null;
}

export interface ResourceContext {
  tenantId: string;
  branchId?: string | null;
  ownerUserId?: string | null;
}

export interface PermissionOverride {
  [permission: string]: Partial<Record<Role, Scope>>;
}

export const DEFAULT_SCOPES: PermissionOverride = {
  "appointments:read": { STYLIST: "own" },
  "appointments:update": { STYLIST: "own" },
  "appointments:status": { STYLIST: "own" },
  "customers:read": { STYLIST: "own" },
  "customers:update": { STYLIST: "own" },
  "billing:read": { STYLIST: "own" },
};

const SCOPE_PRIORITY: Record<Scope, number> = { none: 0, own: 1, branch: 2, all: 3 };

export function mergeScopes(base: Scope, override: Scope | undefined): Scope {
  if (!override) return base;
  return SCOPE_PRIORITY[override] > SCOPE_PRIORITY[base] ? base : override;
}

export function resolveScope(
  role: Role,
  permission: string,
  tenantScopes?: PermissionOverride
): Scope {
  if (role === "SUPER_ADMIN") return "all";

  const tenantOverride = tenantScopes?.[permission]?.[role];
  if (tenantOverride) return tenantOverride;

  const defaultOverride = DEFAULT_SCOPES[permission]?.[role];
  if (defaultOverride) return defaultOverride;

  if (role === "OWNER" || role === "MANAGER") return "all";
  return "all";
}

export function canAccess(
  ctx: ScopeContext,
  resource: ResourceContext,
  permission: string,
  tenantScopes?: PermissionOverride
): boolean {
  if (ctx.tenantId !== resource.tenantId) return false;

  const scope = resolveScope(ctx.role, permission, tenantScopes);
  if (scope === "none") return false;
  if (scope === "all") return true;

  if (scope === "branch") {
    if (!ctx.branchId) return false;
    if (!resource.branchId) return true;
    return ctx.branchId === resource.branchId;
  }

  if (scope === "own") {
    if (!resource.ownerUserId) return true;
    return resource.ownerUserId === ctx.userId;
  }

  return true;
}

export function assertRecordAccess(
  ctx: ScopeContext,
  resource: ResourceContext,
  permission: string,
  tenantScopes?: PermissionOverride
): void {
  if (!canAccess(ctx, resource, permission, tenantScopes)) {
    const error = new Error("You do not have access to this record") as any;
    error.code = "FORBIDDEN";
    error.statusCode = 403;
    throw error;
  }
}

export function scopeFilter(
  ctx: ScopeContext,
  permission: string,
  tenantScopes?: PermissionOverride
): { type: "all" } | { type: "branch"; branchId: string } | { type: "own"; userId: string } {
  const scope = resolveScope(ctx.role, permission, tenantScopes);
  if (scope === "none") return { type: "own", userId: "__none__" };
  if (scope === "branch" && ctx.branchId) return { type: "branch", branchId: ctx.branchId };
  if (scope === "own") return { type: "own", userId: ctx.userId };
  return { type: "all" };
}