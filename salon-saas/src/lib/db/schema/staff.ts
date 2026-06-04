import { pgTable, text, boolean, real, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { tenants } from "./tenants";
import { users } from "./auth";
import { branches, services } from "./setup";

export const staff = pgTable("staff", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().unique().references(() => users.id),
  branchId: text("branch_id").notNull().references(() => branches.id),
  employeeCode: text("employee_code"),
  designation: text("designation"),
  joiningDate: timestamp("joining_date", { mode: "date" }),
  baseSalary: real("base_salary").notNull().default(0),
  salaryType: text("salary_type").notNull().default("monthly"),
  commissionType: text("commission_type").notNull().default("percentage"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  // PERFORMANCE FIX: Add indexes for staff listing and filtering
  index("idx_staff_tenant_id").on(table.tenantId),
  index("idx_staff_tenant_active").on(table.tenantId, table.isActive),
]);

export const staffServices = pgTable("staff_services", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  commissionPct: real("commission_pct").notNull().default(0),
}, (table: any) => [
  uniqueIndex("staff_service_idx").on(table.staffId, table.serviceId),
]);

export const attendance = pgTable("attendance", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  checkIn: timestamp("check_in", { mode: "date" }),
  checkOut: timestamp("check_out", { mode: "date" }),
  status: text("status").notNull().default("present"),
  note: text("note"),
  markedBy: text("marked_by"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("staff_date_idx").on(table.staffId, table.date),
]);

export const commissions = pgTable("commissions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  staffId: text("staff_id").notNull().references(() => staff.id),
  invoiceId: text("invoice_id").notNull(),
  serviceId: text("service_id").notNull(),
  amount: real("amount").notNull(),
  percentage: real("percentage").notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const shifts = pgTable("shifts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  branchId: text("branch_id").notNull().references(() => branches.id),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  effectiveFrom: timestamp("effective_from", { mode: "date" }),
  effectiveTo: timestamp("effective_to", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("idx_shifts_staff").on(table.staffId, table.tenantId),
  index("idx_shifts_branch_day").on(table.branchId, table.dayOfWeek),
]);

export const leaveRequests = pgTable("leave_requests", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }).notNull(),
  type: text("type").notNull().default("annual"),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { mode: "date" }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  index("idx_leave_requests_staff").on(table.staffId, table.tenantId),
  index("idx_leave_requests_status").on(table.tenantId, table.status),
]);

export const payrollItems = pgTable("payroll_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  baseSalary: real("base_salary").notNull(),
  commissions: real("commissions").notNull().default(0),
  deductions: real("deductions").notNull().default(0),
  bonus: real("bonus").notNull().default(0),
  netSalary: real("net_salary").notNull(),
  status: text("status").notNull().default("draft"),
  paidAt: timestamp("paid_at", { mode: "date" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table: any) => [
  uniqueIndex("staff_payroll_idx").on(table.staffId, table.month, table.year),
]);
