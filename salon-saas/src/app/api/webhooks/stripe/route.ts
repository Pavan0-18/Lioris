import { db } from "@/lib/db";
import { invoices, payments, tenants, tenantSubscriptions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { verifyStripeWebhook, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";

async function markInvoicePaid(invoiceId: string, tenantId: string, amount: number, gatewayPaymentId: string) {
  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
    .limit(1);

  if (!inv || inv.status === "paid" || inv.status === "void") return;

  await db.insert(payments).values({
    tenantId,
    invoiceId,
    amount,
    method: "card",
    gatewayName: "stripe",
    gatewayPaymentId,
    status: "captured",
  });

  await db
    .update(invoices)
    .set({ status: "paid", updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

  try {
    await inngest.send({
      name: "invoice/paid",
      data: { invoiceId, tenantId },
    });
  } catch {}
}

async function upsertSubscription(tenantId: string, subscription: any) {
  if (!tenantId || !subscription?.id) return;

  const values = {
    tenantId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: tenantSubscriptions.id })
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (existing) {
    await db.update(tenantSubscriptions).set(values).where(eq(tenantSubscriptions.id, existing.id));
  } else {
    await db.insert(tenantSubscriptions).values({
      ...values,
      currentPeriodStart: values.currentPeriodStart,
      currentPeriodEnd: values.currentPeriodEnd,
      createdAt: new Date(),
    });
  }

  const planStatus =
    subscription.status === "active" ? "active"
    : subscription.status === "trialing" ? "trialing"
    : subscription.status === "past_due" ? "past_due"
    : subscription.status === "canceled" || subscription.status === "unpaid" ? "cancelled"
    : "inactive";

  await db.update(tenants).set({ planStatus }).where(eq(tenants.id, tenantId));
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!STRIPE_WEBHOOK_SECRET) {
      return Response.json({ error: "Stripe webhook secret not configured" }, { status: 500 });
    }

    let event;
    try {
      event = await verifyStripeWebhook(rawBody, signature);
    } catch (err: any) {
      console.error("[STRIPE WEBHOOK] Signature verification failed:", err?.message);
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }

    const dataObject: any = event.data?.object || {};
    const metadata = dataObject.metadata || {};
    const tenantId = metadata.tenantId;

    switch (event.type) {
      case "checkout.session.completed": {
        if (dataObject.mode === "subscription" && dataObject.subscription && tenantId) {
          const subscription = typeof dataObject.subscription === "string"
            ? null
            : dataObject.subscription;
          if (subscription) {
            await upsertSubscription(tenantId, subscription);
          }
        }

        const invoiceId = metadata.invoiceId || dataObject.client_reference_id;
        if (invoiceId && tenantId) {
          const amountPaid = (dataObject.amount_received || dataObject.amount_total || 0) / 100;
          await markInvoicePaid(invoiceId, tenantId, amountPaid, dataObject.id);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const invoiceId = metadata.invoiceId || dataObject.client_reference_id;
        if (invoiceId && tenantId) {
          const amountPaid = (dataObject.amount_received || dataObject.amount || 0) / 100;
          await markInvoicePaid(invoiceId, tenantId, amountPaid, dataObject.id);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subTenantId = tenantId || dataObject.metadata?.tenantId;
        await upsertSubscription(subTenantId, dataObject);
        break;
      }

      case "customer.subscription.deleted": {
        if (tenantId || dataObject.metadata?.tenantId) {
          await db.update(tenants)
            .set({ planStatus: "cancelled" })
            .where(eq(tenants.id, tenantId || dataObject.metadata?.tenantId));
        }
        break;
      }

      case "invoice.payment_failed": {
        if (tenantId || dataObject.metadata?.tenantId) {
          await db.update(tenants)
            .set({ planStatus: "past_due" })
            .where(eq(tenants.id, tenantId || dataObject.metadata?.tenantId));
        }
        break;
      }

      default:
        break;
    }

    return Response.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("[STRIPE WEBHOOK ERROR]", err);
    return Response.json({ error: "Webhook error", details: err.message }, { status: 400 });
  }
}