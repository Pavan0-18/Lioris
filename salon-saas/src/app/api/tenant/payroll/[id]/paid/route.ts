import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { payrollItems, staff } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const [item] = await db.select().from(payrollItems).innerJoin(staff, eq(payrollItems.staffId, staff.id)).where(and(eq(payrollItems.id, id), eq(staff.tenantId, tenantId)));
    if (!item) return apiError("Payroll item not found", "NOT_FOUND", 404);
    const [updated] = await db.update(payrollItems).set({ status: "paid", paidAt: new Date() }).where(eq(payrollItems.id, id)).returning();
    return apiSuccess(updated);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
