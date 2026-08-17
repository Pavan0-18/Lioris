import { inngest } from "../client";
import { db } from "@/lib/db";
import { customers, appointments, notifications, users } from "@/lib/db/schema";
import { eq, and, lte, notInArray, desc, sql } from "drizzle-orm";
import { resend, FROM_EMAIL } from "@/lib/resend";

export const inactiveCustomerWinBackFn = inngest.createFunction(
  {
    id: "inactive-customer-winback",
    name: "Win-Back Inactive Customers - Weekly Cron",
    retries: 2,
  },
  { cron: "0 9 * * 1" }, // Runs every Monday at 9:00 AM
  async ({ step }) => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Step 1: Find active customers who have recent appointments within the last 60 days
    const recentAppts = await step.run("fetch-recent-appointments", async () => {
      return db
        .select({ customerId: appointments.customerId })
        .from(appointments)
        .where(
          and(
            eq(appointments.status, "completed"),
            sql`${appointments.startTime} >= ${sixtyDaysAgo}`
          )
        );
    });

    const activeCustomerIds = [...new Set(recentAppts.map((a) => a.customerId))];

    // Step 2: Fetch inactive customers (no completed appointments in last 60 days)
    const inactiveCustomers = await step.run("fetch-inactive-customers", async () => {
      const conditions = [eq(customers.isActive, true)];
      if (activeCustomerIds.length > 0) {
        conditions.push(notInArray(customers.id, activeCustomerIds));
      }
      return db
        .select({
          id: customers.id,
          tenantId: customers.tenantId,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
        })
        .from(customers)
        .where(and(...conditions))
        .limit(100);
    });

    if (inactiveCustomers.length === 0) {
      return { processed: 0, message: "No inactive customers found" };
    }

    // Step 3: Group by tenant and process win-back outreach
    const tenantMap = new Map<string, typeof inactiveCustomers>();
    for (const c of inactiveCustomers) {
      const list = tenantMap.get(c.tenantId) || [];
      list.push(c);
      tenantMap.set(c.tenantId, list);
    }

    let totalAlerts = 0;

    for (const [tenantId, customerList] of tenantMap.entries()) {
      await step.run(`winback-tenant-${tenantId.slice(0, 8)}`, async () => {
        const tenantAdmins = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));

        // Create internal notifications for staff about inactive customer opportunities
        for (const admin of tenantAdmins) {
          await db.insert(notifications).values({
            tenantId,
            userId: admin.id,
            type: "info",
            title: `Win-Back Alert: ${customerList.length} inactive customers`,
            message: `${customerList.length} customers haven't visited in over 60 days. Consider sending special discount coupons!`,
            link: "/customers?filter=inactive",
            metadata: JSON.stringify({ count: customerList.length }),
          });
          totalAlerts++;
        }

        // Try sending win-back emails via Resend if email & resend configured
        for (const customer of customerList) {
          if (customer.email && resend) {
            try {
              await resend.emails.send({
                from: FROM_EMAIL,
                to: customer.email,
                subject: `We miss you at the Salon, ${customer.name}! Here's a special offer`,
                html: `
                  <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>Hi ${customer.name},</h2>
                    <p>It's been a while since your last visit! We'd love to see you back.</p>
                    <p>Book your next appointment this week to enjoy an exclusive salon treatment experience.</p>
                    <br/>
                    <p>Best regards,<br/>Your Salon Team</p>
                  </div>
                `,
              });
            } catch (emailErr) {
              console.error(`Failed to send winback email to ${customer.email}:`, emailErr);
            }
          }
        }
      });
    }

    return { processed: inactiveCustomers.length, alertsCreated: totalAlerts };
  }
);
