import { z } from "zod";

export const createProductCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

export const createProductBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  description: z.string().optional(),
});

export const createProductUnitSchema = z.object({
  name: z.string().min(1, "Unit name is required"),
  abbreviation: z.string().min(1, "Abbreviation is required"),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitId: z.string().optional(),
  description: z.string().optional(),
  sellingPrice: z.number().nonnegative("Selling price must be non-negative"),
  costPrice: z.number().nonnegative("Cost price must be non-negative"),
  reorderLevel: z.number().int().nonnegative("Reorder level must be non-negative"),
  expiryDate: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const createAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  type: z.enum(["purchase", "usage", "wastage", "adjustment"]),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitCost: z.number().nonnegative().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export const createServiceProductUsageSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  productId: z.string().min(1, "Product is required"),
  quantityUsed: z.number().positive("Quantity must be positive"),
  unitId: z.string().optional(),
});

export const createWastageSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  reason: z.enum(["expired", "damaged", "lost", "spilled", "other"]),
  notes: z.string().optional(),
});
