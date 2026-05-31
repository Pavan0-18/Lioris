import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { tenantWelcomeFn } from "@/inngest/functions/tenant-welcome";
import { appointmentReminderFn } from "@/inngest/functions/appointment-reminders";
import { commissionCalculatorFn } from "@/inngest/functions/commission-calculator";
import { lowStockAlertFn } from "@/inngest/functions/low-stock-alert";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    tenantWelcomeFn,
    appointmentReminderFn,
    commissionCalculatorFn,
    lowStockAlertFn,
  ],
});
