import { getTenantFromSession } from "@/lib/tenant-context";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();

    // Mock reports
    const metrics = {
      revenue: [
        { date: "2026-05-20", amount: 120.00 },
        { date: "2026-05-21", amount: 150.00 },
        { date: "2026-05-22", amount: 95.00 },
        { date: "2026-05-23", amount: 210.00 }
      ],
      topServices: [
        { name: "Haircut", amount: 350.00 },
        { name: "Manicure", amount: 180.00 },
        { name: "Facial", amount: 120.00 }
      ]
    };

    return apiSuccess(metrics);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
