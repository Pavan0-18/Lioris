import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { invoices, invoiceItems, payments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const { id } = await params;

    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
    if (!inv) return apiError("Invoice not found", "NOT_FOUND", 404);

    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    const pmts = await db.select().from(payments).where(eq(payments.invoiceId, id));

    return apiSuccess({ ...inv, items, payments: pmts });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const { id } = await params;

    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
    if (!inv) return apiError("Invoice not found", "NOT_FOUND", 404);
    if (inv.status !== "draft") return apiError("Only draft invoices can be modified", "INVALID_STATE", 400);

    const body = await req.json();
    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.discountAmount !== undefined) {
      const discountAmount = Number(body.discountAmount);
      const newTotal = inv.subtotal + inv.taxAmount - discountAmount;
      updateData.discountAmount = discountAmount;
      updateData.total = Math.max(0, newTotal);
    }

    const [updated] = await db.update(invoices)
      .set(updateData)
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .returning();

    return apiSuccess(updated);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
