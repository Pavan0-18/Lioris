export type Role = "OWNER" | "MANAGER" | "RECEPTIONIST" | "STYLIST" | "SUPER_ADMIN";

type Permission =
  | "appointments:read"
  | "appointments:create"
  | "appointments:update"
  | "appointments:delete"
  | "appointments:status"
  | "staff:read"
  | "staff:create"
  | "staff:update"
  | "staff:deactivate"
  | "staff:role_change"
  | "attendance:read"
  | "attendance:write"
  | "attendance:self_checkin"
  | "payroll:read"
  | "payroll:generate"
  | "payroll:approve"
  | "payroll:paid"
  | "billing:read"
  | "billing:create"
  | "billing:void"
  | "billing:payment"
  | "customers:read"
  | "customers:create"
  | "customers:update"
  | "settings:read"
  | "settings:update"
  | "reports:read"
  | "services:read"
  | "services:create"
  | "services:update"
  | "branches:read"
  | "branches:create"
  | "branches:update";

const matrix: Record<Role, Permission[]> = {
  SUPER_ADMIN: [],
  OWNER: [
    "appointments:read", "appointments:create", "appointments:update", "appointments:delete", "appointments:status",
    "staff:read", "staff:create", "staff:update", "staff:deactivate", "staff:role_change",
    "attendance:read", "attendance:write", "attendance:self_checkin",
    "payroll:read", "payroll:generate", "payroll:approve", "payroll:paid",
    "billing:read", "billing:create", "billing:void", "billing:payment",
    "customers:read", "customers:create", "customers:update",
    "settings:read", "settings:update",
    "reports:read",
    "services:read", "services:create", "services:update",
    "branches:read", "branches:create", "branches:update",
  ],
  MANAGER: [
    "appointments:read", "appointments:create", "appointments:update", "appointments:status",
    "staff:read", "staff:create", "staff:update",
    "attendance:read", "attendance:write",
    "payroll:read", "payroll:generate", "payroll:approve",
    "billing:read", "billing:create", "billing:void", "billing:payment",
    "customers:read", "customers:create", "customers:update",
    "settings:read",
    "reports:read",
    "services:read", "services:create", "services:update",
    "branches:read", "branches:update",
  ],
  RECEPTIONIST: [
    "appointments:read", "appointments:create", "appointments:update", "appointments:status",
    "customers:read", "customers:create", "customers:update",
    "billing:read", "billing:create", "billing:payment",
    "services:read",
    "branches:read",
    "attendance:self_checkin",
  ],
  STYLIST: [
    "appointments:read",
    "customers:read",
    "services:read",
    "attendance:self_checkin",
    "billing:read",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  if (role === "SUPER_ADMIN") return true;
  return matrix[role]?.includes(permission) ?? false;
}
