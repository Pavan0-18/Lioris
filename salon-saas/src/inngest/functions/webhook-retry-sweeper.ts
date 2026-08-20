import { inngest } from "../client";
import { processDueWebhookRetries } from "@/lib/workflows/webhook-delivery";

export const webhookRetrySweeperFn = inngest.createFunction(
  {
    id: "webhook-retry-sweeper",
    name: "Retry Due Webhook Deliveries",
    retries: 0,
  },
  { cron: "*/5 * * * *" },
  async () => processDueWebhookRetries()
);