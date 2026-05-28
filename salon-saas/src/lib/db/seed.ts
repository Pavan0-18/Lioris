import * as dotenv from "dotenv";
import { eq, and } from "drizzle-orm";
import * as bcrypt from "bcryptjs";

dotenv.config({ path: ".env.local" });

import { db } from "./index";
import { features, plans, planFeatures, superAdmins } from "./schema";

async function main() {
  try {
    console.log("🌱 Seeding features...");

    const featureData = [
      { key: "MULTI_BRANCH", name: "Multiple Branches", category: "core" as const },
      { key: "BASIC_REPORTS", name: "Basic Reports", category: "core" as const },
      { key: "APPOINTMENTS", name: "Appointment Booking", category: "add-on" as const },
      { key: "STAFF_MGMT", name: "Staff Management", category: "add-on" as const },
      { key: "ATTENDANCE", name: "Attendance Tracking", category: "add-on" as const },
      { key: "PAYROLL", name: "Payroll & Commission", category: "add-on" as const },
      { key: "CRM", name: "Customer CRM", category: "add-on" as const },
      { key: "LOYALTY", name: "Loyalty Points", category: "add-on" as const },
      { key: "BILLING", name: "Billing & POS", category: "add-on" as const },
      { key: "INVENTORY", name: "Inventory Management", category: "add-on" as const },
      { key: "NOTIFICATIONS_EMAIL", name: "Email Notifications", category: "add-on" as const },
      { key: "NOTIFICATIONS_SMS", name: "SMS Notifications", category: "add-on" as const },
      { key: "NOTIFICATIONS_WA", name: "WhatsApp Notifications", category: "add-on" as const },
      { key: "ANALYTICS_ADV", name: "Advanced Analytics", category: "premium" as const },
      { key: "AI_BOOKING", name: "AI Booking Assistant", category: "premium" as const },
      { key: "MARKETPLACE", name: "Marketplace Listing", category: "premium" as const },
    ];

    const featureMap: Record<string, string> = {};

    for (const f of featureData) {
      const [existing] = await db.select().from(features).where(eq(features.key, f.key)).limit(1);
      if (existing) {
        featureMap[f.key] = existing.id;
      } else {
        const [inserted] = await db.insert(features).values(f).returning();
        featureMap[f.key] = inserted.id;
      }
    }

    console.log("✅ 16 features seeded");
    console.log("🌱 Seeding plans...");

    const planData = [
      { name: "Starter", basePrice: 0, trialDays: 14, isPublic: true, features: ["MULTI_BRANCH", "BASIC_REPORTS"], limits: { MULTI_BRANCH: { limit: 1, limitKey: "branches" } } },
      { name: "Growth", basePrice: 29, trialDays: 14, isPublic: true, features: ["MULTI_BRANCH", "BASIC_REPORTS", "APPOINTMENTS", "CRM", "BILLING", "STAFF_MGMT", "ATTENDANCE", "NOTIFICATIONS_EMAIL"], limits: { MULTI_BRANCH: { limit: 3, limitKey: "branches" }, STAFF_MGMT: { limit: 15, limitKey: "staff_count" } } },
      { name: "Pro", basePrice: 79, trialDays: 14, isPublic: true, features: ["MULTI_BRANCH", "BASIC_REPORTS", "APPOINTMENTS", "STAFF_MGMT", "ATTENDANCE", "PAYROLL", "CRM", "LOYALTY", "BILLING", "INVENTORY", "NOTIFICATIONS_EMAIL", "NOTIFICATIONS_SMS", "NOTIFICATIONS_WA"], limits: {} },
      { name: "Enterprise", basePrice: 199, trialDays: 30, isPublic: false, features: ["MULTI_BRANCH", "BASIC_REPORTS", "APPOINTMENTS", "STAFF_MGMT", "ATTENDANCE", "PAYROLL", "CRM", "LOYALTY", "BILLING", "INVENTORY", "NOTIFICATIONS_EMAIL", "NOTIFICATIONS_SMS", "NOTIFICATIONS_WA", "ANALYTICS_ADV", "AI_BOOKING", "MARKETPLACE"], limits: {} }
    ];

    for (const p of planData) {
      let planId = "";
      const [existing] = await db.select().from(plans).where(eq(plans.name, p.name)).limit(1);

      if (existing) {
        planId = existing.id;
      } else {
        const [inserted] = await db.insert(plans).values({
          name: p.name,
          basePrice: p.basePrice,
          trialDays: p.trialDays,
          isPublic: p.isPublic,
          currency: "USD",
          billingCycle: "monthly"
        }).returning();
        planId = inserted.id;
      }

      // Associate features
      for (const fKey of p.features) {
        const featureId = featureMap[fKey];
        if (!featureId) continue;

        const [link] = await db.select()
          .from(planFeatures)
          .where(and(eq(planFeatures.planId, planId), eq(planFeatures.featureId, featureId)))
          .limit(1);

        if (!link) {
          const limitInfo = (p.limits as any)[fKey] || null;
          await db.insert(planFeatures).values({
            planId,
            featureId,
            limit: limitInfo ? limitInfo.limit : null,
            limitKey: limitInfo ? limitInfo.limitKey : null
          });
        }
      }
    }

    console.log("✅ 4 plans seeded with features");
    console.log("🌱 Seeding super admin...");

    const saEmail = process.env.SUPER_ADMIN_EMAIL || "admin@yourdomain.com";
    const saPassword = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123456";
    const passwordHash = await bcrypt.hash(saPassword, 12);

    const [adminExists] = await db.select().from(superAdmins).where(eq(superAdmins.email, saEmail)).limit(1);
    if (!adminExists) {
      await db.insert(superAdmins).values({
        email: saEmail,
        passwordHash,
        name: "Super Administrator"
      });
    }

    console.log(`✅ Super admin created: ${saEmail}`);
    console.log("🎉 Database seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

main();
