import { z } from "zod";

export const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "STYLIST"]),
  branchId: z.string().min(1, "Branch is required"),
  designation: z.string().optional(),
  employeeCode: z.string().optional(),
  joiningDate: z.string().optional(),
  baseSalary: z.number().nonnegative("Base salary must be positive"),
  salaryType: z.enum(["fixed", "hourly", "monthly"]),
  commissionType: z.enum(["percentage", "fixed", "none"]),
});

export const updateStaffSchema = createStaffSchema.partial().omit({ password: true });

export const attendanceSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  date: z.string().transform((str: string) => new Date(str)),
  status: z.enum(["present", "absent", "half_day", "leave"]),
  note: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
});

export const shiftSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
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

export const attendanceCheckInOutSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  date: z.string().transform((str: string) => new Date(str)),
  type: z.enum(["checkin", "checkout"]),
});
