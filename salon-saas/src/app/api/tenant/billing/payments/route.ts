import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { payments, invoices } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoiceId");
    const query = invoiceId
      ? and(eq(payments.tenantId, tenantId), eq(payments.invoiceId, invoiceId))
      : eq(payments.tenantId, tenantId);

    const list = await db.select().from(payments).where(query).orderBy(payments.paidAt);
    return apiSuccess(list);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, userId } = await getTenantFromSession();
    const body = await req.json();
    const { invoiceId, method, notes } = body;
    const amount = Number(body.amount);
    if (!invoiceId || isNaN(amount) || !method) return apiError("invoiceId, amount, and method are required", "VALIDATION_ERROR", 400);

    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));
    if (!inv) return apiError("Invoice not found", "NOT_FOUND", 404);

    const [pmt] = await db.insert(payments).values({ tenantId, invoiceId, amount, method, notes: notes || null }).returning();
    return apiSuccess(pmt, 201);
  } catch (err: any) {
    console.error(err);
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
