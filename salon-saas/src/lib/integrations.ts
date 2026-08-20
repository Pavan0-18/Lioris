export interface IntegrationConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "email";
  required?: boolean;
  secret?: boolean;
}

export interface Integration {
  key: string;
  name: string;
  description: string;
  category: "payments" | "messaging" | "automation";
  kind: "tenant" | "env";
  fields?: IntegrationConfigField[];
  envKeys?: string[];
}

export const INTEGRATION_CATALOG: Integration[] = [
  {
    key: "sendgrid",
    name: "SendGrid",
    description: "Transactional email delivery for reminders, invoices and alerts.",
    category: "messaging",
    kind: "tenant",
    fields: [
      { key: "apiKey", label: "API key", type: "password", required: true, secret: true },
      { key: "fromEmail", label: "From email", type: "email", required: true },
    ],
  },
  {
    key: "twilio_sms",
    name: "Twilio SMS",
    description: "SMS reminders and notifications.",
    category: "messaging",
    kind: "tenant",
    fields: [
      { key: "accountSid", label: "Account SID", type: "text", required: true },
      { key: "authToken", label: "Auth token", type: "password", required: true, secret: true },
      { key: "fromNumber", label: "From number", type: "text", required: true },
    ],
  },
  {
    key: "twilio_whatsapp",
    name: "Twilio WhatsApp",
    description: "WhatsApp reminders and notifications.",
    category: "messaging",
    kind: "tenant",
    fields: [
      { key: "accountSid", label: "Account SID", type: "text", required: true },
      { key: "authToken", label: "Auth token", type: "password", required: true, secret: true },
      { key: "fromNumber", label: "From number", type: "text", required: true },
    ],
  },
  {
    key: "stripe",
    name: "Stripe",
    description: "Card payments and subscription billing. Configured at platform level.",
    category: "payments",
    kind: "env",
    envKeys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  },
  {
    key: "razorpay",
    name: "Razorpay",
    description: "UPI and card payments. Configured at platform level.",
    category: "payments",
    kind: "env",
    envKeys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
  },
  {
    key: "inngest",
    name: "Background Jobs (Inngest)",
    description: "Scheduled reminders, payroll and campaign automation.",
    category: "automation",
    kind: "env",
    envKeys: ["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"],
  },
];

export function envIntegrationStatus(envKeys: string[] | undefined): "configured" | "not_configured" {
  if (!envKeys || envKeys.length === 0) return "not_configured";
  const missing = envKeys.filter((k) => !process.env[k]);
  return missing.length === 0 ? "configured" : "not_configured";
}

export function maskIntegrationConfig(
  config: Record<string, any>,
  fields: IntegrationConfigField[] | undefined
): Record<string, any> {
  if (!fields || !config) return config ?? {};
  const masked: Record<string, any> = { ...config };
  for (const field of fields) {
    if (field.secret && masked[field.key]) {
      masked[field.key] = "••••••••";
    }
  }
  return masked;
}

export type IntegrationStatus = {
  integration: Integration;
  isActive: boolean;
  config: Record<string, any>;
  status: "configured" | "not_configured" | "active" | "inactive";
};

export function resolveIntegrationStatuses(rows: { provider: string; config: string; isActive: boolean }[]): IntegrationStatus[] {
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return INTEGRATION_CATALOG.map((integration) => {
    if (integration.kind === "env") {
      const configured = envIntegrationStatus(integration.envKeys);
      return {
        integration,
        isActive: configured === "configured",
        config: {},
        status: configured,
      };
    }

    const row = byProvider.get(integration.key);
    let config: Record<string, any> = {};
    try {
      config = row ? JSON.parse(row.config ?? "{}") : {};
    } catch {
      config = {};
    }
    return {
      integration,
      isActive: row?.isActive ?? false,
      config: maskIntegrationConfig(config, integration.fields),
      status: row ? (row.isActive ? "active" : "inactive") : "not_configured",
    };
  });
}