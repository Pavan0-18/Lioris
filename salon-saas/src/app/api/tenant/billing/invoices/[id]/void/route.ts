import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const [updated] = await db.update(invoices).set({ status: "void", updatedAt: new Date() }).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId))).returning();
    if (!updated) return apiError("Invoice not found", "NOT_FOUND", 404);
    return apiSuccess(updated);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
