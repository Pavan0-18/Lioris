import { pgTable, text, boolean, integer, real, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { branches, services } from "./setup";
import { staff } from "./staff";

export const customers = pgTable("customers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  gender: text("gender"),
  dob: timestamp("dob", { mode: "date" }),
  address: text("address"),
  notes: text("notes"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("tenant_phone_idx").on(table.tenantId, table.phone),
]);

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  staffId: text("staff_id").references(() => staff.id),
  startTime: timestamp("start_time", { mode: "date" }).notNull(),
  endTime: timestamp("end_time", { mode: "date" }).notNull(),
  status: text("status").notNull().default("scheduled"),
  type: text("type").notNull().default("booking"),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const appointmentServices = pgTable("appointment_services", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  appointmentId: text("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id),
  price: real("price").notNull(),
  duration: integer("duration").notNull(),
}, (table: any) => [
  uniqueIndex("appointment_service_idx").on(table.appointmentId, table.serviceId),
]);

export const appointmentReminders = pgTable("appointment_reminders", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  appointmentId: text("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  scheduledAt: timestamp("scheduled_at", { mode: "date" }).notNull(),
  sentAt: timestamp("sent_at", { mode: "date" }),
  status: text("status").notNull().default("pending"),
});
