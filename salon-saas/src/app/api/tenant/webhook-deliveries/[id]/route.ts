import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { db } from "@/lib/db";
import { webhookDeliveries } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { redeliverWebhook } from "@/lib/workflows/engine";
import { logAudit } from "@/lib/auth-utils";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    const { id } = await (req as any).params;

    const [delivery] = await db.select()
      .from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.tenantId, tenantId), eq(webhookDeliveries.id, id)))
      .limit(1);

    if (!delivery) {
      const error = new Error("Webhook delivery not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    return apiSuccess(delivery);
  },
  { method: "GET", requiredPermission: "automation:view" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId, userId } = context.auth;
    const { id } = await (req as any).params;

    const result = await redeliverWebhook(tenantId, id);

    if (result.status === "not_found") {
      const error = new Error("Webhook delivery not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }
    if (result.status === "invalid") {
      const error = new Error(result.reason ?? "Delivery cannot be redelivered") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    await logAudit(tenantId, userId, "CREATE", "WEBHOOK_REDELIVERY", id, { status: result.status });

    return apiSuccess({ deliveryId: id, status: result.status, error: result.error ?? null });
  },
  { method: "POST", requiredPermission: "automation:manage" }
);