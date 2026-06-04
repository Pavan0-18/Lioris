import { db } from "@/lib/db";
import { customers, invoices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const POINTS_PER_UNIT = 100;
export const POINT_VALUE = 1;
export const MAX_REDEEM_PCT = 0.20;

export function calculatePointsEarned(invoiceTotal: number): number {
  return Math.floor(invoiceTotal / POINTS_PER_UNIT);
}

export function calculateMaxRedeemable(
  customerPoints: number,
  invoiceTotal: number,
): { maxPoints: number; maxValue: number } {
  const maxByPct = Math.floor(invoiceTotal * MAX_REDEEM_PCT);
  const maxPoints = Math.min(customerPoints, maxByPct);
  const maxValue = maxPoints * POINT_VALUE;
  return { maxPoints, maxValue };
}

export async function awardLoyaltyPoints(
  customerId: string,
  invoiceTotal: number,
): Promise<{ pointsAwarded: number; newBalance: number }> {
  const pointsEarned = calculatePointsEarned(invoiceTotal);
  if (pointsEarned === 0) return { pointsAwarded: 0, newBalance: 0 };

  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
  });
  if (!customer) return { pointsAwarded: 0, newBalance: 0 };

  const newBalance = (customer.loyaltyPoints || 0) + pointsEarned;
  await db.update(customers)
    .set({ loyaltyPoints: newBalance, updatedAt: new Date() })
    .where(eq(customers.id, customerId));

  return { pointsAwarded: pointsEarned, newBalance };
}

export async function redeemLoyaltyPoints(
  customerId: string,
  invoiceId: string,
  pointsToRedeem: number,
  tenantId: string,
): Promise<{ discountApplied: number; remainingPoints: number }> {
  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)),
  });
  if (!customer) throw new Error("Customer not found");
  if ((customer.loyaltyPoints || 0) < pointsToRedeem) {
    throw new Error("Insufficient loyalty points");
  }

  const [invoice] = await db.select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
    .limit(1);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "paid" || invoice.status === "void") {
    throw new Error("Cannot redeem points on a paid or voided invoice");
  }

  const { maxPoints } = calculateMaxRedeemable(customer.loyaltyPoints || 0, invoice.total);
  const actualRedeem = Math.min(pointsToRedeem, maxPoints);
  const discountValue = actualRedeem * POINT_VALUE;

  const remainingPoints = (customer.loyaltyPoints || 0) - actualRedeem;
  await db.update(customers)
    .set({ loyaltyPoints: remainingPoints })
    .where(eq(customers.id, customerId));

  const newDiscount = (invoice.discountAmount || 0) + discountValue;
  const newTotal = Math.max(0, invoice.subtotal + invoice.taxAmount - newDiscount);
  await db.update(invoices)
    .set({ discountAmount: newDiscount, total: newTotal })
    .where(eq(invoices.id, invoiceId));

  return { discountApplied: discountValue, remainingPoints };
}
