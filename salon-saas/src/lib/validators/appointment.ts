import { z } from "zod";

export const createAppointmentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  branchId: z.string().min(1, "Branch is required"),
  staffId: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, "Select at least one service"),
  startTime: z.string().refine((val: string) => !isNaN(Date.parse(val)), "Invalid ISO string date"),
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

export const statusTransitionSchema = z.object({
  status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]),
  reason: z.string().optional(),
  note: z.string().optional(),
});
