import { apiSuccess } from "@/lib/utils";
import { db } from "@/lib/db";
import { packages, packageServices } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createApiHandler } from "@/lib/api-handler";

export const GET = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const list = await db.select()
    .from(packages)
    .where(eq(packages.tenantId, tenantId))
    .orderBy(desc(packages.createdAt));

  return apiSuccess(list);
}, { method: "GET", requiredPermission: "marketing:read" });

export const POST = createApiHandler(async (req, context) => {
  const { tenantId } = context.auth;
  const body = await req.json();

  const [inserted] = await db.insert(packages).values({
    tenantId,
    name: body.name,
    description: body.description,
    price: body.price,
    totalVisits: body.totalVisits,
    validityDays: body.validityDays,
    isRecurring: body.isRecurring || false,
    recurringPrice: body.recurringPrice,
    recurringInterval: body.recurringInterval,
  }).returning();

  if (body.services?.length) {
    await db.insert(packageServices).values(
      body.services.map((s: any) => ({
        packageId: inserted.id,
        serviceId: s.serviceId,
        includedVisits: s.includedVisits || 1,
      }))
    );
  }

  return apiSuccess({ id: inserted.id });
}, { method: "POST", requiredPermission: "marketing:create" });
