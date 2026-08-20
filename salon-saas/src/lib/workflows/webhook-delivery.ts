import { db } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";
import { and, eq, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const MAX_WEBHOOK_ATTEMPTS = 5;

export function webhookBackoffMs(attemptsMade: number): number {
  switch (attemptsMade) {
    case 1:
      return 60_000;
    case 2:
      return 5 * 60_000;
    case 3:
      return 15 * 60_000;
    case 4:
      return 30 * 60_000;
    default:
      return 60 * 60_000;
  }
}

export interface WebhookFetchResult {
  ok: boolean;
  statusCode: number | null;
  responseBody: string | null;
  error: string | null;
}

export async function performWebhookFetch(
  url: string,
  payload: unknown,
  opts: {
    tenantId: string;
    eventType?: string;
    method?: string;
    headers?: Record<string, string>;
  }
): Promise<WebhookFetchResult> {
  try {
    const res = await fetch(url, {
      method: opts.method ?? "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers ?? {}),
        "X-Lioris-Event": opts.eventType ?? "redelivery",
        "X-Lioris-Tenant": opts.tenantId,
      },
      body: JSON.stringify(payload ?? {}),
      signal: AbortSignal.timeout(10000),
    });
    const bodyText = await res.text().catch(() => "");
    const ok = res.ok || res.status < 500;
    return {
      ok,
      statusCode: res.status,
      responseBody: bodyText.slice(0, 2000) || null,
      error: ok ? null : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return { ok: false, statusCode: null, responseBody: null, error: err?.message ?? "Network error" };
  }
}

async function bumpEndpointCounters(endpointId: string, ok: boolean) {
  await db
    .update(webhookEndpoints)
    .set({
      lastDeliveryAt: new Date(),
      successCount: ok ? sql`${webhookEndpoints.successCount} + 1` : webhookEndpoints.successCount,
      failureCount: ok ? webhookEndpoints.failureCount : sql`${webhookEndpoints.failureCount} + 1`,
    })
    .where(eq(webhookEndpoints.id, endpointId));
}

export async function recordWebhookResult(opts: {
  tenantId: string;
  deliveryId: string;
  endpointId: string | null;
  attemptsMade: number;
  result: WebhookFetchResult;
}): Promise<{ status: "delivered" | "retrying" | "dead" }> {
  const { tenantId, deliveryId, endpointId, attemptsMade, result } = opts;

  if (result.ok) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "delivered",
        statusCode: result.statusCode,
        lastError: null,
        responseBody: result.responseBody,
        attempts: attemptsMade,
        nextRetryAt: null,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    if (endpointId) await bumpEndpointCounters(endpointId, true);
    return { status: "delivered" };
  }

  if (attemptsMade >= MAX_WEBHOOK_ATTEMPTS) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "dead",
        statusCode: result.statusCode,
        lastError: `Dead-lettered after ${MAX_WEBHOOK_ATTEMPTS} attempts: ${result.error}`,
        responseBody: result.responseBody,
        nextRetryAt: null,
      })
      .where(eq(webhookDeliveries.id, deliveryId));
    if (endpointId) await bumpEndpointCounters(endpointId, false);
    return { status: "dead" };
  }

  const nextRetryAt = new Date(Date.now() + webhookBackoffMs(attemptsMade));
  await db
    .update(webhookDeliveries)
    .set({
      status: "retrying",
      statusCode: result.statusCode,
      lastError: result.error,
      responseBody: result.responseBody,
      attempts: attemptsMade,
      nextRetryAt,
    })
    .where(eq(webhookDeliveries.id, deliveryId));
  if (endpointId) await bumpEndpointCounters(endpointId, false);
  return { status: "retrying" };
}

export async function processDueWebhookRetries(
  limit = 50
): Promise<{ processed: number; delivered: number; retrying: number; dead: number }> {
  const due = await db
    .select()
    .from(webhookDeliveries)
    .where(and(eq(webhookDeliveries.status, "retrying"), lte(webhookDeliveries.nextRetryAt, new Date())))
    .limit(limit);

  let delivered = 0;
  let retrying = 0;
  let dead = 0;

  for (const delivery of due) {
    if (!delivery.url || !/^https?:\/\//.test(delivery.url)) {
      await db
        .update(webhookDeliveries)
        .set({ status: "dead", lastError: "Dead-lettered: delivery has no valid URL", nextRetryAt: null })
        .where(eq(webhookDeliveries.id, delivery.id));
      dead++;
      continue;
    }

    const result = await performWebhookFetch(delivery.url, delivery.payload, {
      tenantId: delivery.tenantId,
      eventType: (delivery.payload as any)?.event,
    });
    const { status } = await recordWebhookResult({
      tenantId: delivery.tenantId,
      deliveryId: delivery.id,
      endpointId: delivery.endpointId,
      attemptsMade: (delivery.attempts ?? 0) + 1,
      result,
    });
    if (status === "delivered") delivered++;
    else if (status === "dead") dead++;
    else retrying++;
  }

  return { processed: due.length, delivered, retrying, dead };
}