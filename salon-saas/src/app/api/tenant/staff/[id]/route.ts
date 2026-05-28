import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { staff, users, attendance } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const [item] = await db.select()
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.id, id))
      .limit(1);

    if (!item) return apiError("Staff not found", "NOT_FOUND", 404);

    const attendanceRecords = await db.select().from(attendance).where(eq(attendance.staffId, id));

    return apiSuccess({
      id: item.staff.id,
      designation: item.staff.designation,
      employeeCode: item.staff.employeeCode,
      baseSalary: item.staff.baseSalary,
      salaryType: item.staff.salaryType,
      user: item.users,
      attendance: attendanceRecords
    });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
