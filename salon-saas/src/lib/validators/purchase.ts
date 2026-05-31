import { z } from "zod";

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitCost: z.number().nonnegative("Unit cost must be non-negative"),
  totalCost: z.number().nonnegative("Total cost must be non-negative"),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
});
