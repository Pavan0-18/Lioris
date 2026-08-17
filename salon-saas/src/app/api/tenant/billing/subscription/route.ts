import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants, tenantSubscriptions, plans } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";
import { createSubscriptionCheckout } from "@/lib/stripe";
import { requireFeature } from "@/lib/feature-gate";

export const GET = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;

    const [tenant] = await db.select({
      id: tenants.id,
      name: tenants.name,
      email: tenants.email,
      planId: tenants.planId,
      planStatus: tenants.planStatus,
      trialEndsAt: tenants.trialEndsAt,
      currency: tenants.currency,
      createdAt: tenants.createdAt,
    })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      const error = new Error("Tenant not found") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    const [subscription] = await db.select({
      id: tenantSubscriptions.id,
      status: tenantSubscriptions.status,
      currentPeriodStart: tenantSubscriptions.currentPeriodStart,
      currentPeriodEnd: tenantSubscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: tenantSubscriptions.cancelAtPeriodEnd,
      stripeSubscriptionId: tenantSubscriptions.stripeSubscriptionId,
      razorpaySubId: tenantSubscriptions.razorpaySubId,
    })
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.tenantId, tenantId))
      .orderBy(tenantSubscriptions.createdAt)
      .limit(1);

    const [plan] = tenant.planId
      ? await db.select({
          id: plans.id,
          name: plans.name,
          basePrice: plans.basePrice,
          currency: plans.currency,
          billingCycle: plans.billingCycle,
          trialDays: plans.trialDays,
        })
          .from(plans)
          .where(eq(plans.id, tenant.planId))
          .limit(1)
      : [undefined];

    return apiSuccess({
      tenant,
      plan: plan || null,
      subscription: subscription || null,
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    });
  },
  { method: "GET", requiredPermission: "billing:read" }
);

export const POST = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;
    await requireFeature(tenantId, "BILLING");

    const body = await req.json();
    const planId = String(body.planId || "");

    if (!planId) {
      const error = new Error("planId is required") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const [tenant] = await db.select({
      id: tenants.id,
      email: tenants.email,
      currency: tenants.currency,
    })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const [plan] = await db.select({
      id: plans.id,
      name: plans.name,
      basePrice: plans.basePrice,
      currency: plans.currency,
      billingCycle: plans.billingCycle,
      trialDays: plans.trialDays,
      stripePriceId: plans.stripePriceId,
    })
      .from(plans)
      .where(and(eq(plans.id, planId), eq(plans.isActive, true)))
      .limit(1);

    if (!tenant || !plan) {
      const error = new Error("Plan not found or inactive") as any;
      error.code = "NOT_FOUND";
      throw error;
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      const error = new Error("Subscription payments are not configured yet") as any;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const session = await createSubscriptionCheckout({
      tenantId,
      tenantEmail: tenant.email,
      planName: plan.name,
      priceId: plan.stripePriceId || undefined,
      amount: plan.basePrice,
      currency: plan.currency === "INR" ? "inr" : plan.currency.toLowerCase(),
      trialDays: plan.trialDays,
      successPath: "/settings/integrations",
    });

    return apiSuccess({ url: session.url });
  },
  { method: "POST", requiredPermission: "billing:create" }
);

export const DELETE = createApiHandler(
  async (req, context) => {
    const { tenantId } = context.auth;

    const [sub] = await db.select({
      id: tenantSubscriptions.id,
      stripeSubscriptionId: tenantSubscriptions.stripeSubscriptionId,
      status: tenantSubscriptions.status,
    })
      .from(tenantSubscriptions)
      .where(and(eq(tenantSubscriptions.tenantId, tenantId), eq(tenantSubscriptions.status, "active")))
      .limit(1);

    if (sub?.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      const { stripe } = await import("@/lib/stripe");
      if (stripe) {
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
    }

    await db.update(tenantSubscriptions)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(tenantSubscriptions.id, sub?.id || "__none__"));

    if (!sub) {
      await db.update(tenants)
        .set({ planStatus: "cancelled" })
        .where(eq(tenants.id, tenantId));
    }

    return apiSuccess({ success: true, cancelAtPeriodEnd: true });
  },
  { method: "DELETE", requiredPermission: "billing:create" }
);