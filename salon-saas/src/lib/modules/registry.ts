export interface ModuleNavItem {
  label: string;
  href: string;
  permission?: string;
}

export interface ModuleDefinition {
  key: string;
  name: string;
  description: string;
  category: "core" | "commerce" | "operations" | "people" | "growth" | "platform";
  version: string;
  icon: string;
  isSystem?: boolean;
  defaultEnabled: boolean;
  dependencies?: string[];
  permissions: string[];
  navigation?: ModuleNavItem[];
  defaultConfig?: Record<string, any>;
}

export const MODULES: ModuleDefinition[] = [
  {
    key: "core",
    name: "Core Platform",
    description: "Dashboard, profile, notifications, and essential platform services. Cannot be disabled.",
    category: "core",
    version: "1.0.0",
    icon: "LayoutDashboard",
    isSystem: true,
    defaultEnabled: true,
    permissions: [],
    navigation: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Profile", href: "/profile" },
    ],
  },
  {
    key: "crm",
    name: "CRM",
    description: "Customers, contacts, organizations, and marketing outreach.",
    category: "commerce",
    version: "1.0.0",
    icon: "Users",
    defaultEnabled: true,
    permissions: [
      "customers:read", "customers:create", "customers:update", "customers:delete",
      "marketing:read", "marketing:create", "marketing:update", "marketing:delete",
    ],
    navigation: [
      { label: "Customers", href: "/customers", permission: "customers:read" },
      { label: "Marketing", href: "/marketing", permission: "marketing:read" },
    ],
  },
  {
    key: "scheduling",
    name: "Scheduling",
    description: "Appointments, calendar, check-in, and waitlist for any resource-based business.",
    category: "operations",
    version: "1.0.0",
    icon: "Calendar",
    defaultEnabled: true,
    permissions: [
      "appointments:read", "appointments:create", "appointments:update", "appointments:delete", "appointments:status",
      "operations:read", "operations:create", "operations:update",
    ],
    navigation: [
      { label: "Appointments", href: "/appointments", permission: "appointments:read" },
      { label: "Check-In", href: "/check-in", permission: "appointments:read" },
      { label: "Waitlist", href: "/waitlist", permission: "appointments:read" },
    ],
  },
  {
    key: "pos",
    name: "Billing & POS",
    description: "Invoices, payments, gift cards, and packages.",
    category: "commerce",
    version: "1.0.0",
    icon: "Receipt",
    defaultEnabled: true,
    permissions: [
      "billing:read", "billing:create", "billing:void", "billing:payment",
      "gift_cards:read", "gift_cards:create", "gift_cards:update",
      "packages:read", "packages:create", "packages:update",
    ],
    navigation: [
      { label: "Billing", href: "/billing", permission: "billing:read" },
      { label: "Gift Cards", href: "/gift-cards", permission: "billing:read" },
      { label: "Packages", href: "/packages", permission: "billing:read" },
    ],
  },
  {
    key: "inventory",
    name: "Inventory",
    description: "Products, stock, adjustments, transfers, wastage, and procurement.",
    category: "operations",
    version: "1.0.0",
    icon: "Package",
    defaultEnabled: true,
    permissions: [
      "inventory:read", "inventory:create", "inventory:update", "inventory:delete",
      "procurement:read", "procurement:create", "procurement:update",
    ],
    navigation: [
      { label: "Inventory", href: "/inventory", permission: "inventory:read" },
      { label: "Procurement", href: "/procurement", permission: "procurement:read" },
    ],
  },
  {
    key: "workforce",
    name: "Workforce & HR",
    description: "Staff, schedules, attendance, leaves, payroll, and performance.",
    category: "people",
    version: "1.0.0",
    icon: "Users2",
    defaultEnabled: true,
    permissions: [
      "staff:read", "staff:create", "staff:update", "staff:deactivate", "staff:role_change",
      "attendance:read", "attendance:write", "attendance:self_checkin",
      "payroll:read", "payroll:generate", "payroll:approve", "payroll:paid",
      "leaves:create", "leaves:approve", "leaves:read",
      "shifts:read", "shifts:write",
      "performance:read",
    ],
    navigation: [
      { label: "Staff", href: "/staff", permission: "staff:read" },
      { label: "Attendance", href: "/staff/attendance", permission: "attendance:read" },
      { label: "Leaves", href: "/staff/leaves", permission: "leaves:read" },
      { label: "Payroll", href: "/staff/payroll", permission: "payroll:read" },
      { label: "Performance", href: "/staff/performance", permission: "performance:read" },
    ],
  },
  {
    key: "customization",
    name: "Business Builder",
    description: "Dynamic entities, custom fields, workflows, automations, and configuration.",
    category: "platform",
    version: "1.0.0",
    icon: "Blocks",
    defaultEnabled: true,
    permissions: [
      "entities:manage", "workflows:manage", "modules:manage", "config:manage",
    ],
    navigation: [
      { label: "Entities", href: "/settings/entities", permission: "entities:manage" },
      { label: "Workflows & Automations", href: "/settings/workflows", permission: "workflows:manage" },
      { label: "Modules", href: "/settings/modules", permission: "modules:manage" },
      { label: "Configuration", href: "/settings/config", permission: "config:manage" },
    ],
  },
  {
    key: "reports",
    name: "Reports & Analytics",
    description: "Business reports and performance analytics.",
    category: "operations",
    version: "1.0.0",
    icon: "BarChart3",
    defaultEnabled: true,
    permissions: ["reports:read"],
    navigation: [
      { label: "Reports", href: "/reports", permission: "reports:read" },
    ],
  },
  {
    key: "subscriptions",
    name: "Subscriptions",
    description: "Plans, self-serve billing, and subscription management.",
    category: "platform",
    version: "1.0.0",
    icon: "CreditCard",
    defaultEnabled: true,
    permissions: ["subscriptions:read", "subscriptions:manage"],
    navigation: [],
  },
];

export const MODULE_MAP: Record<string, ModuleDefinition> = Object.fromEntries(
  MODULES.map((m) => [m.key, m])
);

export function getModuleByKey(key: string): ModuleDefinition | undefined {
  return MODULE_MAP[key];
}

export function getCoreModuleKeys(): string[] {
  return MODULES.filter((m) => m.isSystem).map((m) => m.key);
}

export function resolveModuleDependencies(key: string): string[] {
  const resolved = new Set<string>();
  const visit = (k: string) => {
    if (resolved.has(k)) return;
    resolved.add(k);
    const def = MODULE_MAP[k];
    def?.dependencies?.forEach(visit);
  };
  visit(key);
  return [...resolved];
}