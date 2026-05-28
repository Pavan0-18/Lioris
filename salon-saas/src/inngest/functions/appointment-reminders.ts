import { inngest } from "../client";

export const appointmentReminderFn = inngest.createFunction(
  {
    id: "appointment-reminder",
    name: "Send Appointment Reminder",
    retries: 3,
  },
  { event: "appointment/reminder.scheduled" },
  async ({ event, step }) => {
    const { appointmentId, reminderType, scheduledAt } = event.data as {
      appointmentId: string;
      reminderType: "email" | "sms" | "whatsapp";
      scheduledAt: string;
    };

    await step.sleepUntil("wait-for-reminder-time", scheduledAt);

    return { processed: true, appointmentId, reminderType };
  }
);
