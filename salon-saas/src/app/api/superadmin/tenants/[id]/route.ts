import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants, tenantFeatures, features } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!tenant) return apiError("Tenant not found", "NOT_FOUND", 404);

    const mappedFeatures = await db.select()
      .from(features);

    const tenantFeaturesList = await db.select()
      .from(tenantFeatures)
      .where(eq(tenantFeatures.tenantId, id));

    const finalFeatures = mappedFeatures.map(f => {
      const active = tenantFeaturesList.find(tf => tf.featureId === f.id);
      return {
        id: f.id,
        name: f.name,
        key: f.key,
        isEnabled: active ? active.isEnabled : false
      };
    });

    return apiSuccess({
      ...tenant,
      featuresList: finalFeatures
    });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
