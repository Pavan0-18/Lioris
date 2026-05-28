import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { plans, planFeatures } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") return apiError("Forbidden", "FORBIDDEN", 403);

    const { id } = await params;
    const body = await req.json();
    const { features: featureList, ...planData } = body;

    const [updated] = await db.update(plans).set({ ...planData, updatedAt: new Date() }).where(eq(plans.id, id)).returning();
    if (!updated) return apiError("Plan not found", "NOT_FOUND", 404);

    if (featureList !== undefined) {
      await db.delete(planFeatures).where(eq(planFeatures.planId, id));
      if (featureList.length) {
        await db.insert(planFeatures).values(
          featureList.map((f: any) => ({ planId: id, featureId: f.featureId, limit: f.limit ?? null }))
        ).onConflictDoNothing();
      }
    }

    return apiSuccess({ plan: updated });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
