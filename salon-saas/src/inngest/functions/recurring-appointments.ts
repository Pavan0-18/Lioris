import { inngest } from "../client";
import { db } from "@/lib/db";
import { appointments, customers, appointmentServices, services as servicesTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { addWeeks, addMonths } from "date-fns";

const RECURRENCE_RULES = ["weekly", "biweekly", "monthly"] as const;

function computeNextDate(current: Date, rule: string): Date | null {
  switch (rule) {
    case "weekly":
      return addWeeks(current, 1);
    case "biweekly":
      return addWeeks(current, 2);
    case "monthly":
      return addMonths(current, 1);
    default:
      return null;
  }
}

export const recurringAppointmentFn = inngest.createFunction(
  {
    id: "recurring-appointment-generator",
    name: "Generate Next Recurring Appointment",
    retries: 3,
  },
  { event: "appointment/recurring.generate" },
  async ({ event, step }) => {
    const { appointmentId, tenantId } = event.data as { appointmentId: string; tenantId: string };

    const parent = await step.run("fetch-parent-appointment", async () => {
      const [appt] = await db.select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);
      return appt;
    });

    if (!parent) return { skipped: true, reason: "Parent appointment not found" };
    if (!parent.recurrenceRule) return { skipped: true, reason: "No recurrence rule" };

    const nextStart = computeNextDate(new Date(parent.startTime), parent.recurrenceRule);
    if (!nextStart) return { skipped: true, reason: "Could not compute next date" };

    if (parent.recurrenceEndDate && nextStart > new Date(parent.recurrenceEndDate)) {
      return { skipped: true, reason: "Recurrence end date reached" };
    }

    const duration = new Date(parent.endTime).getTime() - new Date(parent.startTime).getTime();
    const nextEnd = new Date(nextStart.getTime() + duration);

    const existingSeries = await step.run("check-existing-next", async () => {
      const siblings = await db.select()
        .from(appointments)
        .where(and(
          eq(appointments.tenantId, tenantId),
          eq(appointments.recurrenceParentId, parent.recurrenceParentId || parent.id),
          eq(appointments.startTime, nextStart),
        ));
      return siblings.length > 0;
    });

    if (existingSeries) {
      return { skipped: true, reason: "Next occurrence already exists" };
    }

    const nextAppt = await step.run("create-next-occurrence", async () => {
      const [created] = await db.insert(appointments).values({
        tenantId,
        branchId: parent.branchId,
        customerId: parent.customerId,
        staffId: parent.staffId,
        startTime: nextStart,
        endTime: nextEnd,
        status: "scheduled",
        type: parent.type,
        notes: parent.notes,
        createdBy: "recurring-generator",
        recurrenceRule: parent.recurrenceRule,
        recurrenceEndDate: parent.recurrenceEndDate ? new Date(parent.recurrenceEndDate) : null,
        recurrenceParentId: parent.recurrenceParentId || parent.id,
      }).returning();

      const svcs = await db.select()
        .from(appointmentServices)
        .where(eq(appointmentServices.appointmentId, parent.id));

      for (const svc of svcs) {
        await db.insert(appointmentServices).values({
          appointmentId: created.id,
          serviceId: svc.serviceId,
          price: svc.price,
          duration: svc.duration,
        });
      }

      return created;
    });

    await step.run("schedule-next-recurrence", async () => {
      await inngest.send({
        name: "appointment/recurring.generate",
        data: {
          appointmentId: nextAppt.id,
          tenantId,
        },
      });
    });

    return { generated: true, nextAppointmentId: nextAppt.id, nextStart: nextStart.toISOString() };
  },
);
