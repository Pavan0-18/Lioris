import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers, tenants } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { sendEmail, customerMessageHtml } from "@/lib/emails";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "CRM");

    const body = await req.json();
    const { customerIds, type, subject, message } = body;

    if (!customerIds?.length || !type || !message) {
      return apiError("customerIds, type, and message are required", "VALIDATION_ERROR", 400);
    }

    const [tenant] = await db.select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const list = await db.select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
    })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), inArray(customers.id, customerIds)));

    const results: { customerId: string; sent: boolean; method: string; error?: string }[] = [];

    for (const customer of list) {
      try {
        if (type === "email" && customer.email) {
          const result = await sendEmail({
            to: customer.email,
            subject: subject || "Message from your salon",
            html: customerMessageHtml({
              customerName: customer.name || "there",
              salonName: tenant?.name || "your salon",
              message,
            }),
          });
          results.push({
            customerId: customer.id,
            sent: result.sent,
            method: "email",
            error: result.error,
          });
        } else if (type === "sms" && customer.phone) {
          results.push({
            customerId: customer.id,
            sent: false,
            method: "sms",
            error: "SMS delivery requires a configured messaging provider",
          });
        } else {
          results.push({
            customerId: customer.id,
            sent: false,
            method: type,
            error: `No ${type} contact available`,
          });
        }
      } catch (err: any) {
        results.push({ customerId: customer.id, sent: false, method: type, error: err.message });
      }
    }

    const sent = results.filter((r) => r.sent).length;
    const failed = results.filter((r) => !r.sent).length;

    if (failed > 0) {
      return apiSuccess({ sent, failed, results, note: "Some messages were not delivered. Check the results for details." });
    }
    return apiSuccess({ sent, failed, results });
  } catch {
    return apiError("Send failed", "INTERNAL_ERROR", 500);
  }
}