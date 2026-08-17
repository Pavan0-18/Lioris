import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { invoices, payments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { emitDomainEvent } from "@/lib/workflows/engine";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const { id } = await params;

    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
    if (!inv) return apiError("Invoice not found", "NOT_FOUND", 404);
    if (inv.status === "paid" || inv.status === "void") return apiError("Invoice already paid or voided", "INVALID_STATE", 400);

    const body = await req.json();
    const { amount, method, notes } = body;

    if (!amount || amount <= 0) return apiError("Invalid payment amount", "VALIDATION_ERROR", 400);

    const [payment] = await db.insert(payments).values({
      invoiceId: id,
      tenantId,
      amount,
      method: method || "cash",
      notes: notes || null,
    }).returning();

    const existingPayments = await db.select()
      .from(payments).where(eq(payments.invoiceId, id));

    const totalPaid = existingPayments.reduce((s, p) => s + p.amount, 0);

    let newStatus = "partial";
    if (totalPaid >= inv.total) newStatus = "paid";

    await db.update(invoices)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(invoices.id, id));

    if (newStatus === "paid") {
      try {
        await inngest.send({ name: "invoice/paid", data: { invoiceId: id, tenantId } as any });
      } catch {}
      await emitDomainEvent("status.changed", "invoice", {
        id,
        status: "paid",
        invoiceNo: inv.invoiceNo,
        total: inv.total,
        customerId: inv.customerId,
        branchId: inv.branchId,
      }, {
        tenantId,
        previousRecord: { id, status: inv.status },
        extra: { recordId: id },
      });
    }

    return apiSuccess({ payment, status: newStatus });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
