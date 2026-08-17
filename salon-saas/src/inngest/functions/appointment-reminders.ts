import { inngest } from "../client";
import { db } from "@/lib/db";
import { appointments, customers, appointmentReminders, appointmentServices, services, tenants, staff, users } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { formatInTimezone } from "@/lib/utils";
import { sendEmail, appointmentReminderHtml } from "@/lib/emails";

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
        staffId: appointments.staffId,
        checkInCode: appointments.checkInCode,
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

    const [staffRow] = appt.staffId
      ? await db.select({ name: users.name })
          .from(staff)
          .innerJoin(users, eq(staff.userId, users.id))
          .where(eq(staff.id, appt.staffId))
          .limit(1)
      : [undefined];

    const svcRows = await db
      .select({ name: services.name })
      .from(appointmentServices)
      .innerJoin(services, eq(appointmentServices.serviceId, services.id))
      .where(eq(appointmentServices.appointmentId, appointmentId));

    const formattedTime = formatInTimezone(
      appt.startTime,
      tenant?.timezone || "Asia/Kolkata",
      "EEEE, MMM do 'at' h:mm a"
    );

    let delivery: "email" | "sms" | "whatsapp" = reminderType;
    let sent = false;
    let error: string | undefined;

    if (reminderType === "email") {
      if (customer?.email) {
        const result = await sendEmail({
          to: customer.email,
          subject: `Reminder: Your appointment at ${tenant?.name || "our salon"}`,
          html: appointmentReminderHtml({
            customerName: customer.name || "Valued Customer",
            salonName: tenant?.name || "our salon",
            dateTime: formattedTime,
            services: svcRows.map((s) => s.name),
            staffName: staffRow?.name,
            checkInCode: appt.checkInCode,
          }),
        });
        sent = result.sent;
        error = result.error;
      } else {
        error = "No email on file";
      }
    } else {
      error = `${reminderType.toUpperCase()} delivery requires a configured messaging provider`;
    }

    await db.update(appointmentReminders)
      .set({
        status: sent ? "sent" : "failed",
        sentAt: sent ? new Date() : null,
      })
      .where(and(eq(appointmentReminders.appointmentId, appointmentId), eq(appointmentReminders.type, reminderType), eq(appointmentReminders.status, "pending")));

    if (!sent) {
      console.warn(`[REMINDER ${reminderType.toUpperCase()} FAILED] appointment=${appointmentId}, reason=${error}`);
      return { processed: false, appointmentId, reminderType, error };
    }

    return { processed: true, appointmentId, reminderType, sentTo: customer?.email || customer?.phone };
  }
);
