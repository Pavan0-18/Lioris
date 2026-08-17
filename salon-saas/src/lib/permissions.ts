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
  | "customers:delete"
  | "settings:read"
  | "settings:update"
  | "reports:read"
  | "leaves:create"
  | "leaves:approve"
  | "leaves:read"
  | "shifts:read"
  | "shifts:write"
  | "performance:read"
  | "services:read"
  | "services:create"
  | "services:update"
  | "services:delete"
  | "branches:read"
  | "branches:create"
  | "branches:update"
  | "marketing:read"
  | "marketing:create"
  | "marketing:update"
  | "marketing:delete"
  | "operations:read"
  | "operations:create"
  | "operations:update"
  | "operations:delete"
  | "inventory:read"
  | "inventory:create"
  | "inventory:update"
  | "inventory:delete"
  | "procurement:read"
  | "procurement:create"
  | "procurement:update"
  | "gift_cards:read"
  | "gift_cards:create"
  | "gift_cards:update"
  | "packages:read"
  | "packages:create"
  | "packages:update"
  | "subscriptions:read"
  | "subscriptions:manage"
  | "entities:manage"
  | "workflows:manage"
  | "modules:manage"
  | "config:manage";

export const matrix: Record<Role, Permission[]> = {
  SUPER_ADMIN: [],
  OWNER: [
    "appointments:read", "appointments:create", "appointments:update", "appointments:delete", "appointments:status",
    "staff:read", "staff:create", "staff:update", "staff:deactivate", "staff:role_change",
    "attendance:read", "attendance:write", "attendance:self_checkin",
    "payroll:read", "payroll:generate", "payroll:approve", "payroll:paid",
    "leaves:create", "leaves:approve", "leaves:read",
    "shifts:read", "shifts:write",
    "performance:read",
    "billing:read", "billing:create", "billing:void", "billing:payment",
    "customers:read", "customers:create", "customers:update", "customers:delete",
    "settings:read", "settings:update",
    "reports:read",
    "services:read", "services:create", "services:update", "services:delete",
    "branches:read", "branches:create", "branches:update",
    "marketing:read", "marketing:create", "marketing:update", "marketing:delete",
    "operations:read", "operations:create", "operations:update", "operations:delete",
    "inventory:read", "inventory:create", "inventory:update", "inventory:delete",
    "procurement:read", "procurement:create", "procurement:update",
    "gift_cards:read", "gift_cards:create", "gift_cards:update",
    "packages:read", "packages:create", "packages:update",
    "subscriptions:read", "subscriptions:manage",
    "entities:manage", "workflows:manage", "modules:manage", "config:manage",
  ],
  MANAGER: [
    "appointments:read", "appointments:create", "appointments:update", "appointments:status",
    "staff:read", "staff:create", "staff:update",
    "attendance:read", "attendance:write",
    "payroll:read", "payroll:generate", "payroll:approve",
    "leaves:create", "leaves:approve", "leaves:read",
    "shifts:read", "shifts:write",
    "performance:read",
    "billing:read", "billing:create", "billing:void", "billing:payment",
    "customers:read", "customers:create", "customers:update",
    "settings:read",
    "reports:read",
    "services:read", "services:create", "services:update",
    "branches:read", "branches:update",
    "marketing:read", "marketing:create", "marketing:update", "marketing:delete",
    "operations:read", "operations:create", "operations:update", "operations:delete",
    "inventory:read", "inventory:create", "inventory:update",
    "procurement:read", "procurement:create",
    "gift_cards:read", "gift_cards:create",
    "packages:read", "packages:create",
    "subscriptions:read",
    "entities:manage", "workflows:manage", "modules:manage", "config:manage",
  ],
  RECEPTIONIST: [
    "appointments:read", "appointments:create", "appointments:update", "appointments:status",
    "customers:read", "customers:create", "customers:update",
    "billing:read", "billing:create", "billing:payment",
    "services:read",
    "branches:read",
    "attendance:self_checkin",
    "marketing:read",
    "operations:read", "operations:create",
    "inventory:read",
    "procurement:read",
  ],
  STYLIST: [
    "appointments:read",
    "customers:read",
    "services:read",
    "attendance:self_checkin",
    "billing:read",
    "leaves:create",
    "leaves:read",
    "shifts:read",
    "performance:read",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  if (role === "SUPER_ADMIN") return true;
  return matrix[role]?.includes(permission) ?? false;
}
