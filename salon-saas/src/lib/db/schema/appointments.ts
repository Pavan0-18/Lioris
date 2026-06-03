import { pgTable, text, boolean, integer, real, timestamp, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
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
  tags: text("tags").array(),
  imageUrl: text("image_url"),
  preferredContactMethod: text("preferred_contact_method").$type<"whatsapp" | "in_app" | null>(),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("idx_customer_tenant_id").on(table.tenantId),
  index("idx_customer_name").on(table.name),
  index("idx_customer_phone").on(table.phone),
  index("idx_customer_tenant_name").on(table.tenantId, table.name),
  index("idx_customer_tenant_phone").on(table.tenantId, table.phone),
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
  depositAmount: real("deposit_amount").default(0),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  noShowFee: real("no_show_fee").default(0),
  recurrenceRule: text("recurrence_rule"),
  recurrenceEndDate: timestamp("recurrence_end_date", { mode: "date" }),
  recurrenceParentId: text("recurrence_parent_id"),
}, (table: any) => [
  index("idx_appointment_tenant_start").on(table.tenantId, table.startTime),
  index("idx_appointment_tenant_staff").on(table.tenantId, table.staffId),
  index("idx_appointment_tenant_customer").on(table.tenantId, table.customerId),
]);

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

export const waitlist = pgTable("waitlist", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id),
  customerId: text("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  serviceIds: text("service_ids").array().notNull(),
  preferredDate: timestamp("preferred_date", { mode: "date" }),
  preferredStaffId: text("preferred_staff_id"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("idx_waitlist_tenant_branch").on(table.tenantId, table.branchId),
  index("idx_waitlist_status").on(table.status),
]);

export const appointmentEvents = pgTable("appointment_events", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  appointmentId: text("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("idx_appointment_events_tenant_created").on(table.tenantId, table.createdAt),
]);
