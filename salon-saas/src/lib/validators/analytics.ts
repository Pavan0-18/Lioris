import { z } from "zod";

export const analyticsQuerySchema = z.object({
  branchId:  z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy:   z.enum(["day", "week", "month"]).optional().default("day"),
});

export const reportPeriodSchema = z.object({
  period: z.enum(["today", "yesterday", "week", "month", "custom"]),
  startDate: z.string().optional(),
  endDate:   z.string().optional(),
});
