import { getTenantFromSession } from "@/lib/tenant-context";
import { apiSuccess, apiError } from "@/lib/utils";
import { inngest } from "@/inngest/client";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const body = await req.json();

    await inngest.send({
      name: "payroll/generate",
      data: { tenantId, month: body.month, year: body.year }
    });

    return apiSuccess({ success: true });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
