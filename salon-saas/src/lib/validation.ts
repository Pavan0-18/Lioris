import { z } from "zod";

/**
 * Validate request body against schema
 */
export function validateBody<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = new Error("Invalid request body") as any;
    error.code = "INVALID_INPUT";
    error.statusCode = 400;
    error.details = result.error.errors;
    throw error;
  }
  return result.data;
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(schema: z.ZodType<T>, url: URL): T {
  const params = Object.fromEntries(url.searchParams);
  const result = schema.safeParse(params);
  if (!result.success) {
    const error = new Error("Invalid query parameters") as any;
    error.code = "INVALID_INPUT";
    error.statusCode = 400;
    error.details = result.error.errors;
    throw error;
  }
  return result.data;
}

// Common validation schemas
export const idSchema = z.string().min(1, "ID is required");

export const dateSchema = z.string().datetime().or(z.date());

export const emailSchema = z.string().email("Invalid email address");

export const phoneSchema = z
  .string()
  .min(7, "Invalid phone number")
  .max(15, "Invalid phone number");

export const currencySchema = z.number().positive("Amount must be positive");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  from: dateSchema,
  to: dateSchema,
});

export const roleSchema = z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "STYLIST"]);

// Appointment validation schemas
export const appointmentCreateSchema = z.object({
  branchId: idSchema,
  customerId: idSchema,
  staffId: idSchema.optional().nullable(),
  startTime: dateSchema,
  serviceIds: z.array(idSchema).min(1, "At least one service is required"),
  notes: z.string().optional(),
  type: z.enum(["booking", "walk-in"]).default("booking"),
  recurrenceRule: z.enum(["weekly", "biweekly", "monthly"]).optional(),
  recurrenceEndDate: z.string().optional(),
});

export const appointmentUpdateSchema = z.object({
  staffId: idSchema.optional().nullable(),
  status: z.enum(["scheduled", "completed", "cancelled", "no-show"]).optional(),
  notes: z.string().optional(),
  cancelReason: z.string().optional(),
});

// Customer validation schemas
export const customerCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: phoneSchema,
  email: emailSchema.optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  dob: dateSchema.optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

// Staff validation schemas
export const staffCreateSchema = z.object({
  userId: idSchema,
  branchId: idSchema,
  employeeCode: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: dateSchema.optional(),
  baseSalary: currencySchema.default(0),
  salaryType: z.enum(["hourly", "daily", "monthly"]).default("monthly"),
  commissionType: z.enum(["percentage", "fixed"]).default("percentage"),
  serviceIds: z.array(idSchema).default([]),
});

export const staffUpdateSchema = z.object({
  branchId: idSchema.optional(),
  designation: z.string().optional(),
  baseSalary: currencySchema.optional(),
  salaryType: z.enum(["hourly", "daily", "monthly"]).optional(),
  commissionType: z.enum(["percentage", "fixed"]).optional(),
});

export const staffRoleChangeSchema = z.object({
  role: roleSchema,
  reason: z.string().optional(),
});

// Service validation schemas
export const serviceCreateSchema = z.object({
  branchId: idSchema,
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  price: currencySchema,
  duration: z.number().int().positive("Duration must be in minutes").default(30),
  isActive: z.boolean().default(true),
});

export const serviceUpdateSchema = serviceCreateSchema.partial();

// Billing validation schemas
export const invoiceCreateSchema = z.object({
  customerId: idSchema,
  appointmentId: idSchema.optional(),
  items: z.array(
    z.object({
      serviceId: idSchema,
      quantity: z.number().int().min(1),
      price: currencySchema,
    })
  ),
  discount: currencySchema.default(0),
  notes: z.string().optional(),
});

// Attendance validation schemas
export const attendanceCreateSchema = z.object({
  staffId: idSchema,
  date: dateSchema,
  status: z.enum(["present", "absent", "leave", "holiday"]),
  note: z.string().optional(),
});

export const attendanceCheckInSchema = z.object({
  date: dateSchema.optional(),
});

// Shift scheduling schemas
export const shiftSchema = z.object({
  branchId: idSchema,
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const shiftsBulkSchema = z.object({
  shifts: z.array(shiftSchema),
});

// Leave request schemas
export const leaveRequestSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  type: z.enum(["annual", "sick", "personal", "other"]),
  reason: z.string().min(1, "Reason is required"),
});

export const leaveApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

// User/Staff update role schema
export const updateUserRoleSchema = z.object({
  role: roleSchema,
  reason: z.string().optional(),
});

// Settings validation schemas
export const settingsUpdateSchema = z.object({
  timezone: z.string().optional(),
  locale: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxLabel: z.string().optional(),
  currency: z.string().length(3).optional(),
});

// Branch validation schemas
export const branchCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  isActive: z.boolean().default(true),
});

export const branchUpdateSchema = branchCreateSchema.partial();
