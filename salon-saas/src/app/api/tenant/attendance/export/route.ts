import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { attendance, staff, users } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const url = new URL(req.url);
    const month = Number(url.searchParams.get("month")) || new Date().getMonth() + 1;
    const year = Number(url.searchParams.get("year")) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const records = await db.select({
      staffName: users.name,
      employeeCode: staff.employeeCode,
      date: attendance.date,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      status: attendance.status,
      note: attendance.note,
    })
      .from(attendance)
      .innerJoin(staff, eq(attendance.staffId, staff.id))
      .innerJoin(users, eq(staff.userId, users.id))
      .where(and(
        eq(staff.tenantId, tenantId),
        eq(staff.isActive, true),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate),
      ))
      .orderBy(users.name, attendance.date);

    const header = "Staff Name,Employee Code,Date,Check In,Check Out,Status,Notes\n";
    const csv = header + records.map(r => {
      const checkIn = r.checkIn ? new Date(r.checkIn).toLocaleTimeString("en-GB") : "";
      const checkOut = r.checkOut ? new Date(r.checkOut).toLocaleTimeString("en-GB") : "";
      const date = new Date(r.date).toLocaleDateString("en-CA");
      return `"${r.staffName}","${r.employeeCode || ""}","${date}","${checkIn}","${checkOut}","${r.status}","${r.note || ""}"`;
    }).join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="timesheet_${month}_${year}.csv"`,
      },
    });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
