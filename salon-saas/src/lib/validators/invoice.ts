import { z } from "zod";

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  branchId: z.string().min(1, "Branch is required"),
  appointmentId: z.string().optional(),
  items: z.array(
    z.object({
      serviceId: z.string().optional(),
      name: z.string().min(1, "Item name is required"),
      price: z.number().positive(),
      qty: z.number().int().positive().default(1),
      discount: z.number().nonnegative().default(0),
      taxRate: z.number().nonnegative().default(0),
    })
  ).min(1, "Invoice must have at least one item"),
});

export const addPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.number().positive("Amount must be positive"),
  method: z.enum(["cash", "card", "upi", "wallet", "other"]),
  gatewayName: z.string().optional(),
  gatewayPaymentId: z.string().optional(),
  notes: z.string().optional(),
});
