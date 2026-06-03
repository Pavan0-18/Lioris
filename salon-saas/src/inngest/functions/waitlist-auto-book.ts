import { inngest } from "../client";
import { db } from "@/lib/db";
import { waitlist, appointments, customers, appointmentServices, services as servicesTable } from "@/lib/db/schema";
import { and, eq, inArray, gte, lte, ne } from "drizzle-orm";
import { addMinutes } from "date-fns";

export const waitlistAutoBookFn = inngest.createFunction(
  {
    id: "waitlist-auto-book",
    name: "Auto-book from Waitlist on Cancellation",
    retries: 2,
  },
  { event: "appointment/cancelled" },
  async ({ event, step }) => {
    const { appointmentId, tenantId } = event.data as { appointmentId: string; tenantId: string };

    const cancelled = await step.run("fetch-cancelled-appointment", async () => {
      const [appt] = await db.select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);
      return appt;
    });

    if (!cancelled) return { skipped: true, reason: "Appointment not found" };

    const matchingWaitlist = await step.run("find-matching-waitlist", async () => {
      const branchId = cancelled.branchId;
      const startTime = new Date(cancelled.startTime);
      const endTime = new Date(cancelled.endTime);
      const durationMins = (endTime.getTime() - startTime.getTime()) / 60000;
      const slotStart = new Date(startTime.getTime() - durationMins * 60000);
      const slotEnd = new Date(endTime.getTime() + durationMins * 60000);

      const cancelledServiceIds = await db.select({ serviceId: appointmentServices.serviceId })
        .from(appointmentServices)
        .where(eq(appointmentServices.appointmentId, appointmentId));

      const cancelledIds = cancelledServiceIds.map((s) => s.serviceId);

      const entries = await db.select()
        .from(waitlist)
        .where(and(
          eq(waitlist.tenantId, tenantId),
          eq(waitlist.branchId, branchId),
          eq(waitlist.status, "pending"),
          cancelled.staffId ? eq(waitlist.preferredStaffId, cancelled.staffId) : undefined,
        ));

      return entries.filter((entry) => {
        const hasAllServices = cancelledIds.every((sid) => entry.serviceIds.includes(sid));
        if (!hasAllServices) return false;
        if (entry.preferredDate) {
          const prefDate = new Date(entry.preferredDate);
          return Math.abs(prefDate.getTime() - new Date(startTime).getTime()) < 86400000;
        }
        return true;
      }).slice(0, 1);
    });

    if (matchingWaitlist.length === 0) {
      return { skipped: true, reason: "No matching waitlist entries" };
    }

    const entry = matchingWaitlist[0];

    await step.run("create-auto-booking", async () => {
      let customerId = entry.customerId;

      if (!customerId) {
        const [existing] = await db.select()
          .from(customers)
          .where(and(eq(customers.tenantId, tenantId), eq(customers.phone, entry.customerPhone)))
          .limit(1);

        if (existing) {
          customerId = existing.id;
        } else {
          const [created] = await db.insert(customers).values({
            tenantId,
            name: entry.customerName,
            phone: entry.customerPhone,
          }).returning();
          customerId = created.id;
        }
      }

      const totalDuration = new Date(cancelled.endTime).getTime() - new Date(cancelled.startTime).getTime();

      const [newAppt] = await db.insert(appointments).values({
        tenantId,
        branchId: entry.branchId,
        customerId: customerId!,
        staffId: cancelled.staffId || entry.preferredStaffId,
        startTime: new Date(cancelled.startTime),
        endTime: new Date(cancelled.endTime),
        status: "scheduled",
        type: "booking",
        notes: entry.notes ? `Auto-booked from waitlist. ${entry.notes}` : "Auto-booked from waitlist",
        createdBy: "waitlist-auto-book",
      }).returning();

      const allServices = await db.select()
        .from(servicesTable)
        .where(inArray(servicesTable.id, entry.serviceIds));

      for (const svc of allServices) {
        await db.insert(appointmentServices).values({
          appointmentId: newAppt.id,
          serviceId: svc.id,
          price: svc.price || 0,
          duration: svc.duration || 30,
        });
      }

      await db.update(waitlist)
        .set({ status: "booked", updatedAt: new Date() })
        .where(eq(waitlist.id, entry.id));
    });

    return { booked: true, waitlistId: entry.id };
  },
);
