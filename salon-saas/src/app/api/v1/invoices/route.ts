import { createPublicApiHandler } from "@/lib/public-api-handler";
import { z } from "zod";
import { validateQuery } from "@/lib/validation";
import { db } from "@/lib/db";
import { invoices, customers } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

const listQuerySchema = z.object({
  status: z.string().max(30).optional(),
  customerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const GET = createPublicApiHandler(
  async (req, context) => {
    const url = new URL(req.url);
    const query = validateQuery(listQuerySchema, url);

    const conditions = and(
      eq(invoices.tenantId, context.tenantId),
      query.status ? eq(invoices.status, query.status) : undefined,
      query.customerId ? eq(invoices.customerId, query.customerId) : undefined
    );

    const rows = await db
      .select({
        id: invoices.id,
        invoiceNo: invoices.invoiceNo,
        customerId: invoices.customerId,
        customerName: customers.name,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        discountAmount: invoices.discountAmount,
        total: invoices.total,
        currency: invoices.currency,
        status: invoices.status,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(conditions)
      .orderBy(desc(invoices.createdAt))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return { invoices: rows, pagination: { page: query.page, limit: query.limit } };
  },
  { requiredScope: "invoices:read" }
);