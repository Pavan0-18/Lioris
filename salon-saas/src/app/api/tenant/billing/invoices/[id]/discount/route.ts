import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { applyDiscountSchema } from "@/lib/validators/billing";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const { id } = await params;
    const body = await req.json();
    const parsed = applyDiscountSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);

    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
    if (!inv) return apiError("Invoice not found", "NOT_FOUND", 404);
    if (inv.status !== "draft") return apiError("Only draft invoices can be modified", "INVALID_STATE", 400);

    const { discountType, discountValue } = parsed.data;
    const discountAmount = discountType === "percentage"
      ? inv.subtotal * (discountValue / 100)
      : discountValue;

    const clampedDiscount = Math.min(discountAmount, inv.subtotal);
    const newTotal = Math.max(0, inv.subtotal + inv.taxAmount - clampedDiscount);

    const [updated] = await db.update(invoices)
      .set({ discountAmount: clampedDiscount, total: newTotal, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .returning();

    return apiSuccess(updated);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
