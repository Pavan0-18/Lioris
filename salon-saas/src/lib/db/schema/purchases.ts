import { pgTable, text, real, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { vendors } from "./vendors";
import { products } from "./inventory";

export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  vendorId: text("vendor_id").references(() => vendors.id),
  invoiceNumber: text("invoice_number"),
  purchaseDate: timestamp("purchase_date", { mode: "date" }).notNull().defaultNow(),
  totalAmount: real("total_amount").notNull().default(0),
  notes: text("notes"),
  invoiceUrl: text("invoice_url"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("po_tenant_idx").on(table.tenantId),
  index("po_tenant_vendor_idx").on(table.tenantId, table.vendorId),
]);

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  purchaseOrderId: text("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitCost: real("unit_cost").notNull().default(0),
  totalCost: real("total_cost").notNull().default(0),
}, (table: any) => [
  index("poi_order_idx").on(table.purchaseOrderId),
]);
