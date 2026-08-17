import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  tenantWelcomeFn,
  appointmentReminderFn,
  commissionCalculatorFn,
  lowStockAlertFn,
  payrollGeneratorFn,
  waitlistAutoBookFn,
  recurringAppointmentFn,
  inactiveCustomerWinBackFn,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    tenantWelcomeFn,
    appointmentReminderFn,
    commissionCalculatorFn,
    lowStockAlertFn,
    payrollGeneratorFn,
    waitlistAutoBookFn,
    recurringAppointmentFn,
    inactiveCustomerWinBackFn,
  ],
});
