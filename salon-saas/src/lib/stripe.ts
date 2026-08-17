import Stripe from "stripe";

const apiKey = process.env.STRIPE_SECRET_KEY;

export const stripe: Stripe | null = apiKey ? new Stripe(apiKey) : null;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
export const STRIPE_MODE = (process.env.STRIPE_MODE || "test") as "test" | "live";
export const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export interface SubscriptionCheckoutParams {
  tenantId: string;
  tenantEmail: string;
  planName: string;
  priceId?: string;
  amount: number;
  currency: string;
  trialDays: number;
  successPath?: string;
}

export async function createSubscriptionCheckout(params: SubscriptionCheckoutParams) {
  if (!stripe) throw new Error("Stripe is not configured (set STRIPE_SECRET_KEY)");

  const successUrl = `${APP_URL}${params.successPath || "/settings/integrations"}?checkout=success`;
  const cancelUrl = `${APP_URL}${params.successPath || "/settings/integrations"}?checkout=cancelled`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: params.tenantEmail,
    line_items: [
      params.priceId
        ? { price: params.priceId, quantity: 1 }
        : {
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: { name: `Lioris ${params.planName} Plan` },
              unit_amount: Math.round(params.amount * 100),
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
    ],
    subscription_data: {
      trial_period_days: params.trialDays > 0 ? params.trialDays : undefined,
      metadata: { tenantId: params.tenantId, planName: params.planName },
    },
    metadata: { tenantId: params.tenantId, planName: params.planName },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

export async function createBillingPortalSession(tenantId: string) {
  if (!stripe) throw new Error("Stripe is not configured (set STRIPE_SECRET_KEY)");

  const { db } = await import("@/lib/db");
  const { tenants } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const [tenant] = await db
    .select({ email: tenants.email })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) throw new Error("Tenant not found");

  const customerList = await stripe.customers.list({ email: tenant.email, limit: 1 });
  const customer = customerList.data[0];
  if (!customer) throw new Error("No Stripe customer found for this tenant");

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${APP_URL}/settings/integrations`,
  });

  return session;
}

export async function verifyStripeWebhook(rawBody: string, signature: string | null): Promise<Stripe.Event> {
  if (!stripe || !STRIPE_WEBHOOK_SECRET || !signature) {
    throw new Error("Stripe webhook verification not configured");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}