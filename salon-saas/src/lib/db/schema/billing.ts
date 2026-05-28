import { pgTable, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { branches, services } from "./setup";
import { customers, appointments } from "./appointments";

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  appointmentId: text("appointment_id").unique(),
  invoiceNo: text("invoice_no").notNull(),
  subtotal: real("subtotal").notNull(),
  taxAmount: real("tax_amount").notNull().default(0),
  discountAmount: real("discount_amount").notNull().default(0),
  total: real("total").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  serviceId: text("service_id"),
  name: text("name").notNull(),
  price: real("price").notNull(),
  qty: integer("qty").notNull().default(1),
  discount: real("discount").notNull().default(0),
  taxRate: real("tax_rate").notNull().default(0),
  lineTotal: real("line_total").notNull(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id),
  amount: real("amount").notNull(),
  method: text("method").notNull(),
  gatewayName: text("gateway_name"),
  gatewayPaymentId: text("gateway_payment_id"),
  status: text("status").notNull().default("captured"),
  paidAt: timestamp("paid_at", { mode: "date" }).notNull().defaultNow(),
  notes: text("notes"),
});
