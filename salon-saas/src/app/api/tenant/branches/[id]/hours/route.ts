import { getTenantFromSession } from "@/lib/tenant-context";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { workingHours } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const list = await db.select().from(workingHours).where(eq(workingHours.branchId, id));
    return apiSuccess(list);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function PUT(req: Request, { params }: { params: any }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Reset hours
    await db.delete(workingHours).where(eq(workingHours.branchId, id));

    if (Array.isArray(body) && body.length > 0) {
      await db.insert(workingHours).values(
        body.map((h: any) => ({
          branchId: id,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        }))
      );
    }

    return apiSuccess({ success: true });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
