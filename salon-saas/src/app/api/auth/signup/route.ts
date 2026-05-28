import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { tenants, users, tenantFeatures, features, plans, systemConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSlug, apiError, apiSuccess } from "@/lib/utils";
import { inngest } from "@/inngest/client";
import { addDays } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { salonName, name: ownerName, email, password, phone, country } = body;

    if (!salonName || !ownerName || !email || !password || password.length < 8) {
      return apiError("Invalid input. Password must be at least 8 characters.", "VALIDATION_ERROR", 400);
    }

    const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.email, email));
    if (existing.length > 0) return apiError("Email already registered", "VALIDATION_ERROR", 409);

    const [cfg] = await db.select().from(systemConfig).limit(1);
    const defaultTrialDays = cfg?.defaultTrialDays ?? 14;
    const defaultCountry = cfg?.defaultCountry ?? "IN";
    const defaultCurrency = cfg?.defaultCurrency ?? "INR";
    const defaultPlanId = cfg?.defaultPlanId ?? null;

    let planId = defaultPlanId;
    if (!planId) {
      const [starterPlan] = await db.select().from(plans).where(eq(plans.name, "Starter"));
      planId = starterPlan?.id ?? null;
    }

    const slug = generateSlug(salonName);
    const trialEndsAt = addDays(new Date(), defaultTrialDays);

    const [tenant] = await db.insert(tenants).values({
      name: salonName,
      slug,
      email,
      phone,
      country: country ?? defaultCountry,
      currency: country === "US" ? "USD" : country === "GB" ? "GBP" : defaultCurrency,
      planId: planId,
      planStatus: "trialing",
      trialEndsAt,
    }).returning();

    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(users).values({
      tenantId: tenant.id,
      email,
      name: ownerName,
      phone,
      passwordHash,
      role: "OWNER",
    });

    const coreFeatures = await db.select().from(features).where(eq(features.category, "core"));
    for (const f of coreFeatures) {
      await db.insert(tenantFeatures).values({
        tenantId: tenant.id,
        featureId: f.id,
        isEnabled: true,
      }).onConflictDoNothing();
    }

    if (planId) {
      const { planFeatures } = await import("@/lib/db/schema");
      const pf = await db.select().from(planFeatures).where(eq(planFeatures.planId, planId));
      for (const row of pf) {
        await db.insert(tenantFeatures).values({
          tenantId: tenant.id,
          featureId: row.featureId,
          isEnabled: true,
          limit: row.limit,
        }).onConflictDoNothing();
      }
    }

    await inngest.send({ name: "tenant/created", data: { tenantId: tenant.id, email, salonName, trialDays: defaultTrialDays } });

    return apiSuccess({ tenantId: tenant.id }, 201);
  } catch (err: any) {
    console.error("[signup]", err);
    return apiError("Signup failed", "INTERNAL_ERROR", 500);
  }
}
