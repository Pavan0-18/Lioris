import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { features } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") return apiError("Forbidden", "FORBIDDEN", 403);

    const { id } = await params;
    const body = await req.json();
    const { isActive, name, description } = body;

    const [updated] = await db
      .update(features)
      .set({ isActive, name, description })
      .where(eq(features.id, id))
      .returning();

    if (!updated) return apiError("Feature not found", "NOT_FOUND", 404);
    return apiSuccess({ feature: updated });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
