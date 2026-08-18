import { pgTable, text, boolean, integer, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { users } from "./auth";
import { entities } from "./config";
import { staff } from "./staff";

export const entityForms = pgTable("entity_forms", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  entityId: text("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  layout: jsonb("layout").notNull().default({ sections: [] }),
  config: jsonb("config").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdById: text("created_by_id").references(() => users.id),
  updatedById: text("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("entity_form_tenant_idx").on(table.tenantId, table.entityId),
]);

export const entityViews = pgTable("entity_views", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  entityId: text("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("list"),
  config: jsonb("config").notNull().default({}),
  isDefault: boolean("is_default").notNull().default(false),
  createdById: text("created_by_id").references(() => users.id),
  updatedById: text("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("entity_view_tenant_idx").on(table.tenantId, table.entityId),
]);

export const dashboards = pgTable("dashboards", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  createdById: text("created_by_id").references(() => users.id),
  updatedById: text("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("dashboard_tenant_idx").on(table.tenantId),
]);

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  dashboardId: text("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull().default("count"),
  entityId: text("entity_id").references(() => entities.id, { onDelete: "cascade" }),
  config: jsonb("config").notNull().default({}),
  position: jsonb("position").notNull().default({ x: 0, y: 0, w: 4, h: 3 }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("dashboard_widget_tenant_idx").on(table.tenantId, table.dashboardId),
]);

export const reports = pgTable("reports", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  entityId: text("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  config: jsonb("config").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdById: text("created_by_id").references(() => users.id),
  updatedById: text("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("report_tenant_idx").on(table.tenantId),
]);

export const scheduleRules = pgTable("schedule_rules", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  isWorking: boolean("is_working").notNull().default(true),
  startTime: text("start_time"),
  endTime: text("end_time"),
  bufferMinutes: integer("buffer_minutes").notNull().default(0),
  maxConcurrent: integer("max_concurrent").notNull().default(1),
  notes: text("notes"),
  createdById: text("created_by_id").references(() => users.id),
  updatedById: text("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("schedule_rule_staff_day_idx").on(table.tenantId, table.staffId, table.dayOfWeek),
  index("schedule_rule_tenant_idx").on(table.tenantId),
]);

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  method: text("method").notNull().default("POST"),
  headers: jsonb("headers").notNull().default({}),
  secret: text("secret"),
  eventTypes: jsonb("event_types").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  lastDeliveryAt: timestamp("last_delivery_at", { mode: "date" }),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  createdById: text("created_by_id").references(() => users.id),
  updatedById: text("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("webhook_endpoint_tenant_name_idx").on(table.tenantId, table.name),
  index("webhook_endpoint_tenant_idx").on(table.tenantId),
]);
