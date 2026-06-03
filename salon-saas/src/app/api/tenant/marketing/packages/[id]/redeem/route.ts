import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { packages, customerPackages } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { createApiHandler, getRouteId } from "@/lib/api-handler";

export const POST = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const id = getRouteId(req);
  const body = await req.json();

  const [cp] = await db.select()
    .from(customerPackages)
    .where(and(
      eq(customerPackages.id, body.customerPackageId),
      eq(customerPackages.packageId, id),
      eq(customerPackages.tenantId, tenantId),
      eq(customerPackages.isActive, true),
      gt(customerPackages.visitsRemaining, 0),
    ))
    .limit(1);

  if (!cp) { const e = new Error("No visits remaining or package inactive") as any; e.code = "INVALID_INPUT"; throw e; }

  const [updated] = await db.update(customerPackages)
    .set({
      visitsUsed: cp.visitsUsed + 1,
      visitsRemaining: cp.visitsRemaining - 1,
    })
    .where(eq(customerPackages.id, cp.id))
    .returning();

  return apiSuccess(updated);
}, { method: "POST", requiredPermission: "marketing:update" });
