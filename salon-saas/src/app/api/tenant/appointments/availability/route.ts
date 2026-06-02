import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiSuccess, apiError } from "@/lib/utils/response";
import { availabilityQuerySchema } from "@/lib/validators/appointment";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(req: Request) {
  try {
    const { tenantId, tenant } = await getTenantFromSession();
    await requireFeature(tenantId, "APPOINTMENTS");

    const url = new URL(req.url);
    const query = availabilityQuerySchema.safeParse({
      branchId: url.searchParams.get("branchId"),
      date: url.searchParams.get("date"),
      duration: url.searchParams.get("duration"),
      staffId: url.searchParams.get("staffId") || undefined,
    });

    if (!query.success) {
      return apiError("Invalid query parameters", "VALIDATION_ERROR", 400);
    }

    const result = await getAvailableSlots({
      tenantId,
      branchId: query.data.branchId,
      date: query.data.date,
      durationMins: query.data.duration,
      staffId: query.data.staffId,
      timezone: tenant.timezone || "Asia/Kolkata",
    });

    return apiSuccess(result);
  } catch (err: any) {
    return apiError(err.message || "Internal error", err.code || "INTERNAL_ERROR", err.statusCode || 500);
  }
}
