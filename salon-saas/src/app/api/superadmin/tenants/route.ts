import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { db } from "@/lib/db";
import { tenants, users, features, tenantFeatures } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateSlug } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const list = await db.select().from(tenants);
    return apiSuccess(list);
  } catch (err: any) {
    return apiError("Internal error", "INTERNAL_ERROR", 500);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const { salonName, ownerName, email, password, phone, country } = body;

    if (!salonName || !ownerName || !email || !password) {
      return apiError("Missing required fields", "VALIDATION_ERROR", 400);
    }

    const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.email, email));
    if (existing.length > 0) return apiError("Email already registered", "VALIDATION_ERROR", 409);

    const slug = generateSlug(salonName);

    const [tenant] = await db.insert(tenants).values({
      name: salonName,
      slug,
      email,
      phone: phone || null,
      country: country ?? "IN",
      currency: country === "US" ? "USD" : country === "GB" ? "GBP" : "INR",
      planStatus: "active",
    }).returning();

    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(users).values({
      tenantId: tenant.id,
      email,
      name: ownerName,
      phone: phone || null,
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

    await createAuditLog({
      tenantId: tenant.id,
      userId: session.user.id,
      action: "create_tenant",
      entityType: "tenant",
      entityId: tenant.id,
      changes: { salonName, ownerName, email },
    });

    return apiSuccess(tenant, 201);
  } catch (err: any) {
    console.error("[superadmin-create-tenant]", err);
    return apiError("Failed to create tenant", "INTERNAL_ERROR", 500);
  }
}
