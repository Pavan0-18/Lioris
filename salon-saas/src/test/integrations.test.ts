import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  session: {
    tenantId: "tenant_a",
    userId: "user_a",
    role: "OWNER",
    tenant: { id: "tenant_a", slug: "a", isActive: true },
  },
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  verifyUserActive: vi.fn(async () => true),
  logAudit: vi.fn(async () => {}),
  rateLimit: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/tenant-context", () => ({
  getTenantFromSession: vi.fn(async () => mocks.session),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: { limit: mocks.rateLimit },
}));

vi.mock("@/lib/auth-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-utils")>();
  return {
    ...actual,
    verifyUserActive: mocks.verifyUserActive,
    logAudit: mocks.logAudit,
  };
});

import { INTEGRATION_CATALOG, envIntegrationStatus, maskIntegrationConfig, resolveIntegrationStatuses } from "@/lib/integrations";
import { GET as listIntegrations } from "@/app/api/tenant/integrations/route";

function chainable(results: any[]) {
  let i = 0;
  const then = (fn: any) =>
    Promise.resolve(results[Math.min(i++, results.length - 1)] ?? []).then(fn);
  const q: any = {
    from: () => q,
    where: () => q,
    leftJoin: () => q,
    limit: () => q,
    orderBy: () => q,
    offset: () => q,
    set: () => q,
    values: () => q,
    returning: () => q,
    then,
  };
  return q;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = {
    tenantId: "tenant_a",
    userId: "user_a",
    role: "OWNER",
    tenant: { id: "tenant_a", slug: "a", isActive: true },
  };
  mocks.db.select.mockImplementation(() => chainable([[]]));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("integration catalog", () => {
  it("has unique keys and valid kinds", () => {
    const keys = INTEGRATION_CATALOG.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const int of INTEGRATION_CATALOG) {
      expect(["payments", "messaging", "automation"]).toContain(int.category);
      expect(["tenant", "env"]).toContain(int.kind);
      if (int.kind === "tenant") {
        expect(int.fields?.length).toBeGreaterThan(0);
        for (const f of int.fields!) {
          expect(["text", "password", "email"]).toContain(f.type);
        }
      } else {
        expect(int.envKeys?.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("envIntegrationStatus", () => {
  it("is configured when all env keys exist", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
    expect(envIntegrationStatus(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"])).toBe("configured");
  });

  it("is not configured when any env key is missing", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    expect(envIntegrationStatus(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"])).toBe("not_configured");
  });
});

describe("maskIntegrationConfig", () => {
  it("masks secret fields but keeps others", () => {
    const fields = [
      { key: "apiKey", label: "API key", type: "password" as const, required: true, secret: true },
      { key: "fromEmail", label: "From email", type: "email" as const, required: true },
    ];
    const masked = maskIntegrationConfig({ apiKey: "sk-123", fromEmail: "a@b.com" }, fields);
    expect(masked.apiKey).toBe("••••••••");
    expect(masked.fromEmail).toBe("a@b.com");
  });

  it("handles empty config", () => {
    expect(maskIntegrationConfig({}, [])).toEqual({});
  });
});

describe("resolveIntegrationStatuses", () => {
  it("marks env integrations by environment presence", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "wh");
    const statuses = resolveIntegrationStatuses([]);
    const stripe = statuses.find((s) => s.integration.key === "stripe")!;
    expect(stripe.status).toBe("configured");
    expect(stripe.isActive).toBe(true);
    const razorpay = statuses.find((s) => s.integration.key === "razorpay")!;
    expect(razorpay.status).toBe("not_configured");
  });

  it("reports tenant providers as active/inactive with masked config", () => {
    const statuses = resolveIntegrationStatuses([
      { provider: "sendgrid", config: JSON.stringify({ apiKey: "SG-xyz", fromEmail: "a@b.com" }), isActive: true },
      { provider: "twilio_sms", config: JSON.stringify({ accountSid: "AC-1", authToken: "tok" }), isActive: false },
    ]);
    const sendgrid = statuses.find((s) => s.integration.key === "sendgrid")!;
    expect(sendgrid.status).toBe("active");
    expect(sendgrid.config.apiKey).toBe("••••••••");
    expect(sendgrid.config.fromEmail).toBe("a@b.com");
    const twilio = statuses.find((s) => s.integration.key === "twilio_sms")!;
    expect(twilio.status).toBe("inactive");
    expect(twilio.config.authToken).toBe("••••••••");
    const whatsapp = statuses.find((s) => s.integration.key === "twilio_whatsapp")!;
    expect(whatsapp.status).toBe("not_configured");
    expect(whatsapp.config).toEqual({});
  });
});

describe("integrations API", () => {
  it("lists integration statuses for the tenant", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "wh");
    mocks.db.select.mockImplementation(() => chainable([[
      { id: "pc_1", tenantId: "tenant_a", provider: "sendgrid", config: JSON.stringify({ apiKey: "SG-xyz", fromEmail: "a@b.com" }), isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]]));
    const res = await listIntegrations(new Request("http://localhost/api/tenant/integrations"), {} as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.integrations).toHaveLength(INTEGRATION_CATALOG.length);
    const sendgrid = json.data.integrations.find((i: any) => i.integration.key === "sendgrid");
    expect(sendgrid.status).toBe("active");
    expect(sendgrid.config.apiKey).toBe("••••••••");
    const stripe = json.data.integrations.find((i: any) => i.integration.key === "stripe");
    expect(stripe.status).toBe("configured");
  });

  it("returns not_configured for tenants with no provider rows", async () => {
    const res = await listIntegrations(new Request("http://localhost/api/tenant/integrations"), {} as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    const sendgrid = json.data.integrations.find((i: any) => i.integration.key === "sendgrid");
    expect(sendgrid.status).toBe("not_configured");
    expect(sendgrid.config).toEqual({});
  });
});