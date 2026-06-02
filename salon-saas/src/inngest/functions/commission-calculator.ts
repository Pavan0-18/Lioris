import { inngest } from "../client";
import { db } from "@/lib/db";
import { invoices, invoiceItems, appointments, staff, staffServices, commissions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const commissionCalculatorFn = inngest.createFunction(
  {
    id: "commission-calculator",
    name: "Calculate Commissions After Invoice Paid",
    retries: 3,
  },
  { event: "invoice/paid" },
  async ({ event }) => {
    const { invoiceId, tenantId } = event.data as { invoiceId: string; tenantId: string };

    const [inv] = await db.select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);
    if (!inv) return { processed: false, reason: "Invoice not found" };
    if (!inv.appointmentId) return { processed: true, reason: "No appointment linked" };

    const [appt] = await db.select()
      .from(appointments)
      .where(eq(appointments.id, inv.appointmentId))
      .limit(1);
    if (!appt || !appt.staffId) return { processed: true, reason: "No staff assigned" };

    const items = await db.select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    for (const item of items) {
      if (!item.serviceId) continue;

      const [rate] = await db.select()
        .from(staffServices)
        .where(and(
          eq(staffServices.staffId, appt.staffId),
          eq(staffServices.serviceId, item.serviceId),
        ))
        .limit(1);

      if (!rate) continue;

      const amount = item.lineTotal * (rate.commissionPct / 100);

      await db.insert(commissions).values({
        staffId: appt.staffId,
        invoiceId,
        serviceId: item.serviceId,
        amount,
        percentage: rate.commissionPct,
      });
    }

    return { processed: true, invoiceId };
  }
);
