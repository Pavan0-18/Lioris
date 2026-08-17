import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { payrollItems, staff, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const startTime = performance.now();
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const url = new URL(req.url);
    const month = Number(url.searchParams.get("month"));
    const year = Number(url.searchParams.get("year"));

    const conditions: any[] = [eq(staff.tenantId, tenantId)];
    if (month) conditions.push(eq(payrollItems.month, month));
    if (year) conditions.push(eq(payrollItems.year, year));

    const list = await db.select({
      id: payrollItems.id,
      baseSalary: payrollItems.baseSalary,
      commissions: payrollItems.commissions,
      deductions: payrollItems.deductions,
      bonus: payrollItems.bonus,
      netSalary: payrollItems.netSalary,
      status: payrollItems.status,
      staffId: staff.id,
      staffName: users.name,
      staffEmail: users.email,
    })
      .from(payrollItems)
      .innerJoin(staff, eq(payrollItems.staffId, staff.id))
      .innerJoin(users, eq(staff.userId, users.id))
      .where(and(...conditions));

    const mapped = list.map(item => ({
      id: item.id,
      baseSalary: item.baseSalary,
      commissions: item.commissions,
      deductions: item.deductions,
      bonus: item.bonus,
      netSalary: item.netSalary,
      status: item.status,
      staff: {
        id: item.staffId,
        user: { name: item.staffName, email: item.staffEmail }
      }
    }));

    const queryTime = Math.round(performance.now() - startTime);
    console.log(`[PAYROLL API] Complete. queryTime=${queryTime}ms, results=${mapped.length}`);

    return apiSuccess(mapped);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
