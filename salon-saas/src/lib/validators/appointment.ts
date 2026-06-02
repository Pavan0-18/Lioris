import { z } from "zod";

export const APPOINTMENT_STATUSES = [
  "scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show",
] as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];

export const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled:   ["confirmed", "cancelled", "no_show"],
  confirmed:   ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled", "no_show"],
  completed:   [],
  cancelled:   [],
  no_show:     [],
};

const TERMINAL_STATUSES: AppointmentStatus[] = ["completed", "cancelled", "no_show"];

export function isValidTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return (STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function isTerminal(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  scheduled:   { label: "Scheduled",   color: "text-blue-700",   bg: "bg-blue-100"   },
  confirmed:   { label: "Confirmed",   color: "text-teal-700",   bg: "bg-teal-100"   },
  in_progress: { label: "In Progress", color: "text-amber-700",  bg: "bg-amber-100"  },
  completed:   { label: "Completed",   color: "text-green-700",  bg: "bg-green-100"  },
  cancelled:   { label: "Cancelled",   color: "text-gray-500",   bg: "bg-gray-100"   },
  no_show:     { label: "No Show",     color: "text-red-700",    bg: "bg-red-100"    },
};

export const createAppointmentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  branchId: z.string().min(1, "Branch is required"),
  staffId: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, "Select at least one service"),
  startTime: z.string().refine((val: string) => !isNaN(Date.parse(val)), "Invalid ISO string date"),
  type: z.enum(["booking", "walkin"]).default("booking"),
  notes: z.string().optional(),
});

export const createWalkinSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Customer phone is required"),
  branchId: z.string().min(1, "Branch is required"),
  serviceIds: z.array(z.string()).min(1, "Select at least one service"),
  staffId: z.string().optional(),
  startTime: z.string().refine((val: string) => !isNaN(Date.parse(val)), "Invalid date"),
});

export const rescheduleSchema = z.object({
  startTime: z.string().refine((val: string) => !isNaN(Date.parse(val)), "Invalid date"),
  staffId: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
  cancelReason: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
});

export const availabilityQuerySchema = z.object({
  branchId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().int().min(15),
  staffId: z.string().optional(),
});

export const quickCreateCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().or(z.literal("")),
});
