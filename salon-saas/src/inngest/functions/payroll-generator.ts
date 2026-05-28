import { inngest } from "../client";
import { db } from "@/lib/db";
import { staff, commissions, payrollItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const payrollGeneratorFn = inngest.createFunction(
  { id: "payroll-generator", name: "Monthly Payroll Auto-Generator" },
  { event: "payroll/generate" },
  async ({ event, step }) => {
    const { tenantId, month, year } = event.data;

    await step.run("generate-payroll-records", async () => {
      const activeStaff = await db.select().from(staff).where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)));

      for (const member of activeStaff) {
        // Sum all unpaid commissions for this month & year
        const unpaidCommissions = await db.select().from(commissions).where(
          and(
            eq(commissions.staffId, member.id),
            eq(commissions.isPaid, false)
          )
        );

        const totalCommission = unpaidCommissions.reduce((sum, comm) => sum + comm.amount, 0);
        const netSalary = member.baseSalary + totalCommission;

        // Upsert draft payroll item
        await db.insert(payrollItems)
          .values({
            staffId: member.id,
            month,
            year,
            baseSalary: member.baseSalary,
            commissions: totalCommission,
            deductions: 0.0,
            bonus: 0.0,
            netSalary,
            status: "draft",
            notes: "Auto-generated payroll draft"
          })
          .onConflictDoNothing();
      }
    });

    return { status: "payroll-drafts-generated" };
  }
);
