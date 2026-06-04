import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "CRM");
    const { id } = await params;
    const body = await req.json();
    const { notes } = body;
    if (typeof notes !== "string" || notes.length > 1000) {
      return apiError("Notes must be a string of max 1000 characters", "VALIDATION_ERROR", 400);
    }

    const [existing] = await db.select().from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!existing) return apiError("Customer not found", "NOT_FOUND", 404);

    await db.update(customers)
      .set({ notes, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));

    return apiSuccess({ updated: true });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}
