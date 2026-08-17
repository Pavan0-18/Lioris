import { pgTable, text, boolean, integer, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { users } from "./auth";

export const modules = pgTable("modules", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("operations"),
  version: text("version").notNull().default("1.0.0"),
  icon: text("icon"),
  isSystem: boolean("is_system").notNull().default(false),
  globalEnabled: boolean("global_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const tenantModules = pgTable("tenant_modules", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  moduleKey: text("module_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config"),
  enabledAt: timestamp("enabled_at", { mode: "date" }),
  disabledAt: timestamp("disabled_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("tenant_module_idx").on(table.tenantId, table.moduleKey),
  index("tenant_module_tenant_idx").on(table.tenantId),
]);

export const tenantConfigs = pgTable("tenant_configs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  version: integer("version").notNull().default(1),
  updatedById: text("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("tenant_config_key_idx").on(table.tenantId, table.key),
]);

export const tenantConfigVersions = pgTable("tenant_config_versions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  version: integer("version").notNull(),
  value: jsonb("value").notNull(),
  changedById: text("changed_by_id").references(() => users.id),
  changeNote: text("change_note"),
  changedAt: timestamp("changed_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("tenant_config_version_idx").on(table.tenantId, table.key, table.version),
  index("tenant_config_version_lookup_idx").on(table.tenantId, table.key),
]);

export const entities = pgTable("entities", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  singular: text("singular").notNull(),
  description: text("description"),
  icon: text("icon"),
  moduleKey: text("module_key").notNull().default("custom"),
  isSystem: boolean("is_system").notNull().default(false),
  config: jsonb("config"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("entity_tenant_key_idx").on(table.tenantId, table.key),
  index("entity_tenant_idx").on(table.tenantId),
]);

export const entityFields = pgTable("entity_fields", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  entityId: text("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull().default("text"),
  required: boolean("required").notNull().default(false),
  unique: boolean("unique").notNull().default(false),
  options: jsonb("options"),
  defaultValue: text("default_value"),
  placeholder: text("placeholder"),
  position: integer("position").notNull().default(0),
  isSystem: boolean("is_system").notNull().default(false),
  config: jsonb("config"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("entity_field_key_idx").on(table.entityId, table.key),
  index("entity_field_tenant_idx").on(table.tenantId),
]);

export const entityRecords = pgTable("entity_records", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  entityId: text("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  fieldValues: jsonb("field_values").notNull().default({}),
  createdById: text("created_by_id").references(() => users.id),
  updatedById: text("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("entity_record_tenant_idx").on(table.tenantId, table.entityId),
]);

export const workflows = pgTable("workflows", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  entityKey: text("entity_key"),
  triggerType: text("trigger_type").notNull().default("record.created"),
  triggerConfig: jsonb("trigger_config"),
  conditions: jsonb("conditions"),
  actions: jsonb("actions").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  runCount: integer("run_count").notNull().default(0),
  lastRunAt: timestamp("last_run_at", { mode: "date" }),
  createdById: text("created_by_id").references(() => users.id),
  updatedById: text("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("workflow_tenant_key_idx").on(table.tenantId, table.key),
  index("workflow_tenant_active_idx").on(table.tenantId, table.isActive),
]);

export const workflowRuns = pgTable("workflow_runs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workflowId: text("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  entityKey: text("entity_key"),
  recordId: text("record_id"),
  status: text("status").notNull().default("success"),
  error: text("error"),
  actionsExecuted: integer("actions_executed").notNull().default(0),
  durationMs: integer("duration_ms"),
  triggeredById: text("triggered_by_id"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("workflow_run_tenant_idx").on(table.tenantId, table.workflowId),
  index("workflow_run_lookup_idx").on(table.tenantId, table.createdAt),
]);

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  workflowId: text("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
  url: text("url").notNull(),
  payload: jsonb("payload"),
  status: text("status").notNull().default("pending"),
  statusCode: integer("status_code"),
  attempts: integer("attempts").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at", { mode: "date" }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("webhook_delivery_tenant_idx").on(table.tenantId, table.status),
]);