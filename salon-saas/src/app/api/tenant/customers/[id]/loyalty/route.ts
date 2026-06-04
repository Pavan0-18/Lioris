import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature, hasFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { POINT_VALUE } from "@/lib/loyalty";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const loyaltyEnabled = await hasFeature(tenantId, "LOYALTY");
    if (!loyaltyEnabled) return apiError("LOYALTY feature not enabled", "FEATURE_NOT_ENABLED", 403);

    const { id } = await params;
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!customer) return apiError("Customer not found", "NOT_FOUND", 404);

    const points = customer.loyaltyPoints || 0;
    return apiSuccess({
      points,
      pointValue: POINT_VALUE,
      equivalentValue: points * POINT_VALUE,
    });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const loyaltyEnabled = await hasFeature(tenantId, "LOYALTY");
    if (!loyaltyEnabled) return apiError("LOYALTY feature not enabled", "FEATURE_NOT_ENABLED", 403);

    const { id } = await params;
    const body = await req.json();
    const { adjustment, reason } = body;

    if (!adjustment || typeof adjustment !== "number") {
      return apiError("Adjustment amount is required", "VALIDATION_ERROR", 400);
    }

    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!customer) return apiError("Customer not found", "NOT_FOUND", 404);

    const newBalance = Math.max(0, (customer.loyaltyPoints || 0) + adjustment);
    await db.update(customers)
      .set({ loyaltyPoints: newBalance, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));

    return apiSuccess({ points: newBalance, adjustment, reason: reason || null });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
