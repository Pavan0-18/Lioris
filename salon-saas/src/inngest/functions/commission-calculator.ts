import { inngest } from "../client";

export const commissionCalculatorFn = inngest.createFunction(
  {
    id: "commission-calculator",
    name: "Calculate Commissions After Invoice Paid",
    retries: 3,
  },
  { event: "invoice/paid" },
  async ({ event }) => {
    const { invoiceId } = event.data as { invoiceId: string };
    return { processed: true, invoiceId };
  }
);
