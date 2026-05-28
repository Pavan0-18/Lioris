import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants, tenantFeatures, planFeatures, plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateFeatureCache } from "@/lib/feature-gate";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") return apiError("Forbidden", "FORBIDDEN", 403);

    const { id } = await params;
    const { planId } = await req.json();

    const [oldPlan] = await db.select({ name: plans.name }).from(plans).where(eq(plans.id, planId));

    await db.delete(tenantFeatures).where(eq(tenantFeatures.tenantId, id));

    const pf = await db.select().from(planFeatures).where(eq(planFeatures.planId, planId));
    if (pf.length) {
      await db.insert(tenantFeatures).values(pf.map((row) => ({
        tenantId: id,
        featureId: row.featureId,
        isEnabled: true,
        limit: row.limit,
      }))).onConflictDoNothing();
    }

    await db.update(tenants).set({ planId, updatedAt: new Date() }).where(eq(tenants.id, id));
    await invalidateFeatureCache(id);

    await createAuditLog({
      tenantId: id,
      userId: session.user.id,
      action: "change_plan",
      entityType: "tenant",
      entityId: id,
      changes: { planId, planName: oldPlan?.name },
    });

    return apiSuccess({ ok: true });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
