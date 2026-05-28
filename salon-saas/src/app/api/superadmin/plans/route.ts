import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const list = await db.select().from(plans);
    return apiSuccess(list);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
