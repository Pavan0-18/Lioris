import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { attendance, staff } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { validateBody } from "@/lib/validation";
import { attendanceCheckInOutSchema } from "@/lib/validators/staff";
import { startOfDay } from "date-fns";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();
    const validated = validateBody(attendanceCheckInOutSchema, body);

    const [staffRecord] = await db.select()
      .from(staff)
      .where(eq(staff.id, validated.staffId));

    if (!staffRecord) {
      return apiError("Staff not found", "NOT_FOUND", 404);
    }

    const dayStart = startOfDay(validated.date);

    const [existing] = await db.select()
      .from(attendance)
      .where(and(
        eq(attendance.staffId, validated.staffId),
        eq(attendance.date, dayStart),
      ))
      .limit(1);

    if (validated.type === "checkin") {
      if (existing) {
        const [updated] = await db.update(attendance)
          .set({ checkIn: validated.date, status: "present", markedBy: tenantId })
          .where(eq(attendance.id, existing.id))
          .returning();
        return apiSuccess(updated);
      }
      const [inserted] = await db.insert(attendance).values({
        staffId: validated.staffId,
        date: dayStart,
        checkIn: validated.date,
        status: "present",
        markedBy: tenantId,
      }).returning();
      return apiSuccess(inserted);
    }

    if (!existing) {
      return apiError("No check-in record found for today", "NOT_FOUND", 404);
    }

    const [updated] = await db.update(attendance)
      .set({ checkOut: validated.date, markedBy: tenantId })
      .where(eq(attendance.id, existing.id))
      .returning();

    return apiSuccess(updated);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
