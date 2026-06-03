import { getTenantFromSession } from "@/lib/tenant-context";
import { apiRateLimit } from "@/lib/rate-limit";
import { apiError, apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { tenantId } = await getTenantFromSession();
    const [tenant] = await db.select({
      name: tenants.name,
      phone: tenants.phone,
      logoUrl: tenants.logoUrl,
      invoiceFooter: tenants.invoiceFooter,
      taxLabel: tenants.taxLabel,
      taxRate: tenants.taxRate,
      taxId: tenants.taxId,
      cancelPolicy: tenants.cancelPolicy,
      theme: tenants.theme,
      isDark: tenants.isDark,
      locale: tenants.locale,
      timezone: tenants.timezone,
      currency: tenants.currency,
    }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) return apiError("Tenant not found", "NOT_FOUND", 404);
    return apiSuccess(tenant);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const { tenantId } = await getTenantFromSession();
    const { success } = await apiRateLimit.limit(tenantId);
    if (!success) return apiError("Too many requests", "RATE_LIMITED", 429);

    const body = await req.json();
    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
    if (body.invoiceFooter !== undefined) updateData.invoiceFooter = body.invoiceFooter;
    if (body.taxLabel !== undefined) updateData.taxLabel = body.taxLabel;
    if (body.taxRate !== undefined) updateData.taxRate = body.taxRate;
    if (body.taxId !== undefined) updateData.taxId = body.taxId;
    if (body.cancelPolicy !== undefined) updateData.cancelPolicy = body.cancelPolicy;
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.isDark !== undefined) updateData.isDark = body.isDark;
    if (body.locale !== undefined) updateData.locale = body.locale;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.currency !== undefined) updateData.currency = body.currency;

    await db.update(tenants)
      .set(updateData)
      .where(eq(tenants.id, tenantId));

    return apiSuccess({ success: true });
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}
