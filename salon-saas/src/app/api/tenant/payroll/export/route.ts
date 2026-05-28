import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { payrollItems, staff, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const url = new URL(req.url);
    const month = Number(url.searchParams.get("month"));
    const year = Number(url.searchParams.get("year"));

    const rows = await db
      .select({
        employeeCode: staff.employeeCode,
        name: users.name,
        baseSalary: payrollItems.baseSalary,
        commissions: payrollItems.commissions,
        deductions: payrollItems.deductions,
        bonus: payrollItems.bonus,
        netSalary: payrollItems.netSalary,
        status: payrollItems.status,
      })
      .from(payrollItems)
      .innerJoin(staff, eq(payrollItems.staffId, staff.id))
      .innerJoin(users, eq(staff.userId, users.id))
      .where(and(eq(staff.tenantId, tenantId), eq(payrollItems.month, month || new Date().getMonth() + 1), eq(payrollItems.year, year || new Date().getFullYear())));

    const header = "Employee Code,Name,Base Salary,Commissions,Deductions,Bonus,Net Salary,Status";
    const csv = rows.map((r) => `${r.employeeCode || ""},"${r.name}",${r.baseSalary},${r.commissions},${r.deductions},${r.bonus},${r.netSalary},${r.status}`).join("\n");

    return new Response(`${header}\n${csv}`, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="payroll_${month || new Date().getMonth() + 1}_${year || new Date().getFullYear()}.csv"` },
    });
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
