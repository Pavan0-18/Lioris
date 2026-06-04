import { pgTable, text, real, boolean, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { staff } from "./staff";
import { services, branches } from "./setup";
import { customers } from "./appointments";

export const coupons = pgTable("coupons", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  type: text("type").notNull().default("percentage"),
  value: real("value").notNull(),
  minPurchase: real("min_purchase").default(0),
  maxDiscount: real("max_discount"),
  usageLimit: integer("usage_limit").default(0),
  usedCount: integer("used_count").notNull().default(0),
  appliesTo: text("applies_to"),
  startsAt: timestamp("starts_at", { mode: "date" }),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("coupon_code_idx").on(table.tenantId, table.code),
]);

export const giftCards = pgTable("gift_cards", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  initialBalance: real("initial_balance").notNull(),
  balance: real("balance").notNull(),
  senderName: text("sender_name"),
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  message: text("message"),
  purchasedById: text("purchased_by_id").references(() => customers.id),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const packages = pgTable("packages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  totalVisits: integer("total_visits").notNull(),
  validityDays: integer("validity_days"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurringPrice: real("recurring_price"),
  recurringInterval: text("recurring_interval"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const packageServices = pgTable("package_services", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  packageId: text("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  includedVisits: integer("included_visits").notNull().default(1),
}, (table: any) => [
  uniqueIndex("pkg_svc_idx").on(table.packageId, table.serviceId),
]);

export const customerPackages = pgTable("customer_packages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  packageId: text("package_id").notNull().references(() => packages.id),
  visitsUsed: integer("visits_used").notNull().default(0),
  visitsRemaining: integer("visits_remaining").notNull(),
  purchasedAt: timestamp("purchased_at", { mode: "date" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  isActive: boolean("is_active").notNull().default(true),
  autoRenew: boolean("auto_renew").notNull().default(false),
});

export const shiftHandovers = pgTable("shift_handovers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id),
  fromStaffId: text("from_staff_id").notNull().references(() => staff.id),
  toStaffId: text("to_staff_id").references(() => staff.id),
  notes: text("notes").notNull(),
  priority: text("priority").notNull().default("normal"),
  isCompleted: boolean("is_completed").notNull().default(false),
  shiftDate: timestamp("shift_date", { mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const cashDrawer = pgTable("cash_drawer", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id),
  openedBy: text("opened_by").notNull().references(() => staff.id),
  closedBy: text("closed_by").references(() => staff.id),
  openingBalance: real("opening_balance").notNull(),
  closingBalance: real("closing_balance"),
  expectedBalance: real("expected_balance"),
  difference: real("difference"),
  cashSales: real("cash_sales").default(0),
  cardSales: real("card_sales").default(0),
  tipsCollected: real("tips_collected").default(0),
  notes: text("notes"),
  openedAt: timestamp("opened_at", { mode: "date" }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { mode: "date" }),
});
