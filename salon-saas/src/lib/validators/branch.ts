import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  isHQ: z.boolean().default(false),
});

export const updateBranchSchema = createBranchSchema.partial();

export const workingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:mm"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:mm"),
  isClosed: z.boolean().default(false),
}).refine((data: any) => data.isClosed || data.closeTime > data.openTime, {
  message: "Close time must be after open time",
  path: ["closeTime"],
});
