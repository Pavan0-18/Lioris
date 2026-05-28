import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const staffId = url.searchParams.get("staffId");
    const date = url.searchParams.get("date");
    const duration = Number(url.searchParams.get("duration"));

    // Pre-populate time slots
    const slots = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
    ];

    const todayStr = date || new Date().toISOString().split("T")[0];
    const fullSlots = slots.map(s => `${todayStr}T${s}:00.000Z`);

    return apiSuccess({ slots: fullSlots });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
