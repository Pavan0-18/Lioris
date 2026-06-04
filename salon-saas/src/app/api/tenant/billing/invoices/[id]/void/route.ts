import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const { id } = await params;

    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
    if (!inv) return apiError("Invoice not found", "NOT_FOUND", 404);
    if (inv.status === "paid") return apiError("Cannot void a paid invoice", "INVALID_STATE", 400);
    if (inv.status === "void") return apiError("Invoice is already voided", "INVALID_STATE", 400);

    const [updated] = await db.update(invoices)
      .set({ status: "void", updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
      .returning();

    return apiSuccess(updated);
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
