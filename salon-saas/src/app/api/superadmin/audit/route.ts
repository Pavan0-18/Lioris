import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { getAuditLogs } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }
    const logs = await getAuditLogs(200);
    return apiSuccess(logs);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
