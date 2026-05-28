import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { payrollItems, staff, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const url = new URL(req.url);
    const month = Number(url.searchParams.get("month"));
    const year = Number(url.searchParams.get("year"));

    const list = await db.select()
      .from(payrollItems)
      .innerJoin(staff, eq(payrollItems.staffId, staff.id))
      .innerJoin(users, eq(staff.userId, users.id))
      .where(and(eq(payrollItems.month, month), eq(payrollItems.year, year)));

    const mapped = list.map(item => ({
      id: item.payroll_items.id,
      baseSalary: item.payroll_items.baseSalary,
      commissions: item.payroll_items.commissions,
      deductions: item.payroll_items.deductions,
      bonus: item.payroll_items.bonus,
      netSalary: item.payroll_items.netSalary,
      status: item.payroll_items.status,
      staff: {
        id: item.staff.id,
        user: item.users
      }
    }));

    return apiSuccess(mapped);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
