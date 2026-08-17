import { apiSuccess } from "@/lib/utils";
import { createApiHandler } from "@/lib/api-handler";
import { createBillingPortalSession } from "@/lib/stripe";

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;

    if (!process.env.STRIPE_SECRET_KEY) {
      const error = new Error("Subscription billing is not configured yet") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const session = await createBillingPortalSession(tenantId);
    return apiSuccess({ url: session.url });
  },
  { method: "POST", requiredPermission: "billing:read" }
);