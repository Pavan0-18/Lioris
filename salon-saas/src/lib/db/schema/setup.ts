import { pgTable, text, boolean, integer, real, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { users } from "./auth";

export const branches = pgTable("branches", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  phone: text("phone"),
  email: text("email"),
  isHQ: boolean("is_hq").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("idx_branches_tenant_active").on(table.tenantId, table.isActive),
]);

export const workingHours = pgTable("working_hours", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  openTime: text("open_time").notNull(),
  closeTime: text("close_time").notNull(),
  isClosed: boolean("is_closed").notNull().default(false),
});

export const branchHolidays = pgTable("branch_holidays", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  branchId: text("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  reason: text("reason"),
});

export const serviceCategories = pgTable("service_categories", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
}, (table: any) => [
  index("idx_service_categories_tenant").on(table.tenantId, table.isActive),
]);

export const services = pgTable("services", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => serviceCategories.id),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  price: real("price").notNull(),
  taxable: boolean("taxable").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("idx_services_tenant_active").on(table.tenantId, table.isActive),
  index("idx_services_tenant_category").on(table.tenantId, table.categoryId),
]);
