import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  categoryId: z.string().min(1, "Category is required"),
  duration: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(75),
    z.literal(90),
    z.literal(120),
  ]),
  price: z.number().positive("Price must be positive"),
  taxable: z.boolean().default(true),
  description: z.string().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().optional(),
});
