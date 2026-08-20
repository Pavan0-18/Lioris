import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), update: vi.fn(), insert: vi.fn(), delete: vi.fn() },
  updateValues: [] as any[],
  insertValues: [] as any[],
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.db.select,
    update: mocks.db.update,
    insert: mocks.db.insert,
    delete: mocks.db.delete,
  },
}));

import {
  MAX_WEBHOOK_ATTEMPTS,
  webhookBackoffMs,
  processDueWebhookRetries,
  recordWebhookResult,
} from "@/lib/workflows/webhook-delivery";

function chainable(results: any[]) {
  let i = 0;
  const then = (onFulfilled?: any) => {
    const next = results[Math.min(i, results.length - 1)];
    i++;
    return Promise.resolve(next === undefined ? [] : next).then(onFulfilled);
  };
  const q: any = {
    from: () => q,
    where: () => q,
    limit: () => q,
    orderBy: () => q,
    offset: () => q,
    leftJoin: () => q,
    set: (v: any) => {
      mocks.updateValues.push(v);
      return q;
    },
    values: (v: any) => {
      mocks.insertValues.push(v);
      return q;
    },
    returning: () => q,
    then,
  };
  return q;
}

const delivery = {
  id: "del_1",
  tenantId: "tenant_a",
  endpointId: "ep_1",
  url: "https://example.com/hook",
  payload: { event: "record.created", record: { id: "r1" } },
  status: "retrying",
  attempts: 1,
  nextRetryAt: new Date(Date.now() - 60_000),
  lastError: "HTTP 500",
};

beforeEach(() => {
  mocks.db.select.mockReset();
  mocks.db.update.mockReset();
  mocks.db.insert.mockReset();
  mocks.db.delete.mockReset();
  mocks.updateValues.length = 0;
  mocks.insertValues.length = 0;
  mocks.db.select.mockReturnValue(chainable([]));
  mocks.db.update.mockImplementation(() => chainable([]));
  mocks.db.insert.mockImplementation(() => chainable([]));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("webhook backoff schedule", () => {
  it("grows the wait with each attempt", () => {
    expect(webhookBackoffMs(1)).toBe(60_000);
    expect(webhookBackoffMs(2)).toBe(300_000);
    expect(webhookBackoffMs(3)).toBe(900_000);
    expect(webhookBackoffMs(4)).toBe(1_800_000);
    expect(webhookBackoffMs(5)).toBe(3_600_000);
  });

  it("caps at five total attempts", () => {
    expect(MAX_WEBHOOK_ATTEMPTS).toBe(5);
  });
});

describe("recordWebhookResult", () => {
  it("marks delivered and clears retry state on success", async () => {
    const { status } = await recordWebhookResult({
      tenantId: "tenant_a",
      deliveryId: "del_1",
      endpointId: "ep_1",
      attemptsMade: 2,
      result: { ok: true, statusCode: 200, responseBody: "{\"ok\":true}", error: null },
    });
    expect(status).toBe("delivered");
    const update = mocks.updateValues.find((v: any) => v.status === "delivered");
    expect(update.attempts).toBe(2);
    expect(update.nextRetryAt).toBeNull();
    expect(update.lastError).toBeNull();
  });

  it("schedules a retry with exponential backoff on failure", async () => {
    const before = Date.now();
    const { status } = await recordWebhookResult({
      tenantId: "tenant_a",
      deliveryId: "del_1",
      endpointId: "ep_1",
      attemptsMade: 1,
      result: { ok: false, statusCode: 500, responseBody: "boom", error: "HTTP 500" },
    });
    expect(status).toBe("retrying");
    const update = mocks.updateValues.find((v: any) => v.status === "retrying");
    expect(update.attempts).toBe(1);
    expect(update.nextRetryAt.getTime()).toBeGreaterThanOrEqual(before + 60_000 - 5_000);
    expect(update.nextRetryAt.getTime()).toBeLessThanOrEqual(before + 60_000 + 5_000);
    expect(update.lastError).toBe("HTTP 500");
    const endpointUpdate = mocks.updateValues.find((v: any) => "failureCount" in v);
    expect(endpointUpdate).toBeDefined();
  });

  it("dead-letters after the maximum attempts", async () => {
    const { status } = await recordWebhookResult({
      tenantId: "tenant_a",
      deliveryId: "del_1",
      endpointId: null,
      attemptsMade: MAX_WEBHOOK_ATTEMPTS,
      result: { ok: false, statusCode: 503, responseBody: null, error: "HTTP 503" },
    });
    expect(status).toBe("dead");
    const update = mocks.updateValues.find((v: any) => v.status === "dead");
    expect(update.lastError).toMatch(/Dead-lettered after 5 attempts/);
    expect(update.nextRetryAt).toBeNull();
  });
});

describe("processDueWebhookRetries", () => {
  it("delivers due retries and counts them", async () => {
    mocks.db.select.mockReturnValue(chainable([[delivery]]));
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "{\"ok\":true}",
    })));

    const result = await processDueWebhookRetries();
    expect(result).toEqual({ processed: 1, delivered: 1, retrying: 0, dead: 0 });
    const update = mocks.updateValues.find((v: any) => v.status === "delivered");
    expect(update.attempts).toBe(2);
    expect(update.nextRetryAt).toBeNull();
  });

  it("re-queues failing retries with the next backoff step", async () => {
    mocks.db.select.mockReturnValue(chainable([[delivery]]));
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "boom",
    })));

    const result = await processDueWebhookRetries();
    expect(result).toEqual({ processed: 1, delivered: 0, retrying: 1, dead: 0 });
    const update = mocks.updateValues.find((v: any) => v.status === "retrying");
    expect(update.attempts).toBe(2);
    expect(update.nextRetryAt).toBeInstanceOf(Date);
  });

  it("dead-letters retries that exhaust all attempts", async () => {
    mocks.db.select.mockReturnValue(chainable([[{ ...delivery, attempts: 4 }]]));
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "boom",
    })));

    const result = await processDueWebhookRetries();
    expect(result).toEqual({ processed: 1, delivered: 0, retrying: 0, dead: 1 });
    const update = mocks.updateValues.find((v: any) => v.status === "dead");
    expect(update.lastError).toMatch(/Dead-lettered after 5 attempts/);
  });

  it("dead-letters deliveries with unusable URLs", async () => {
    mocks.db.select.mockReturnValue(chainable([[{ ...delivery, url: "ftp://bad" }]]));
    const result = await processDueWebhookRetries();
    expect(result).toEqual({ processed: 1, delivered: 0, retrying: 0, dead: 1 });
    const update = mocks.updateValues.find((v: any) => v.status === "dead");
    expect(update.lastError).toMatch(/no valid URL/);
  });
});