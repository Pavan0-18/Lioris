import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature, hasFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { redeemLoyaltyPoints } from "@/lib/loyalty";
import { redeemLoyaltySchema } from "@/lib/validators/billing";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const loyaltyEnabled = await hasFeature(tenantId, "LOYALTY");
    if (!loyaltyEnabled) return apiError("LOYALTY feature not enabled", "FEATURE_NOT_ENABLED", 403);

    const { id } = await params;
    const body = await req.json();
    const parsed = redeemLoyaltySchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, "VALIDATION_ERROR", 400);

    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
    if (!inv) return apiError("Invoice not found", "NOT_FOUND", 404);

    const result = await redeemLoyaltyPoints(inv.customerId, id, parsed.data.points, tenantId);

    return apiSuccess({
      discountApplied: result.discountApplied,
      remainingPoints: result.remainingPoints,
      invoiceTotal: inv.total - result.discountApplied,
    });
  } catch (err: any) {
    if (err.message?.includes("Insufficient") || err.message?.includes("Cannot redeem") || err.message?.includes("not found")) {
      return apiError(err.message, "VALIDATION_ERROR", 400);
    }
    return apiErrorFromException(err);
  }
}
