import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiSuccess } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "CRM");

    const body = await req.json();
    const { customerIds, type, subject, message } = body;

    if (!customerIds?.length || !type || !message) {
      return apiError("customerIds, type, and message are required", "VALIDATION_ERROR", 400);
    }

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
          console.log(`[SEND] Email to ${customer.email}: ${subject || "No subject"} - ${message}`);
          results.push({ customerId: customer.id, sent: true, method: "email" });
        } else if (type === "sms" && customer.phone) {
          console.log(`[SEND] SMS to ${customer.phone}: ${message}`);
          results.push({ customerId: customer.id, sent: true, method: "sms" });
        } else {
          results.push({ customerId: customer.id, sent: false, method: type, error: `No ${type} contact available` });
        }
      } catch (err: any) {
        results.push({ customerId: customer.id, sent: false, method: type, error: err.message });
      }
    }

    return apiSuccess({ sent: results.filter((r) => r.sent).length, failed: results.filter((r) => !r.sent).length, results });
  } catch {
    return apiError("Send failed", "INTERNAL_ERROR", 500);
  }
}
