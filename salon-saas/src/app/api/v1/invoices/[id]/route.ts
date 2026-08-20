import { createPublicApiHandler } from "@/lib/public-api-handler";
import { db } from "@/lib/db";
import { invoices, invoiceItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const GET = createPublicApiHandler(
  async (req, context) => {
    const { id } = await context.params;

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, context.tenantId), eq(invoices.id, id)))
      .limit(1);
    if (!invoice) {
      const error = new Error("Invoice not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));

    return { invoice, items };
  },
  { requiredScope: "invoices:read" }
);