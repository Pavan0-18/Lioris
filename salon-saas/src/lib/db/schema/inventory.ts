import { pgTable, text, boolean, integer, real, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { services } from "./setup";
import { users } from "./auth";

export const productCategories = pgTable("product_categories", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("tenant_category_name_idx").on(table.tenantId, table.name),
]);

export const productBrands = pgTable("product_brands", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("tenant_brand_name_idx").on(table.tenantId, table.name),
]);

export const productUnits = pgTable("product_units", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("tenant_unit_name_idx").on(table.tenantId, table.name),
]);

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => productCategories.id),
  brandId: text("brand_id").references(() => productBrands.id),
  unitId: text("unit_id").references(() => productUnits.id),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  description: text("description"),
  sellingPrice: real("selling_price").notNull().default(0),
  costPrice: real("cost_price").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(0),
  expiryDate: timestamp("expiry_date", { mode: "date" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("tenant_sku_idx").on(table.tenantId, table.sku),
  index("tenant_product_active_idx").on(table.tenantId, table.isActive),
]);

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["purchase", "usage", "wastage", "adjustment"] }).notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: real("unit_cost"),
  reference: text("reference"),
  note: text("note"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("transaction_tenant_product_idx").on(table.tenantId, table.productId),
  index("transaction_tenant_type_idx").on(table.tenantId, table.type),
  index("transaction_tenant_created_idx").on(table.tenantId, table.createdAt),
]);

export const serviceProductUsage = pgTable("service_product_usage", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantityUsed: real("quantity_used").notNull().default(0),
  unitId: text("unit_id").references(() => productUnits.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("spu_tenant_service_idx").on(table.tenantId, table.serviceId),
  uniqueIndex("spu_tenant_service_product_idx").on(table.tenantId, table.serviceId, table.productId),
]);

export const inventoryWastage = pgTable("inventory_wastage", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  reason: text("reason", { enum: ["expired", "damaged", "lost", "spilled", "other"] }).notNull(),
  notes: text("notes"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("wastage_tenant_idx").on(table.tenantId),
  index("wastage_tenant_product_idx").on(table.tenantId, table.productId),
  index("wastage_tenant_created_idx").on(table.tenantId, table.createdAt),
]);
