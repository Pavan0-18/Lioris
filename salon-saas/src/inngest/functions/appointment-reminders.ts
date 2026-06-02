import { inngest } from "../client";
import { db } from "@/lib/db";
import { appointments, customers, appointmentReminders, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { formatInTimezone } from "@/lib/utils";

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

    const [appt] = await db
      .select({
        id: appointments.id,
        startTime: appointments.startTime,
        status: appointments.status,
        tenantId: appointments.tenantId,
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appt || appt.status === "cancelled" || appt.status === "no_show" || appt.status === "completed") {
      await db.update(appointmentReminders)
        .set({ status: "cancelled" })
        .where(and(eq(appointmentReminders.appointmentId, appointmentId), eq(appointmentReminders.status, "pending")));
      return { skipped: true, reason: "Appointment no longer active" };
    }

    const [tenant] = await db
      .select({ name: tenants.name, timezone: tenants.timezone })
      .from(tenants)
      .where(eq(tenants.id, appt.tenantId))
      .limit(1);

    const [customer] = await db
      .select({ name: customers.name, phone: customers.phone, email: customers.email })
      .from(customers)
      .innerJoin(appointments, eq(customers.id, appointments.customerId))
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    const formattedTime = formatInTimezone(
      appt.startTime,
      tenant?.timezone || "Asia/Kolkata",
      "EEEE, MMM do 'at' h:mm a"
    );

    const subject = `Reminder: Your appointment is coming up!`;
    const body = `Hi ${customer?.name || "Valued Customer"},\n\nThis is a reminder about your appointment on ${formattedTime} at ${tenant?.name || "our salon"}.\n\nWe look forward to seeing you!`;

    if (reminderType === "email" && customer?.email) {
      console.log(`[REMINDER EMAIL] To: ${customer.email} | Subject: ${subject} | Body: ${body}`);
    } else {
      console.log(`[REMINDER ${reminderType.toUpperCase()}] To: ${customer?.phone} | Message: ${body}`);
    }

    await db.update(appointmentReminders)
      .set({ status: "sent", sentAt: new Date() })
      .where(and(eq(appointmentReminders.appointmentId, appointmentId), eq(appointmentReminders.type, reminderType), eq(appointmentReminders.status, "pending")));

    return { processed: true, appointmentId, reminderType };
  }
);
