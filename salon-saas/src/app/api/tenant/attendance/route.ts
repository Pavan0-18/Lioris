import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const startTime = performance.now();
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json(); // array of records

    if (Array.isArray(body) && body.length > 0) {
      await db.insert(attendance).values(
        body.map((record: any) => ({
          staffId: record.staffId,
          date: new Date(record.date),
          status: record.status,
          note: record.note || null
        }))
      ).onConflictDoNothing();
    }

    const processTime = Math.round(performance.now() - startTime);
    console.log(`[ATTENDANCE API] Bulk insert complete. processTime=${processTime}ms, records=${body?.length || 0}`);

    return apiSuccess({ success: true });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
