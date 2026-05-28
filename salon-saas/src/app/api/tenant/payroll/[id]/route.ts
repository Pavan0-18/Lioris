import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { payrollItems, staff } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const [item] = await db.select().from(payrollItems).innerJoin(staff, eq(payrollItems.staffId, staff.id)).where(and(eq(payrollItems.id, id), eq(staff.tenantId, tenantId)));
    if (!item) return apiError("Payroll item not found", "NOT_FOUND", 404);
    return apiSuccess(item);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { id } = await params;
    const body = await req.json();
    const { baseSalary, commissions, deductions, bonus, netSalary, notes } = body;
    const [updated] = await db.update(payrollItems).set({ baseSalary, commissions, deductions, bonus, netSalary, notes }).where(eq(payrollItems.id, id)).returning();
    if (!updated) return apiError("Payroll item not found", "NOT_FOUND", 404);
    return apiSuccess(updated);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
