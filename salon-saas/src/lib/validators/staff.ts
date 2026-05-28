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
