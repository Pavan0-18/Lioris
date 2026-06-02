import { z } from "zod";

// ─── Existing schemas from Epic 4 ─────────────────────────────────
export const createInvoiceFromAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
});

export const addPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["cash", "card", "upi", "wallet", "other"]),
  notes: z.string().max(200).optional(),
});

export const applyDiscountSchema = z.object({
  discountType: z.enum(["flat", "percentage"]),
  discountValue: z.number().min(0),
});

// ─── Manual invoice creation ──────────────────────────────────────
export const createManualInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  branchId:   z.string().min(1, "Branch is required"),
  items: z.array(z.object({
    name:      z.string().min(1, "Item name required"),
    price:     z.number().positive("Price must be greater than 0"),
    qty:       z.number().int().positive().default(1),
    serviceId: z.string().optional(),
    discount:  z.number().min(0).max(100).default(0),
  })).min(1, "At least one item required"),
  notes:    z.string().max(500).optional(),
  discount: z.number().min(0).default(0),
});

// ─── Split payment ────────────────────────────────────────────────
export const splitPaymentSchema = z.object({
  payments: z.array(z.object({
    amount: z.number().positive(),
    method: z.enum(["cash", "card", "upi", "wallet", "other"]),
    notes:  z.string().max(200).optional(),
  })).min(1).refine(
    payments => payments.every(p => p.amount > 0),
    "All payment amounts must be positive"
  ),
});

// ─── Loyalty ──────────────────────────────────────────────────────
export const redeemLoyaltySchema = z.object({
  invoiceId: z.string().min(1),
  points:    z.number().int().positive("Points must be a positive integer"),
});

// ─── Invoice filters ──────────────────────────────────────────────
export const invoiceFilterSchema = z.object({
  status: z.enum(["draft", "partial", "paid", "void"]).optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
