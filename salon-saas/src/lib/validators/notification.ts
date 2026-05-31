import { z } from "zod";

export const updateNotificationSchema = z.object({
  isRead: z.boolean(),
});

export const markAllReadSchema = z.object({
  ids: z.array(z.string()).optional(),
});
