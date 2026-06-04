import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "LOYALTY");

    const [tenant] = await db.select({
      pointsPerUnit: tenants.pointsPerUnit,
      pointValue: tenants.pointValue,
      maxRedeemPct: tenants.maxRedeemPct,
      freeServiceThreshold: tenants.freeServiceThreshold,
      loyaltyTiers: tenants.loyaltyTiers,
    })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) return apiError("Tenant not found", "NOT_FOUND", 404);

    return apiSuccess({
      pointsPerUnit: tenant.pointsPerUnit ?? 100,
      pointValue: tenant.pointValue ?? 1,
      maxRedeemPct: tenant.maxRedeemPct ?? 0.20,
      freeServiceThreshold: tenant.freeServiceThreshold ?? 0,
      loyaltyTiers: tenant.loyaltyTiers ? JSON.parse(tenant.loyaltyTiers) : [],
    });
  } catch {
    return apiError("Failed to load loyalty settings", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "LOYALTY");

    const body = await req.json();
    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (body.pointsPerUnit !== undefined) updateData.pointsPerUnit = body.pointsPerUnit;
    if (body.pointValue !== undefined) updateData.pointValue = body.pointValue;
    if (body.maxRedeemPct !== undefined) updateData.maxRedeemPct = body.maxRedeemPct;
    if (body.freeServiceThreshold !== undefined) updateData.freeServiceThreshold = body.freeServiceThreshold;
    if (body.loyaltyTiers !== undefined) updateData.loyaltyTiers = JSON.stringify(body.loyaltyTiers);

    await db.update(tenants)
      .set(updateData)
      .where(eq(tenants.id, tenantId));

    return apiSuccess({ success: true });
  } catch {
    return apiError("Failed to update loyalty settings", "INTERNAL_ERROR", 500);
  }
}
