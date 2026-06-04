import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { invoices, payments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { splitPaymentSchema } from "@/lib/validators/billing";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const { id } = await params;
    const body = await req.json();
    const parsed = splitPaymentSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);

    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
    if (!inv) return apiError("Invoice not found", "NOT_FOUND", 404);
    if (inv.status === "paid" || inv.status === "void") return apiError("Invoice already paid or voided", "INVALID_STATE", 400);

    const existingPmts = await db.select({ amount: payments.amount }).from(payments).where(eq(payments.invoiceId, id));
    const existingTotal = existingPmts.reduce((s, p) => s + p.amount, 0);
    const newTotal = parsed.data.payments.reduce((s, p) => s + p.amount, 0);

    if (Math.abs(existingTotal + newTotal - inv.total) > 0.01 && existingTotal + newTotal > inv.total) {
      return apiError("Total payments exceed invoice total", "OVERPAYMENT", 400);
    }

    const insertedPayments: any[] = [];
    for (const p of parsed.data.payments) {
      const [pmt] = await db.insert(payments).values({
        invoiceId: id,
        tenantId,
        amount: p.amount,
        method: p.method,
        notes: p.notes || null,
      }).returning();
      insertedPayments.push(pmt);
    }

    const allPayments = [...existingPmts, ...insertedPayments];
    const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
    const newStatus = totalPaid >= inv.total ? "paid" : "partial";

    await db.update(invoices)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(invoices.id, id));

    if (newStatus === "paid") {
      try {
        await inngest.send({ name: "invoice/paid", data: { invoiceId: id, tenantId } as any });
      } catch {}
    }

    return apiSuccess({ payments: insertedPayments, invoiceStatus: newStatus });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
