import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") return apiError("Forbidden", "FORBIDDEN", 403);

    const { id } = await params;
    await db.update(tenants).set({ planStatus: "suspended", isActive: false, updatedAt: new Date() }).where(eq(tenants.id, id));

    await createAuditLog({ tenantId: id, userId: session.user.id, action: "suspend", entityType: "tenant", entityId: id });

    return apiSuccess({ ok: true });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
