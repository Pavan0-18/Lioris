import { db } from "@/lib/db";
import { invoices, payments, tenants, tenantSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import crypto from "crypto";

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

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
    method: "upi",
    gatewayName: "razorpay",
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

async function upsertSubscription(subscription: any, planStatus: string) {
  const subId = subscription?.id;
  const tenantId = subscription?.notes?.tenantId || subscription?.notes?.tenant_id;
  if (!subId || !tenantId) return;

  const values = {
    tenantId,
    razorpaySubId: subId,
    status: planStatus,
    currentPeriodStart: subscription.current_start ? new Date(subscription.current_start * 1000) : new Date(),
    currentPeriodEnd: subscription.current_end ? new Date(subscription.current_end * 1000) : new Date(),
    cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: tenantSubscriptions.id })
    .from(tenantSubscriptions)
    .where(eq(tenantSubscriptions.razorpaySubId, subId))
    .limit(1);

  if (existing) {
    await db.update(tenantSubscriptions).set(values).where(eq(tenantSubscriptions.id, existing.id));
  } else {
    await db.insert(tenantSubscriptions).values({
      ...values,
      createdAt: new Date(),
    });
  }

  await db.update(tenants).set({ planStatus }).where(eq(tenants.id, tenantId));
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (RAZORPAY_WEBHOOK_SECRET) {
      if (!signature) {
        return Response.json({ error: "Missing signature" }, { status: 400 });
      }
      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");
      if (expectedSignature !== signature) {
        console.error("[RAZORPAY WEBHOOK] Invalid signature");
        return Response.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      console.warn("[RAZORPAY WEBHOOK] RAZORPAY_WEBHOOK_SECRET not set — accepting unsigned webhook (dev only)");
    }

    const body = JSON.parse(rawBody);
    const eventType = body.event;

    if (eventType === "payment.captured" || eventType === "order.paid") {
      const payload = body.payload?.payment?.entity || body.payload?.order?.entity || {};
      const notes = payload.notes || {};
      const invoiceId = notes.invoiceId || payload.receipt;
      const tenantId = notes.tenantId;

      if (invoiceId && tenantId) {
        const amountPaid = (payload.amount || 0) / 100;
        await markInvoicePaid(invoiceId, tenantId, amountPaid, payload.id);
      }
    }

    const subscriptionEntity = body.payload?.subscription?.entity;

    switch (eventType) {
      case "subscription.activated":
      case "subscription.charged":
        await upsertSubscription(subscriptionEntity, "active");
        break;
      case "subscription.completed":
        await upsertSubscription(subscriptionEntity, "cancelled");
        break;
      case "subscription.cancelled":
      case "subscription.halted":
        await upsertSubscription(subscriptionEntity, subscriptionEntity?.status === "halted" ? "past_due" : "cancelled");
        break;
      case "subscription.pending":
        await upsertSubscription(subscriptionEntity, "trialing");
        break;
      default:
        break;
    }

    return Response.json({ status: "ok" }, { status: 200 });
  } catch (err: any) {
    console.error("[RAZORPAY WEBHOOK ERROR]", err);
    return Response.json({ error: "Webhook error", details: err.message }, { status: 400 });
  }
}