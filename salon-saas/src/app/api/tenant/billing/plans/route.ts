import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;

    const list = await db.select({
      id: plans.id,
      name: plans.name,
      description: plans.description,
      basePrice: plans.basePrice,
      currency: plans.currency,
      billingCycle: plans.billingCycle,
      trialDays: plans.trialDays,
      hasStripePrice: plans.stripePriceId,
    })
      .from(plans)
      .where(eq(plans.isPublic, true))
      .orderBy(plans.basePrice);

    return apiSuccess(list);
  },
  { method: "GET", requiredPermission: "billing:read" }
);