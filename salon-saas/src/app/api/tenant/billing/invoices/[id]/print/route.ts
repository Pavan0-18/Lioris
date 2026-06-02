import { getTenantFromSession } from "@/lib/tenant-context";
import { requireFeature } from "@/lib/feature-gate";
import { apiError, apiErrorFromException } from "@/lib/utils/response";
import { db } from "@/lib/db";
import { invoices, invoiceItems, customers, payments, tenants } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantFromSession();
    await requireFeature(tenantId, "BILLING");
    const { id } = await params;

    const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
    if (!inv) return apiError("Invoice not found", "NOT_FOUND", 404);

    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    const [customer] = await db.select().from(customers).where(eq(customers.id, inv.customerId));
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const pmts = await db.select().from(payments).where(eq(payments.invoiceId, id));

    const html = buildPrintHtml(inv, items, customer, tenant!, pmts);

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err: any) {
    return apiErrorFromException(err);
  }
}

function buildPrintHtml(inv: any, items: any[], customer: any, tenant: any, pmts: any[]): string {
  const date = new Date(inv.createdAt).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });

  const pmtRows = pmts.map(p => `
    <tr>
      <td>${p.method.toUpperCase()}</td>
      <td>${new Date(p.paidAt).toLocaleDateString()}</td>
      <td style="text-align:right">${inv.currency} ${p.amount.toFixed(2)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${inv.invoiceNo}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #222; margin: 0; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 24px; }
  .header .meta { text-align: right; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th { background: #f5f5f5; text-align: left; padding: 8px 6px; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 6px; border-bottom: 1px solid #ddd; }
  .totals { margin-left: auto; width: 300px; }
  .totals td { padding: 4px 6px; border: none; }
  .totals .grand { font-size: 16px; font-weight: bold; }
  .footer { margin-top: 30px; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="header">
  <div>
    <h1>${tenant.name}</h1>
    ${tenant.taxId ? `<p>${tenant.taxLabel}: ${tenant.taxId}</p>` : ""}
    <p>${tenant.phone || ""} | ${tenant.email || ""}</p>
  </div>
  <div class="meta">
    <h2>Invoice</h2>
    <p><strong>${inv.invoiceNo}</strong></p>
    <p>${date}</p>
    <p>Status: <strong>${inv.status.toUpperCase()}</strong></p>
  </div>
</div>
<div style="margin-bottom: 20px;">
  <p><strong>Bill To:</strong> ${customer.name}</p>
  <p>${customer.phone}${customer.email ? " | " + customer.email : ""}</p>
</div>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Tax</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>
    ${items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${inv.currency} ${i.price.toFixed(2)}</td><td>${i.taxRate}%</td><td style="text-align:right">${inv.currency} ${i.lineTotal.toFixed(2)}</td></tr>`).join("")}
  </tbody>
</table>
<table class="totals">
  <tr><td>Subtotal</td><td style="text-align:right">${inv.currency} ${inv.subtotal.toFixed(2)}</td></tr>
  <tr><td>${tenant.taxLabel} (${tenant.taxRate}%)</td><td style="text-align:right">${inv.currency} ${inv.taxAmount.toFixed(2)}</td></tr>
  ${inv.discountAmount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-${inv.currency} ${inv.discountAmount.toFixed(2)}</td></tr>` : ""}
  <tr class="grand"><td>Total</td><td style="text-align:right">${inv.currency} ${inv.total.toFixed(2)}</td></tr>
</table>
${pmts.length > 0 ? `<h3>Payments</h3><table><thead><tr><th>Method</th><th>Date</th><th style="text-align:right">Amount</th></tr></thead><tbody>${pmtRows}</tbody></table>` : ""}
<div class="footer">${tenant.invoiceFooter || "Thank you for your business!"}</div>
</body></html>`;
}
