import { z } from "zod";

export const createCustomerSchema = z.object({
  name:    z.string().min(2, "Name must be at least 2 characters").max(100),
  phone:   z.string().min(7, "Phone is required").max(20),
  email:   z.string().email().optional().or(z.literal("")),
  gender:  z.enum(["male", "female", "other"]).optional(),
  dob:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  address: z.string().max(255).optional(),
  notes:   z.string().max(1000).optional(),
  tags:    z.array(z.string().max(30)).max(10).optional(),
  preferredContactMethod: z.enum(["whatsapp", "in_app"]).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerFilterSchema = z.object({
  search:   z.string().optional(),
  tags:     z.array(z.string()).optional(),
  segment:  z.enum(["all", "repeat", "inactive", "new"]).optional().default("all"),
  sortBy:   z.enum(["name", "visits", "spending", "lastVisit", "createdAt"])
             .optional().default("name"),
  sortDir:  z.enum(["asc", "desc"]).optional().default("asc"),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

export const addTagSchema = z.object({
  tag: z.string().min(1).max(30),
});

export const updatePreferencesSchema = z.object({
  notes:             z.string().max(1000).optional(),
  preferredStaffId:  z.string().optional(),
  preferredServices: z.array(z.string()).optional(),
  preferredContactMethod: z.enum(["whatsapp", "in_app"]).optional(),
});
